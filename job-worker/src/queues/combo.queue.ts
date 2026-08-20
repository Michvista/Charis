export interface ComboJobData {
  outfitId: string;
  wardrobeItems: Array<{
    id: string;
    imageUrl?: string;
    category: string;
    colorHex: string;
    formalityLevel?: number;
    seasonTags?: string[];
  }>;
  occasion: string;
  occasionFormality: number;
  targetSeason?: string;
  maxResults?: number;
}
