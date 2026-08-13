// Shared outfit compatibility engine

export type OutfitRole =
  | "TOP"
  | "BOTTOM"
  | "SHOES"
  | "OUTERWEAR"
  | "ACCESSORY";

export interface StyleItemInput {
  category: string;
  colorHex?: string;
  formalityLevel?: number;
  seasonTags?: string[];
}

export interface CompatibilityContext {
  occasionFormality?: number;
}

export interface CompatibilityBreakdown {
  score: number;
  roleScore: number;
  colorScore: number;
  formalityScore: number;
  seasonScore: number;
  completenessScore: number;
}

export class StyleCompatibilityService {
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

  private readonly requiredRoles: OutfitRole[] = ["TOP", "BOTTOM", "SHOES"];
  private readonly neutralColorNames = new Set([
    "black",
    "white",
    "gray",
    "grey",
    "navy",
    "beige",
    "cream",
    "brown",
  ]);

  public normalizeRole(role: string): OutfitRole | string {
    return role.toUpperCase();
  }

  public scoreOutfit(
    items: StyleItemInput[],
    context: CompatibilityContext = {},
  ): CompatibilityBreakdown {
    const normalized = items.map((item) => ({
      ...item,
      category: this.normalizeRole(item.category),
    }));

    const roleScore = this.scoreRoleCompatibility(normalized);
    const colorScore = this.scoreColorCompatibility(normalized);
    const formalityScore = this.scoreFormalityCompatibility(normalized, context);
    const seasonScore = this.scoreSeasonCompatibility(normalized);
    const completenessScore = this.scoreCompleteness(normalized, context);

    const rawScore =
      8 +
      roleScore * 0.25 +
      colorScore * 0.35 +
      formalityScore * 0.9 +
      seasonScore * 1.5 +
      completenessScore * 0.6;

    return {
      score: this.clampScore(rawScore),
      roleScore,
      colorScore,
      formalityScore,
      seasonScore,
      completenessScore,
    };
  }

  public scoreRoleCompatibility(items: StyleItemInput[]): number {
    let score = 0;
    const normalizedRoles = items.map((item) =>
      this.normalizeRole(item.category).toString(),
    );

    for (let i = 0; i < normalizedRoles.length; i += 1) {
      for (let j = i + 1; j < normalizedRoles.length; j += 1) {
        const left = normalizedRoles[i];
        const right = normalizedRoles[j];
        const edgeScore =
          this.compatibilityGraph[left]?.[right] ??
          this.compatibilityGraph[right]?.[left] ??
          0.12;
        score += edgeScore * 18;
      }
    }

    const coreCoverage = this.requiredRoles.filter((role) =>
      normalizedRoles.includes(role),
    ).length;
    score += coreCoverage * 4;

    const duplicates = this.countDuplicates(normalizedRoles);
    score -= duplicates * 6;

    if (this.requiredRoles.every((role) => normalizedRoles.includes(role))) {
      score += 10;
    }

    return score;
  }

  public scoreColorCompatibility(items: StyleItemInput[]): number {
    let score = 0;

    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const left = items[i].colorHex;
        const right = items[j].colorHex;

        if (!left || !right) {
          continue;
        }

        score += this.evaluateColorPair(left, right);
      }
    }

    return score;
  }

  public scoreFormalityCompatibility(
    items: StyleItemInput[],
    context: CompatibilityContext = {},
  ): number {
    const levels = items
      .map((item) => item.formalityLevel)
      .filter((level): level is number => typeof level === "number" && !Number.isNaN(level));

    if (levels.length === 0) {
      return 0;
    }

    const min = Math.min(...levels);
    const max = Math.max(...levels);
    const spread = max - min;
    const average = levels.reduce((sum, level) => sum + level, 0) / levels.length;
    let score = 0;

    if (spread <= 1) {
      score += 12;
    } else if (spread === 2) {
      score += 7;
    } else {
      score += 2;
    }

    if (typeof context.occasionFormality === "number") {
      const distance = Math.abs(average - context.occasionFormality);

      if (distance <= 0.4) {
        score += 16;
      } else if (distance <= 1) {
        score += 10;
      } else if (distance <= 2) {
        score += 3;
      } else {
        score -= 8;
      }
    }

    return score;
  }

  public scoreSeasonCompatibility(items: StyleItemInput[]): number {
    const seasonBuckets = items
      .map((item) => (item.seasonTags || []).map((season) => season.toLowerCase()))
      .filter((tags) => tags.length > 0);

    if (seasonBuckets.length === 0) {
      return 0;
    }

    const common = seasonBuckets.reduce((acc, tags) => {
      if (acc === null) {
        return new Set(tags);
      }
      return new Set(tags.filter((tag) => acc.has(tag)));
    }, null as Set<string> | null);

    if (common && common.size > 0) {
      return 6;
    }

    const flattened = new Set(seasonBuckets.flat());
    return flattened.size >= 2 ? 2 : 0;
  }

  public scoreCompleteness(
    items: StyleItemInput[],
    context: CompatibilityContext = {},
  ): number {
    const roles = items.map((item) => this.normalizeRole(item.category).toString());
    const missingRoles = this.requiredRoles.filter((role) => !roles.includes(role));

    let score = 0;

    if (missingRoles.length === 0) {
      score += 18;
    } else {
      score -= 10 * missingRoles.length;
    }

    const optionalRoles = roles.filter((role) => !this.requiredRoles.includes(role as OutfitRole));
    score += Math.min(8, optionalRoles.length * 2);

    if (typeof context.occasionFormality === "number") {
      score += this.scoreOccasionFit(items, context.occasionFormality);
    }

    return score;
  }

  public scoreOccasionFit(items: StyleItemInput[], occasionFormality: number): number {
    const levels = items
      .map((item) => item.formalityLevel)
      .filter((level): level is number => typeof level === "number" && !Number.isNaN(level));

    if (levels.length === 0) {
      return 0;
    }

    const average = levels.reduce((sum, level) => sum + level, 0) / levels.length;
    const distance = Math.abs(average - occasionFormality);

    if (distance <= 0.4) {
      return 14;
    }

    if (distance <= 1) {
      return 8;
    }

    if (distance <= 2) {
      return distance > 1.4 ? 2 : 4;
    }

    if (distance <= 3) {
      return -8;
    }

    return average >= occasionFormality ? -12 : -18;
  }

  public evaluateColorPair(colorA: string, colorB: string): number {
    const parsedA = this.parseColor(colorA);
    const parsedB = this.parseColor(colorB);

    if (!parsedA || !parsedB) {
      return 0;
    }

    const hueDiff = this.circularDistance(parsedA.h, parsedB.h);
    const saturationDiff = Math.abs(parsedA.s - parsedB.s);
    const lightnessDiff = Math.abs(parsedA.l - parsedB.l);
    const neutralA = this.isNeutral(parsedA, colorA);
    const neutralB = this.isNeutral(parsedB, colorB);

    if (hueDiff <= 10 && saturationDiff <= 0.1 && lightnessDiff <= 0.12) {
      return 18;
    }

    if (neutralA && neutralB) {
      return 14;
    }

    if (neutralA !== neutralB) {
      return 12;
    }

    if (hueDiff >= 150 && hueDiff <= 210 && parsedA.s >= 0.25 && parsedB.s >= 0.25) {
      return 16;
    }

    if (hueDiff <= 45) {
      return 11;
    }

    if (lightnessDiff >= 0.45 && hueDiff >= 90) {
      return 7;
    }

    if (
      hueDiff >= 25 &&
      hueDiff <= 75 &&
      parsedA.s >= 0.5 &&
      parsedB.s >= 0.5 &&
      lightnessDiff <= 0.35
    ) {
      return -8;
    }

    if (hueDiff >= 80 && hueDiff <= 140 && lightnessDiff <= 0.25) {
      return 5;
    }

    return 3;
  }

  public estimateUpperBound(
    currentItems: StyleItemInput[],
    remainingGroups: Array<{ role: string; items: StyleItemInput[] }>,
    context: CompatibilityContext = {},
  ): number {
    const currentScore = this.scoreOutfit(currentItems, context).score;
    let optimisticBonus = 0;

    for (const group of remainingGroups) {
      const bestContribution = group.items.reduce((best, candidate) => {
        const candidateItem = {
          ...candidate,
          category: this.normalizeRole(candidate.category).toString(),
        };

        const pairScore = currentItems.reduce((sum, current) => {
          const currentItem = {
            ...current,
            category: this.normalizeRole(current.category).toString(),
          };

          let local = this.compatibilityGraph[candidateItem.category]?.[currentItem.category] ??
            this.compatibilityGraph[currentItem.category]?.[candidateItem.category] ??
            0.12;
          local = local * 18;

          if (candidateItem.colorHex && currentItem.colorHex) {
            local += Math.max(0, this.evaluateColorPair(candidateItem.colorHex, currentItem.colorHex) * 0.75);
          }

          return sum + local;
        }, 0);

        const formalityBonus = typeof context.occasionFormality === "number"
          ? Math.max(
              0,
              14 - Math.abs((candidateItem.formalityLevel ?? context.occasionFormality) - context.occasionFormality) * 4,
            )
          : Math.max(0, 10 - Math.abs((candidateItem.formalityLevel ?? 3) - 3) * 2);

        const seasonBonus = candidateItem.seasonTags?.length ? 4 : 0;
        const structuralBonus = group.role === "ACCESSORY" ? 4 : 8;

        return Math.max(best, pairScore + formalityBonus + seasonBonus + structuralBonus);
      }, 0);

      optimisticBonus += bestContribution;
    }

    optimisticBonus += Math.max(0, remainingGroups.length - 1) * 6;

    return this.clampScore(currentScore + optimisticBonus);
  }

  private isNeutral(color: { h: number; s: number; l: number }, raw: string): boolean {
    if (color.s <= 0.15) {
      return true;
    }

    const normalized = raw.trim().toLowerCase().replace(/^#/, "");
    return this.neutralColorNames.has(normalized);
  }

  private parseColor(raw: string): { h: number; s: number; l: number } | null {
    const normalized = raw.trim().toLowerCase();
    const named = this.namedColorHex(normalized);
    const hex = named || normalized;
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);

    if (!match) {
      return null;
    }

    const value = match[1];
    const full = value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;

    const r = parseInt(full.slice(0, 2), 16) / 255;
    const g = parseInt(full.slice(2, 4), 16) / 255;
    const b = parseInt(full.slice(4, 6), 16) / 255;

    return this.rgbToHsl(r, g, b);
  }

  private namedColorHex(color: string): string | null {
    const map: Record<string, string> = {
      black: "#000000",
      white: "#ffffff",
      gray: "#808080",
      grey: "#808080",
      navy: "#000080",
      beige: "#f5f5dc",
      cream: "#fffdd0",
      brown: "#8b4513",
      red: "#ff0000",
      blue: "#0000ff",
      green: "#008000",
      yellow: "#ffff00",
      orange: "#ffa500",
      purple: "#800080",
      pink: "#ffc0cb",
    };

    return map[color] || null;
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) {
      return { h: 0, s: 0, l };
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h = 0;
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }

    h = (h / 6) * 360;
    return { h, s, l };
  }

  private circularDistance(a: number, b: number): number {
    const diff = Math.abs(a - b) % 360;
    return Math.min(diff, 360 - diff);
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

  private clampScore(score: number): number {
    return Math.min(100, Math.max(0, Math.round(score)));
  }
}
