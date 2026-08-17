// TypeORM data source

import "reflect-metadata";
import { DataSource } from "typeorm";
import { OccasionOrmEntity } from "./entities/occasion.orm-entity";
import { OutfitOrmEntity } from "./entities/outfit.orm-entity";
import { OutfitItemOrmEntity } from "./entities/outfit-item.orm-entity";

const databaseUrl = process.env.DATABASE_URL;
const useSsl = !!databaseUrl && (databaseUrl.includes("neon.tech") || process.env.NODE_ENV === "production");

export async function ensureStylingSchema(): Promise<void> {
  const schemaName = process.env.DATABASE_SCHEMA || "styling_service";
  if (!databaseUrl || !schemaName) {
    return;
  }

  const { Client } = require("pg") as {
    Client: new (options: {
      connectionString: string;
      ssl?: { rejectUnauthorized: boolean } | false;
      connectionTimeoutMillis?: number;
    }) => {
      connect(): Promise<void>;
      query(sql: string): Promise<unknown>;
      end(): Promise<void>;
    };
  };

  const client = new Client({
    connectionString: databaseUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  });

  await client.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName.replace(/"/g, '""')}"`);
  } finally {
    await client.end();
  }
}

export const AppDataSource = new DataSource({
  type: "postgres",
  url: databaseUrl,
  schema: process.env.DATABASE_SCHEMA || "styling_service",
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  extra: {
    connectionTimeoutMillis: 10000,
  },
  synchronize: true,
  logging: process.env.NODE_ENV === "development",
  entities: [OccasionOrmEntity, OutfitOrmEntity, OutfitItemOrmEntity],
});
