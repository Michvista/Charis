// Verdict response DTO

export interface EvaluateVerdictDTO {
  userId: string;
  occasionId?: string;
  items: Array<{ wardrobeItemId: string; itemRole: string }>;
}

export interface VerdictResponseDTO {
  outfitId: string;
  score: number;
  verdictText: string;
}