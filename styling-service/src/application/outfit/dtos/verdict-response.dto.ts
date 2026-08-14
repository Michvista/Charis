// Verdict response DTO

export interface EvaluateVerdictDTO {
  userId: string;
  occasionId?: string;
  items: Array<{
    wardrobeItemId: string;
    itemRole: string;
    imageUrl?: string;
    colorHex?: string;
    formalityLevel?: number;
    seasonTags?: string[];
  }>;
}

export interface VerdictResponseDTO {
  outfitId: string;
  status: "processing" | "done" | "failed";
  score?: number;
  verdictText?: string;
}
