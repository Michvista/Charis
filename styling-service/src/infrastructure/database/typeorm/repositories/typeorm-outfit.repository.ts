// TypeORM outfit repository

import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { OutfitOrmEntity } from "../entities/outfit.orm-entity";
import { Outfit } from "../../../../domain/outfit/aggregates/outfit.aggregate";
import { IOutfitRepository } from "../../../../domain/outfit/repositories/outfit.repository.interface";
import { OutfitPersistenceMapper } from "../mappers/outfit-persistence.mapper";

export class TypeOrmOutfitRepository implements IOutfitRepository {
  private repo: Repository<OutfitOrmEntity>;

  constructor() {
    this.repo = AppDataSource.getRepository(OutfitOrmEntity);
  }

  async save(outfit: Outfit): Promise<Outfit> {
    const ormEntity = OutfitPersistenceMapper.toOrm(outfit);
    const saved = await this.repo.save(ormEntity);
    return OutfitPersistenceMapper.toDomain(saved);
  }

  async findById(id: string): Promise<Outfit | null> {
    const found = await this.repo.findOne({
      where: { id },
      relations: {
        occasion: true,
        items: true,
      },
    });
    return found ? OutfitPersistenceMapper.toDomain(found) : null;
  }

  async findByUserId(userId: string): Promise<Outfit[]> {
    const found = await this.repo.find({
      where: { userId },
      relations: {
        occasion: true,
        items: true,
      },
    });
    return found.map(OutfitPersistenceMapper.toDomain);
  }
}
