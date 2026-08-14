// Generate combos DTO

import {
  WardrobeItemInput,
  CombinationResult,
} from "../../../domain/combos/domain-services/combo-backtracking.service";

export interface GenerateCombosDTO {
  userId: string;
  occasionId?: string;
  targetSeason?: string;
  items: WardrobeItemInput[];
}

export interface GenerateCombosResponseDTO {
  outfitId: string;
  status: "processing";
}
