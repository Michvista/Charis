// Combo backtracking domain service

export interface WardrobeItemInput {
  id: string;
  category: "TOP" | "BOTTOM" | "SHOES" | "OUTERWEAR" | "ACCESSORY";
  colorHex: string;
  formalityLevel?: number;
  seasonTags?: string[];
}

export interface CombinationResult {
  comboId: string;
  items: WardrobeItemInput[];
  score: number;
}

export class ComboBacktrackingDomainService {
  private readonly requiredRoles = ["TOP", "BOTTOM", "SHOES"];
  private readonly roleOrder = ["TOP", "BOTTOM", "SHOES", "OUTERWEAR", "ACCESSORY"];

  public generateCombinations(items: WardrobeItemInput[]): CombinationResult[] {
    const results: CombinationResult[] = [];
    const groups = this.groupByRole(items);
    const current: WardrobeItemInput[] = [];

    this.backtrack(0, groups, current, results);

    return results.sort((a, b) => b.score - a.score);
  }

  private backtrack(
    roleIndex: number,
    groups: Map<string, WardrobeItemInput[]>,
    current: WardrobeItemInput[],
    results: CombinationResult[],
  ): void {
    if (roleIndex >= this.roleOrder.length) {
      if (this.isValidCombination(current)) {
        results.push({
          comboId: crypto.randomUUID(),
          items: [...current],
          score: this.scoreCombination(current),
        });
      }
      return;
    }

    const role = this.roleOrder[roleIndex];
    const candidates = groups.get(role) || [];

    if (this.requiredRoles.includes(role) && candidates.length === 0) {
      return;
    }

    if (candidates.length === 0) {
      this.backtrack(roleIndex + 1, groups, current, results);
      return;
    }

    for (const candidate of candidates) {
      current.push(candidate);

      if (this.isPromising(current, results)) {
        this.backtrack(roleIndex + 1, groups, current, results);
      }

      current.pop();
    }
  }

  private groupByRole(items: WardrobeItemInput[]): Map<string, WardrobeItemInput[]> {
    const groups = new Map<string, WardrobeItemInput[]>();

    for (const item of items) {
      const role = item.category.toUpperCase();
      const bucket = groups.get(role) || [];
      bucket.push(item);
      groups.set(role, bucket);
    }

    return groups;
  }

  private isValidCombination(items: WardrobeItemInput[]): boolean {
    const roles = items.map((item) => item.category.toUpperCase());
    return this.requiredRoles.every((role) => roles.includes(role));
  }

  private isPromising(
    current: WardrobeItemInput[],
    results: CombinationResult[],
  ): boolean {
    const score = this.scoreCombination(current);
    const bestKnown = results[0]?.score ?? 0;
    return current.length < this.requiredRoles.length || score >= bestKnown - 5;
  }

  private scoreCombination(items: WardrobeItemInput[]): number {
    if (!this.isValidCombination(items)) {
      return 0;
    }

    let score = 40;
    const normalized = items.map((item) => ({
      ...item,
      category: item.category.toUpperCase() as WardrobeItemInput["category"],
    }));

    const top = normalized.find((item) => item.category === "TOP");
    const bottom = normalized.find((item) => item.category === "BOTTOM");
    const shoes = normalized.find((item) => item.category === "SHOES");
    const outerwear = normalized.find((item) => item.category === "OUTERWEAR");
    const accessoryCount = normalized.filter(
      (item) => item.category === "ACCESSORY",
    ).length;

    if (top && bottom) {
      score += this.evaluateColorHarmony(top.colorHex, bottom.colorHex);
    }

    if (bottom && shoes) {
      score += this.evaluateColorHarmony(bottom.colorHex, shoes.colorHex) * 0.75;
    }

    if (top && shoes) {
      score += this.evaluateColorHarmony(top.colorHex, shoes.colorHex) * 0.5;
    }

    if (outerwear) {
      score += 8;
    }

    score += Math.min(10, accessoryCount * 3);
    score += this.evaluateFormalitySpread(normalized);

    return Math.min(100, Math.round(score));
  }

  private evaluateColorHarmony(color1: string, color2: string): number {
    if (color1 === color2) return 22;

    const neutrals = ["#000000", "#ffffff", "#ffffff", "#f5f5f5", "#808080"];
    const isNeutral = (color: string) =>
      neutrals.includes(color.toLowerCase()) ||
      ["black", "white", "gray", "grey", "navy"].some((value) =>
        color.toLowerCase().includes(value),
      );

    if (isNeutral(color1) || isNeutral(color2)) {
      return 18;
    }

    return 12;
  }

  private evaluateFormalitySpread(items: WardrobeItemInput[]): number {
    const levels = items
      .map((item) => item.formalityLevel || 1)
      .filter((level) => level >= 1 && level <= 5);

    if (levels.length === 0) {
      return 0;
    }

    const min = Math.min(...levels);
    const max = Math.max(...levels);
    const spread = max - min;

    if (spread <= 1) {
      return 10;
    }

    if (spread === 2) {
      return 6;
    }

    return 2;
  }
}
