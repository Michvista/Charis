// Outfit ORM entity

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { OccasionOrmEntity } from "./occasion.orm-entity";
import { OutfitItemOrmEntity } from "./outfit-item.orm-entity";

@Entity("outfits")
export class OutfitOrmEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => OccasionOrmEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "occasion_id" })
  occasion!: OccasionOrmEntity;

  @Column({ type: "float", default: 0.0 })
  compatibilityScore!: number;

  @Column({ type: "text", nullable: true })
  verdictText!: string;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: string;

  @Column({ type: "jsonb", nullable: true })
  rankedCombos?: unknown[];

  @OneToMany(() => OutfitItemOrmEntity, (item) => item.outfit, {
    cascade: true,
  })
  items!: OutfitItemOrmEntity[];

  @CreateDateColumn()
  createdAt!: Date;
}
