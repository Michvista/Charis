// Compatibility graph domain service

import {
  CompatibilityContext,
  StyleCompatibilityService,
  StyleItemInput,
} from "../../shared/services/style-compatibility.service";

export interface VerdictInput {
  items: Array<
    StyleItemInput & {
      itemRole?: string;
    }
  >;
  occasionFormality: number;
}

export interface VerdictOutput {
  score: number;
  verdictText: string;
}

export class CompatibilityGraphDomainService {
  private readonly compatibilityService = new StyleCompatibilityService();

  // scores the outfit by combining graph edges, completeness, and occasion fit
  public evaluateOutfit(input: VerdictInput): VerdictOutput {
    const context: CompatibilityContext = {
      occasionFormality: input.occasionFormality,
    };

    const styleItems = input.items.map((item) => ({
      category: item.itemRole || item.category,
      colorHex: item.colorHex,
      formalityLevel: item.formalityLevel,
      seasonTags: item.seasonTags,
    }));

    const breakdown = this.compatibilityService.scoreOutfit(
      styleItems,
      context,
    );

    const normalizedRoles = styleItems.map((item) =>
      (item.category || "").toUpperCase(),
    );
    const missingRoles = ["TOP", "BOTTOM", "SHOES"].filter(
      (role) => !normalizedRoles.includes(role),
    );
    const verdictText = this.buildVerdictText(
      breakdown.score,
      missingRoles,
      breakdown,
      normalizedRoles,
    );

    return {
      score: breakdown.score,
      verdictText,
    };
  }

  private buildVerdictText(
    score: number,
    missingRoles: string[],
    breakdown: { roleScore: number; colorScore: number; formalityScore: number; seasonScore: number; completenessScore: number },
    roles: string[],
  ): string {
    const verdict =
      score >= 85
        ? "Excellent match."
        : score >= 70
          ? "Good match."
          : score >= 50
            ? "Mixed match."
            : "Poor match.";

    const comments = [
      breakdown.roleScore > 0 ? "Role graph is working in your favor." : "Role graph is weaker than ideal.",
      breakdown.formalityScore > 0 ? "Occasion formality is aligned." : "Occasion formality is not an exact fit.",
      breakdown.colorScore > 0 ? "Color harmony is helping the look." : "Color harmony is a weak spot.",
      breakdown.seasonScore > 0 ? "Season signals are consistent." : "",
      breakdown.completenessScore > 0 ? "Core outfit structure is present." : "",
      roles.includes("OUTERWEAR") ? "Outerwear adds structure." : "",
    ];

    const missingText =
      missingRoles.length > 0
        ? `Missing roles: ${missingRoles.join(", ").toLowerCase()}.`
        : "";

    return [verdict, ...comments, missingText].filter(Boolean).join(" ");
  }
}
