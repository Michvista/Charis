// Generate combos DTO

import {
  WardrobeItemInput,
  CombinationResult,
} from "../../../domain/combos/domain-services/combo-backtracking.service";

export interface GenerateCombosDTO {
  userId: string;
  items: WardrobeItemInput[];
}

export interface GenerateCombosResponseDTO {
  totalCombos: number;
  combinations: CombinationResult[];
}