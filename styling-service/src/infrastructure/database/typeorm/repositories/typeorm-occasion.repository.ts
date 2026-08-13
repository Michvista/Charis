// TypeORM occasion repository

import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { OccasionOrmEntity } from "../entities/occasion.orm-entity";
import { Occasion } from "../../../../domain/occasion/entities/occasion.domain-entity";
import { IOccasionRepository } from "../../../../domain/occasion/repositories/occasion.repository.interface";
import { OccasionPersistenceMapper } from "../mappers/occasion-persistence.mapper";

export class TypeOrmOccasionRepository implements IOccasionRepository {
  private repo: Repository<OccasionOrmEntity>;

  constructor() {
    this.repo = AppDataSource.getRepository(OccasionOrmEntity);
  }

  async save(occasion: Occasion): Promise<Occasion> {
    const ormEntity = OccasionPersistenceMapper.toOrm(occasion);
    const saved = await this.repo.save(ormEntity);
    return OccasionPersistenceMapper.toDomain(saved);
  }

  async findById(id: string): Promise<Occasion | null> {
    const found = await this.repo.findOneBy({ id });
    return found ? OccasionPersistenceMapper.toDomain(found) : null;
  }

  async findByName(name: string): Promise<Occasion | null> {
    const found = await this.repo.findOneBy({ name });
    return found ? OccasionPersistenceMapper.toDomain(found) : null;
  }

  async findAll(): Promise<Occasion[]> {
    const found = await this.repo.find();
    return found.map(OccasionPersistenceMapper.toDomain);
  }
}