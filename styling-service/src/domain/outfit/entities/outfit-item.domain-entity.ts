// Outfit item domain entity

import { BaseEntity } from "../../../shared/domain/entity.base";

export interface OutfitItemProps {
  wardrobeItemId: string;
  itemRole: string;
}

export class OutfitItem extends BaseEntity<OutfitItemProps> {
  get wardrobeItemId(): string {
    return this.props.wardrobeItemId;
  }
  get itemRole(): string {
    return this.props.itemRole;
  }

  public static create(props: OutfitItemProps, id?: string): OutfitItem {
    return new OutfitItem(props, id);
  }
}