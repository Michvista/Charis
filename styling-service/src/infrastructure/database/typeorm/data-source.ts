// TypeORM data source

import "reflect-metadata";
import dns from "node:dns/promises";
import { DataSource } from "typeorm";
import { OccasionOrmEntity } from "./entities/occasion.orm-entity";
import { OutfitOrmEntity } from "./entities/outfit.orm-entity";
import { OutfitItemOrmEntity } from "./entities/outfit-item.orm-entity";

const rawDatabaseUrl = process.env.DATABASE_URL;
const schemaName = process.env.DATABASE_SCHEMA || "styling_service";

const isNeonOrProd =
  rawDatabaseUrl?.includes("neon.tech") ||
  process.env.NODE_ENV === "production";

const sslOption = isNeonOrProd ? { rejectUnauthorized: false } : false;

/**
 * Resolve the DATABASE_URL hostname to an IPv4 address so pg never
 * attempts IPv6 connections (which always fail inside Docker on this host).
 */
async function resolveToIPv4Url(connectionUrl: string): Promise<string> {
  try {
    const url = new URL(connectionUrl);
    const hostname = url.hostname;
    const addresses = await dns.resolve4(hostname);
    if (addresses.length > 0) {
      url.hostname = addresses[0];
      const resolved = url.toString();
      console.log(`[data-source] Resolved ${hostname} → ${addresses[0]}`);
      return resolved;
    }
  } catch (err) {
    console.warn("[data-source] IPv4 resolution failed, using original URL:", err);
  }
  return connectionUrl;
}

export async function ensureStylingSchema(connectionUrl: string): Promise<void> {
  if (!connectionUrl || !schemaName) return;

  try {
    const { Client } = require("pg");
    const client = new Client({
      connectionString: connectionUrl,
      ssl: sslOption,
      connectionTimeoutMillis: 20000,
    });
    await client.connect();
    await client.query(
      `CREATE SCHEMA IF NOT EXISTS "${schemaName.replace(/"/g, '""')}"`
    );
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await client.end();
  } catch (err) {
    console.warn("ensureStylingSchema non-fatal warning:", err);
  }
}

// AppDataSource is initialized lazily in server.ts after IPv4 resolution
let _dataSource: DataSource | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (_dataSource && _dataSource.isInitialized) return _dataSource;

  if (!rawDatabaseUrl) throw new Error("DATABASE_URL is not set");

  const resolvedUrl = await resolveToIPv4Url(rawDatabaseUrl);

  _dataSource = new DataSource({
    type: "postgres",
    url: resolvedUrl,
    schema: schemaName,
    ssl: sslOption,
    extra: {
      connectionTimeoutMillis: 20000,
    },
    synchronize: true,
    logging: process.env.NODE_ENV === "development",
    entities: [OccasionOrmEntity, OutfitOrmEntity, OutfitItemOrmEntity],
  });

  await ensureStylingSchema(resolvedUrl);
  await _dataSource.initialize();
  return _dataSource;
}

// Kept for backward compat — will be replaced after first getDataSource() call
export let AppDataSource: DataSource = new DataSource({
  type: "postgres",
  url: rawDatabaseUrl,
  schema: schemaName,
  ssl: sslOption,
  synchronize: false,
  entities: [OccasionOrmEntity, OutfitOrmEntity, OutfitItemOrmEntity],
});