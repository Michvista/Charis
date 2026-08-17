// Occasion ORM entity

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("occasions")
export class OccasionOrmEntity {
  @PrimaryColumn({ type: "uuid", default: () => "gen_random_uuid()" })
  id!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  name!: string;

  @Column({ type: "int", default: 1 })
  formalityLevel!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
