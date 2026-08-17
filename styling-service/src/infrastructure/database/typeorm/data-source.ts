// TypeORM data source

import "reflect-metadata";
import dns from "node:dns";
import { DataSource } from "typeorm";
import { OccasionOrmEntity } from "./entities/occasion.orm-entity";
import { OutfitOrmEntity } from "./entities/outfit.orm-entity";
import { OutfitItemOrmEntity } from "./entities/outfit-item.orm-entity";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

const databaseUrl = process.env.DATABASE_URL;
const schemaName = process.env.DATABASE_SCHEMA || "styling_service";

const isNeonOrProd =
  databaseUrl?.includes("neon.tech") || process.env.NODE_ENV === "production";

const sslOption = isNeonOrProd ? { rejectUnauthorized: false } : false;

export async function ensureStylingSchema(): Promise<void> {
  if (!databaseUrl || !schemaName) {
    return;
  }

  try {
    const { Client } = require("pg");
    const client = new Client({
      connectionString: databaseUrl,
      ssl: sslOption,
      connectionTimeoutMillis: 30000,
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

export const AppDataSource = new DataSource({
  type: "postgres",
  url: databaseUrl,
  schema: schemaName,
  ssl: sslOption,
  extra: {
    connectionTimeoutMillis: 30000,
  },
  synchronize: true,
  logging: process.env.NODE_ENV === "development",
  entities: [OccasionOrmEntity, OutfitOrmEntity, OutfitItemOrmEntity],
});