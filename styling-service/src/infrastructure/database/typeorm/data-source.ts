
import path from "node:path";
import dotenv from "dotenv";
import dns from "node:dns";
import net from "node:net";
import { DataSource } from "typeorm";
import { OccasionOrmEntity } from "./entities/occasion.orm-entity";
import { OutfitOrmEntity } from "./entities/outfit.orm-entity";
import { OutfitItemOrmEntity } from "./entities/outfit-item.orm-entity";

// Load .env from local directory and fall back to root ../.env
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

// Disable Node 20 Happy Eyeballs auto-selection for IPv6/IPv4 fallback compatibility
if (typeof net.setDefaultAutoSelectFamily === "function") {
  net.setDefaultAutoSelectFamily(false);
}
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

function getDatabaseConfig() {
  const rawUrl = process.env.DATABASE_URL?.trim() || "";
  const schemaName = process.env.DATABASE_SCHEMA || "styling_service";

  if (!rawUrl) {
    throw new Error(
      "DATABASE_URL environment variable is missing or empty. Ensure it is defined in your root .env file.",
    );
  }

  let neonHost = "";
  try {
    const parsed = new URL(rawUrl);
    neonHost = parsed.hostname;
  } catch {}

  const isNeonOrProd =
    neonHost.includes("neon.tech") || process.env.NODE_ENV === "production";

const sslOption = isNeonOrProd
  ? { rejectUnauthorized: false }
  : false;

  return { databaseUrl: rawUrl, schemaName, sslOption };
}

export async function ensureStylingSchema(): Promise<void> {
  const { databaseUrl, schemaName, sslOption } = getDatabaseConfig();

  try {
    const { Client } = require("pg");
    const client = new Client({
      connectionString: databaseUrl,
      ssl: sslOption,
      family: 4,
      connectionTimeoutMillis: 10000,
    });

    await client.connect();
    await client.query(
      `CREATE SCHEMA IF NOT EXISTS "${schemaName.replace(/"/g, '""')}"`,
    );
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await client.end();
  } catch (err) {
    console.warn("ensureStylingSchema warning:", (err as Error).message || err);
  }
}

let _dataSource: DataSource | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (_dataSource && _dataSource.isInitialized) return _dataSource;

  const { databaseUrl, schemaName, sslOption } = getDatabaseConfig();

  _dataSource = new DataSource({
    type: "postgres",
    url: databaseUrl,
    schema: schemaName,
    ssl: sslOption,
    extra: {
      family: 4,
      connectionTimeoutMillis: 10000,
    },
    synchronize: true,
    logging: process.env.NODE_ENV === "development",
    entities: [OccasionOrmEntity, OutfitOrmEntity, OutfitItemOrmEntity],
  });

  await ensureStylingSchema();
  await _dataSource.initialize();
  return _dataSource;
}
