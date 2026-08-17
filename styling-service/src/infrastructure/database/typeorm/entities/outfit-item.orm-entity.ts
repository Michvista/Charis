// Outfit item ORM entity

import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { OutfitOrmEntity } from "./outfit.orm-entity";

@Entity("outfit_items")
export class OutfitItemOrmEntity {
  @PrimaryColumn({ type: "uuid", default: () => "gen_random_uuid()" })
  id!: string;

  @ManyToOne(() => OutfitOrmEntity, (outfit) => outfit.items, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "outfit_id" })
  outfit!: OutfitOrmEntity;

  @Column({ type: "uuid" })
  wardrobeItemId!: string;

  @Column({ type: "varchar", length: 50 })
  itemRole!: string;
}
