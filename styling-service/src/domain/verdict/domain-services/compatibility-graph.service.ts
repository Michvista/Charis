// Compatibility graph domain service

export interface VerdictInput {
  itemIds: string[];
  occasionFormality: number;
}

export interface VerdictOutput {
  score: number;
  verdictText: string;
}

export class CompatibilityGraphDomainService {
 
    // checks outfit completeness and appropriateness against an occasion score
  public evaluateOutfit(input: VerdictInput): VerdictOutput {
    let score = 70;
    let comments: string[] = [];

    if (input.itemIds.length >= 3) {
      score += 15;
      comments.push("Outfit includes top, bottom, and footwear.");
    } else {
      score -= 20;
      comments.push("Outfit is missing key wardrobe pieces.");
    }

    if (input.occasionFormality >= 4) {
      score += 10;
      comments.push("Matches high-formality requirements.");
    }

    const finalScore = Math.min(100, Math.max(0, score));

    return {
      score: finalScore,
      verdictText: comments.join(" "),
    };
  }
}