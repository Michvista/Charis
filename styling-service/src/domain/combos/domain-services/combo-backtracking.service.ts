// Combo backtracking domain service

export interface WardrobeItemInput {
  id: string;
  category: "TOP" | "BOTTOM" | "SHOES" | "OUTERWEAR";
  colorHex: string;
}

export interface CombinationResult {
  comboId: string;
  items: WardrobeItemInput[];
  score: number;
}

export class ComboBacktrackingDomainService {

  public generateCombinations(items: WardrobeItemInput[]): CombinationResult[] {
    const tops = items.filter((i) => i.category === "TOP");
    const bottoms = items.filter((i) => i.category === "BOTTOM");
    const shoes = items.filter((i) => i.category === "SHOES");

    const results: CombinationResult[] = [];

    // Backtracking / Cartesian product search across wardrobe categories
    for (const top of tops) {
      for (const bottom of bottoms) {
        for (const shoe of shoes) {
          const comboItems = [top, bottom, shoe];
          const calculatedScore = this.evaluateColorHarmony(
            top.colorHex,
            bottom.colorHex,
          );

          results.push({
            comboId: crypto.randomUUID(),
            items: comboItems,
            score: calculatedScore,
          });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private evaluateColorHarmony(color1: string, color2: string): number {
    // Basic color scoring logic 
    if (color1 === color2) return 85; // Monochrome
    return 75; // Neutral default baseline
  }
}