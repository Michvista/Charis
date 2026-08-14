// Outfit aggregate

import { AggregateRoot } from "../../../shared/domain/aggregate-root.base";
import { CompatibilityScore } from "../value-objects/compatibility-score.vo";
import { OutfitItem } from "../entities/outfit-item.domain-entity";

export interface RankedComboSummary {
  comboId?: string;
  items: Array<{
    id: string;
    category: string;
    colorHex: string;
    formalityLevel?: number;
    seasonTags?: string[];
    imageUrl?: string;
  }>;
  score: number;
  finalScore?: number;
  visualScore?: number;
  visualNotes?: string;
  confirmed?: boolean;
}

export interface OutfitProps {
  userId: string;
  occasionId?: string;
  compatibilityScore: CompatibilityScore;
  verdictText?: string;
  status: "pending" | "done" | "failed";
  rankedCombos?: RankedComboSummary[];
  items: OutfitItem[];
}

export interface OutfitCreateProps {
  userId: string;
  occasionId?: string;
  compatibilityScore: number | CompatibilityScore;
  verdictText?: string;
  status: "pending" | "done" | "failed";
  rankedCombos?: RankedComboSummary[];
  items: OutfitItem[];
}

export class Outfit extends AggregateRoot<OutfitProps> {
  private static ensureCompatibilityScore(
    compatibilityScore: number | CompatibilityScore,
  ): CompatibilityScore {
    if (compatibilityScore instanceof CompatibilityScore) {
      return compatibilityScore;
    }

    const result = CompatibilityScore.create(compatibilityScore);
    if (result.isFailure) {
      throw new Error(result.error || "Invalid compatibility score.");
    }

    return result.getValue();
  }

  get userId(): string {
    return this.props.userId;
  }
  get occasionId(): string | undefined {
    return this.props.occasionId;
  }
  get compatibilityScore(): number {
    return this.props.compatibilityScore.value;
  }
  get compatibilityScoreVO(): CompatibilityScore {
    return this.props.compatibilityScore;
  }
  get verdictText(): string | undefined {
    return this.props.verdictText;
  }
  get status(): "pending" | "done" | "failed" {
    return this.props.status;
  }
  get rankedCombos(): RankedComboSummary[] {
    return this.props.rankedCombos || [];
  }
  get items(): OutfitItem[] {
    return this.props.items;
  }

  public static create(props: OutfitCreateProps, id?: string): Outfit {
    return new Outfit(
      {
        ...props,
        compatibilityScore: Outfit.ensureCompatibilityScore(props.compatibilityScore),
      },
      id,
    );
  }

  public complete(input: {
    compatibilityScore: number | CompatibilityScore;
    verdictText?: string;
    rankedCombos?: RankedComboSummary[];
  }): this {
    this.props.compatibilityScore = Outfit.ensureCompatibilityScore(input.compatibilityScore);
    this.props.verdictText = input.verdictText;
    this.props.rankedCombos = input.rankedCombos || [];
    this.props.status = "done";
    return this;
  }

  public fail(reason?: string): this {
    this.props.status = "failed";
    if (reason) {
      this.props.verdictText = reason;
    }
    return this;
  }

  public markProcessing(): this {
    this.props.status = "pending";
    return this;
  }

  public updateRankedCombos(rankedCombos: RankedComboSummary[]): this {
    this.props.rankedCombos = rankedCombos;
    return this;
  }
}
