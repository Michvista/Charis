// Compatibility graph domain service

export interface VerdictInput {
  itemRoles: string[];
  occasionFormality: number;
}

export interface VerdictOutput {
  score: number;
  verdictText: string;
}

export class CompatibilityGraphDomainService {
  private readonly compatibilityGraph: Record<string, Record<string, number>> = {
    TOP: {
      BOTTOM: 1.0,
      SHOES: 0.7,
      OUTERWEAR: 0.8,
      ACCESSORY: 0.5,
    },
    BOTTOM: {
      TOP: 1.0,
      SHOES: 0.9,
      OUTERWEAR: 0.6,
      ACCESSORY: 0.5,
    },
    SHOES: {
      TOP: 0.7,
      BOTTOM: 0.9,
      OUTERWEAR: 0.4,
      ACCESSORY: 0.3,
    },
    OUTERWEAR: {
      TOP: 0.8,
      BOTTOM: 0.6,
      SHOES: 0.4,
      ACCESSORY: 0.4,
    },
    ACCESSORY: {
      TOP: 0.5,
      BOTTOM: 0.5,
      SHOES: 0.3,
      OUTERWEAR: 0.4,
    },
  };

  private readonly requiredRoles = ["TOP", "BOTTOM", "SHOES"];

  // scores the outfit by combining graph edges, completeness, and occasion fit
  public evaluateOutfit(input: VerdictInput): VerdictOutput {
    const normalizedRoles = input.itemRoles.map((role) =>
      role.toUpperCase(),
    );
    let score = 35;
    const comments: string[] = [];

    const missingRoles = this.requiredRoles.filter(
      (role) => !normalizedRoles.includes(role),
    );

    if (missingRoles.length === 0) {
      score += 25;
      comments.push("Outfit covers the required core roles.");
    } else {
      score -= 18 + missingRoles.length * 4;
      comments.push(`Missing core roles: ${missingRoles.join(", ").toLowerCase()}.`);
    }

    for (let i = 0; i < normalizedRoles.length; i += 1) {
      for (let j = i + 1; j < normalizedRoles.length; j += 1) {
        const left = normalizedRoles[i];
        const right = normalizedRoles[j];
        const edgeScore =
          this.compatibilityGraph[left]?.[right] ??
          this.compatibilityGraph[right]?.[left] ??
          0.15;
        score += edgeScore * 18;
      }
    }

    const duplicateCount = this.countDuplicates(normalizedRoles);
    if (duplicateCount > 0) {
      score -= duplicateCount * 6;
      comments.push("Repeated roles reduce outfit balance.");
    }

    const coreCoverage = this.requiredRoles.filter((role) =>
      normalizedRoles.includes(role),
    ).length;
    score += coreCoverage * 4;

    if (input.occasionFormality >= 4) {
      const formalRoles = normalizedRoles.filter(
        (role) => role === "OUTERWEAR" || role === "ACCESSORY",
      ).length;
      const formalityMatch = Math.min(12, formalRoles * 4 + 8);
      score += formalityMatch;
      comments.push("High-formality occasion gets structural polish bonus.");
    } else if (input.occasionFormality <= 2) {
      const casualRoles = normalizedRoles.filter(
        (role) => role === "ACCESSORY" || role === "SHOES",
      ).length;
      score += casualRoles * 2;
      comments.push("Casual occasion accepts lighter styling.");
    } else {
      score += 6;
      comments.push("Mid-formality occasion is reasonably matched.");
    }

    if (normalizedRoles.includes("OUTERWEAR")) {
      score += input.occasionFormality >= 3 ? 4 : 2;
    }

    const finalScore = Math.min(100, Math.max(0, Math.round(score)));
    const verdictText = this.buildVerdictText(finalScore, missingRoles, comments);

    return {
      score: finalScore,
      verdictText,
    };
  }

  private countDuplicates(values: string[]): number {
    const seen = new Set<string>();
    let duplicates = 0;

    for (const value of values) {
      if (seen.has(value)) {
        duplicates += 1;
        continue;
      }
      seen.add(value);
    }

    return duplicates;
  }

  private buildVerdictText(
    score: number,
    missingRoles: string[],
    comments: string[],
  ): string {
    const verdict =
      score >= 85
        ? "Excellent match."
        : score >= 70
          ? "Good match."
          : score >= 50
            ? "Mixed match."
            : "Poor match.";

    const missingText =
      missingRoles.length > 0
        ? `Missing roles: ${missingRoles.join(", ").toLowerCase()}.`
        : "";

    return [verdict, ...comments, missingText].filter(Boolean).join(" ");
  }
}
