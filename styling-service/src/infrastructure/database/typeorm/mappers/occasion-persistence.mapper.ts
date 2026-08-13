// Occasion persistence mapper

import { Occasion } from "../../../../domain/occasion/entities/occasion.domain-entity";
import { OccasionOrmEntity } from "../entities/occasion.orm-entity";

export class OccasionPersistenceMapper {
  public static toDomain(ormEntity: OccasionOrmEntity): Occasion {
    return Occasion.create(
      { name: ormEntity.name, formalityLevel: ormEntity.formalityLevel },
      ormEntity.id,
    );
  }

  public static toOrm(domainEntity: Occasion): OccasionOrmEntity {
    const orm = new OccasionOrmEntity();
    orm.id = domainEntity.id;
    orm.name = domainEntity.name;
    orm.formalityLevel = domainEntity.formalityLevel;
    return orm;
  }
}