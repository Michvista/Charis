// Outfit DTO mapper

import { Outfit } from "../../../domain/outfit/aggregates/outfit.aggregate";
import { VerdictResponseDTO } from "../dtos/verdict-response.dto";

export class OutfitDtoMapper {
  public static toVerdictDTO(outfit: Outfit): VerdictResponseDTO {
    return {
      outfitId: outfit.id,
      status: outfit.status === "pending" ? "processing" : outfit.status,
      score: outfit.compatibilityScore,
      verdictText: outfit.verdictText || "",
    };
  }
}
