// Outfit persistence mapper

import { Outfit } from "../../../../domain/outfit/aggregates/outfit.aggregate";
import { OutfitItem } from "../../../../domain/outfit/entities/outfit-item.domain-entity";
import { OutfitOrmEntity } from "../entities/outfit.orm-entity";
import { OutfitItemOrmEntity } from "../entities/outfit-item.orm-entity";

export class OutfitPersistenceMapper {
  public static toDomain(ormEntity: OutfitOrmEntity): Outfit {
    const items = (ormEntity.items || []).map((itemOrm) =>
      OutfitItem.create(
        { wardrobeItemId: itemOrm.wardrobeItemId, itemRole: itemOrm.itemRole },
        itemOrm.id,
      ),
    );

    return Outfit.create(
      {
        userId: ormEntity.userId,
        occasionId: ormEntity.occasion?.id,
        compatibilityScore: ormEntity.compatibilityScore,
        verdictText: ormEntity.verdictText,
        items,
      },
      ormEntity.id,
    );
  }

  public static toOrm(domainAggregate: Outfit): OutfitOrmEntity {
    const orm = new OutfitOrmEntity();
    orm.id = domainAggregate.id;
    orm.userId = domainAggregate.userId;
    orm.compatibilityScore = domainAggregate.compatibilityScore;
    orm.verdictText = domainAggregate.verdictText || "";

    orm.items = domainAggregate.items.map((item) => {
      const itemOrm = new OutfitItemOrmEntity();
      itemOrm.id = item.id;
      itemOrm.wardrobeItemId = item.wardrobeItemId;
      itemOrm.itemRole = item.itemRole;
      return itemOrm;
    });

    return orm;
  }
}