// Outfit aggregate

import { AggregateRoot } from "../../../shared/domain/aggregate-root.base";
import { OutfitItem } from "../entities/outfit-item.domain-entity";

export interface OutfitProps {
  userId: string;
  occasionId?: string;
  compatibilityScore: number;
  verdictText?: string;
  items: OutfitItem[];
}

export class Outfit extends AggregateRoot<OutfitProps> {
  get userId(): string {
    return this.props.userId;
  }
  get occasionId(): string | undefined {
    return this.props.occasionId;
  }
  get compatibilityScore(): number {
    return this.props.compatibilityScore;
  }
  get verdictText(): string | undefined {
    return this.props.verdictText;
  }
  get items(): OutfitItem[] {
    return this.props.items;
  }

  public static create(props: OutfitProps, id?: string): Outfit {
    return new Outfit(props, id);
  }
}