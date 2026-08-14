// TypeORM data source

import "reflect-metadata";
import { DataSource } from "typeorm";
import { OccasionOrmEntity } from "./entities/occasion.orm-entity";
import { OutfitOrmEntity } from "./entities/outfit.orm-entity";
import { OutfitItemOrmEntity } from "./entities/outfit-item.orm-entity";

export async function ensureStylingSchema(): Promise<void> {
  const schemaName = process.env.DATABASE_SCHEMA || "styling_service";
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || !schemaName) {
    return;
  }

  const { Client } = require("pg") as {
    Client: new (options: {
      connectionString: string;
      ssl?: { rejectUnauthorized: boolean } | false;
    }) => {
      connect(): Promise<void>;
      query(sql: string): Promise<unknown>;
      end(): Promise<void>;
    };
  };

  const client = new Client({
    connectionString: databaseUrl,
    ssl:
      process.env.NODE_ENV === "production" ||
      databaseUrl.includes("neon.tech")
        ? { rejectUnauthorized: false }
        : undefined,
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
  url: process.env.DATABASE_URL,
  schema: process.env.DATABASE_SCHEMA || "styling_service",
  ssl:
    process.env.NODE_ENV === "production" ||
    process.env.DATABASE_URL?.includes("neon.tech")
      ? { rejectUnauthorized: false }
      : false,
  synchronize: true,
  logging: process.env.NODE_ENV === "development",
  entities: [OccasionOrmEntity, OutfitOrmEntity, OutfitItemOrmEntity],
});
