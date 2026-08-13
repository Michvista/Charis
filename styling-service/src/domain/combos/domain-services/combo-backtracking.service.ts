// Combo backtracking domain service

import {
  CompatibilityContext,
  StyleCompatibilityService,
  StyleItemInput,
} from "../../shared/services/style-compatibility.service";

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

export interface ComboSearchOptions {
  occasionFormality?: number;
  maxResults?: number;
}

export class ComboBacktrackingDomainService {
  private readonly compatibilityService = new StyleCompatibilityService();
  private readonly requiredRoles = ["TOP", "BOTTOM", "SHOES"];
  private readonly roleOrder = ["TOP", "BOTTOM", "SHOES", "OUTERWEAR", "ACCESSORY"];

  public generateCombinations(
    items: WardrobeItemInput[],
    options: ComboSearchOptions = {},
  ): CombinationResult[] {
    const results: CombinationResult[] = [];
    const groups = this.groupByRole(items);
    const current: WardrobeItemInput[] = [];
    const context: CompatibilityContext = {
      occasionFormality: options.occasionFormality,
    };
    const bestScore = { value: Number.NEGATIVE_INFINITY };

    this.backtrack(0, groups, current, results, context, bestScore, options.maxResults ?? Number.POSITIVE_INFINITY);

    return results.sort((a, b) => b.score - a.score);
  }

  private backtrack(
    roleIndex: number,
    groups: Map<string, WardrobeItemInput[]>,
    current: WardrobeItemInput[],
    results: CombinationResult[],
    context: CompatibilityContext,
    bestScore: { value: number },
    maxResults: number,
  ): void {
    if (roleIndex >= this.roleOrder.length) {
      if (this.isValidCombination(current)) {
        const score = this.scoreCombination(current, context);
        if (score >= bestScore.value) {
          bestScore.value = score;
        }
        results.push({
          comboId: crypto.randomUUID(),
          items: [...current],
          score,
        });
      }
      return;
    }

    const role = this.roleOrder[roleIndex];
    const candidates = this.rankCandidates(groups.get(role) || [], current, context);
    const remainingGroups = this.remainingGroups(groups, roleIndex);

    const optimisticUpperBound = this.compatibilityService.estimateUpperBound(
      current,
      remainingGroups,
      context,
    );

    if (optimisticUpperBound < bestScore.value - 1 || results.length >= maxResults) {
      return;
    }

    if (this.requiredRoles.includes(role) && candidates.length === 0) {
      return;
    }

    if (candidates.length === 0) {
      this.backtrack(roleIndex + 1, groups, current, results, context, bestScore, maxResults);
      return;
    }

    for (const candidate of candidates) {
      current.push(candidate);

      const partialBound = this.compatibilityService.estimateUpperBound(
        current,
        this.remainingGroups(groups, roleIndex + 1),
        context,
      );

      if (partialBound >= bestScore.value - 1) {
        this.backtrack(roleIndex + 1, groups, current, results, context, bestScore, maxResults);
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

  private rankCandidates(
    candidates: WardrobeItemInput[],
    current: WardrobeItemInput[],
    context: CompatibilityContext,
  ): WardrobeItemInput[] {
    return [...candidates].sort((left, right) => {
      const leftScore = this.estimateItemPotential(left, current, context);
      const rightScore = this.estimateItemPotential(right, current, context);
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }
      return left.id.localeCompare(right.id);
    });
  }

  private scoreCombination(
    items: WardrobeItemInput[],
    context: CompatibilityContext,
  ): number {
    return this.compatibilityService.scoreOutfit(
      items as unknown as StyleItemInput[],
      context,
    ).score;
  }

  private estimateItemPotential(
    candidate: WardrobeItemInput,
    current: WardrobeItemInput[],
    context: CompatibilityContext,
  ): number {
    const roleBonus =
      candidate.category === "TOP" || candidate.category === "BOTTOM" || candidate.category === "SHOES"
        ? 10
        : 6;
    const formalityBonus =
      typeof context.occasionFormality === "number"
        ? Math.max(
            0,
            12 - Math.abs((candidate.formalityLevel ?? context.occasionFormality) - context.occasionFormality) * 3,
          )
        : Math.max(0, 10 - Math.abs((candidate.formalityLevel ?? 3) - 3) * 2);
    const colorBonus = current.reduce((sum, item) => {
      return sum + Math.max(0, this.compatibilityService.evaluateColorPair(candidate.colorHex, item.colorHex) * 0.75);
    }, 0);
    const seasonBonus = candidate.seasonTags?.length ? 4 : 0;

    return roleBonus + formalityBonus + colorBonus + seasonBonus;
  }

  private remainingGroups(
    groups: Map<string, WardrobeItemInput[]>,
    roleIndex: number,
  ): Array<{ role: string; items: WardrobeItemInput[] }> {
    const remaining: Array<{ role: string; items: WardrobeItemInput[] }> = [];

    for (let index = roleIndex; index < this.roleOrder.length; index += 1) {
      const role = this.roleOrder[index];
      const items = groups.get(role);
      if (items && items.length > 0) {
        remaining.push({ role, items });
      }
    }

    return remaining;
  }
}
