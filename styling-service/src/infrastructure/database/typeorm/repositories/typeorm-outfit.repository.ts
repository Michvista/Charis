// TypeORM outfit repository

import { getDataSource } from "../data-source";
import { OutfitOrmEntity } from "../entities/outfit.orm-entity";
import { Outfit } from "../../../../domain/outfit/aggregates/outfit.aggregate";
import { IOutfitRepository } from "../../../../domain/outfit/repositories/outfit.repository.interface";
import { OutfitPersistenceMapper } from "../mappers/outfit-persistence.mapper";

export class TypeOrmOutfitRepository implements IOutfitRepository {
  private async getRepo() {
    const ds = await getDataSource();
    return ds.getRepository(OutfitOrmEntity);
  }

  async save(outfit: Outfit): Promise<Outfit> {
    const repo = await this.getRepo();
    const ormEntity = OutfitPersistenceMapper.toOrm(outfit);
    const saved = await repo.save(ormEntity);
    return OutfitPersistenceMapper.toDomain(saved);
  }

  async findById(id: string): Promise<Outfit | null> {
    const repo = await this.getRepo();
    const found = await repo.findOne({
      where: { id },
      relations: {
        occasion: true,
        items: true,
      },
    });
    return found ? OutfitPersistenceMapper.toDomain(found) : null;
  }

  async findByUserId(userId: string): Promise<Outfit[]> {
    const repo = await this.getRepo();
    const found = await repo.find({
      where: { userId },
      relations: {
        occasion: true,
        items: true,
      },
    });
    return found.map(OutfitPersistenceMapper.toDomain);
  }
}
