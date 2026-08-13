// Outfit repository interface

import { Outfit } from "../aggregates/outfit.aggregate";

export interface IOutfitRepository {
  save(outfit: Outfit): Promise<Outfit>;
  findById(id: string): Promise<Outfit | null>;
  findByUserId(userId: string): Promise<Outfit[]>;
}