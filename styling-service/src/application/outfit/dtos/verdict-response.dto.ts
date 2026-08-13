// Verdict response DTO

export interface EvaluateVerdictDTO {
  userId: string;
  occasionId?: string;
  items: Array<{
    wardrobeItemId: string;
    itemRole: string;
    colorHex?: string;
    formalityLevel?: number;
    seasonTags?: string[];
  }>;
}

export interface VerdictResponseDTO {
  outfitId: string;
  score: number;
  verdictText: string;
}
