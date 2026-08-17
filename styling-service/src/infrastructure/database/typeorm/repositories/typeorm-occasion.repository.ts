// TypeORM occasion repository

import { getDataSource } from "../data-source";
import { OccasionOrmEntity } from "../entities/occasion.orm-entity";
import { Occasion } from "../../../../domain/occasion/entities/occasion.domain-entity";
import { IOccasionRepository } from "../../../../domain/occasion/repositories/occasion.repository.interface";
import { OccasionPersistenceMapper } from "../mappers/occasion-persistence.mapper";

export class TypeOrmOccasionRepository implements IOccasionRepository {
  private async getRepo() {
    const ds = await getDataSource();
    return ds.getRepository(OccasionOrmEntity);
  }

  async save(occasion: Occasion): Promise<Occasion> {
    const repo = await this.getRepo();
    const ormEntity = OccasionPersistenceMapper.toOrm(occasion);
    const saved = await repo.save(ormEntity);
    return OccasionPersistenceMapper.toDomain(saved);
  }

  async findById(id: string): Promise<Occasion | null> {
    const repo = await this.getRepo();
    const found = await repo.findOneBy({ id });
    return found ? OccasionPersistenceMapper.toDomain(found) : null;
  }

  async findByName(name: string): Promise<Occasion | null> {
    const repo = await this.getRepo();
    const found = await repo.findOneBy({ name });
    return found ? OccasionPersistenceMapper.toDomain(found) : null;
  }

  async findAll(): Promise<Occasion[]> {
    const repo = await this.getRepo();
    const found = await repo.find();
    return found.map(OccasionPersistenceMapper.toDomain);
  }
}