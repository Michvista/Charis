// TypeORM data source

import "reflect-metadata";
import { DataSource } from "typeorm";
import { OccasionOrmEntity } from "./entities/occasion.orm-entity";
import { OutfitOrmEntity } from "./entities/outfit.orm-entity";
import { OutfitItemOrmEntity } from "./entities/outfit-item.orm-entity";

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
