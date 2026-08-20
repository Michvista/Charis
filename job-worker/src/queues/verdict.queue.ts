export interface VerdictJobData {
  outfitId: string;
  items: Array<{
    imageUrl: string;
    category: string;
    colorHex: string;
    formalityLevel: number;
  }>;
  occasion: string;
  occasionFormality: number;
}
