// Occasion repository interface

import { Occasion } from "../entities/occasion.domain-entity";

export interface IOccasionRepository {
  save(occasion: Occasion): Promise<Occasion>;
  findById(id: string): Promise<Occasion | null>;
  findByName(name: string): Promise<Occasion | null>;
  findAll(): Promise<Occasion[]>;
}