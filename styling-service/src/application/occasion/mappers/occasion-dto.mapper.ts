// Occasion DTO mapper

import { Occasion } from "../../../domain/occasion/entities/occasion.domain-entity";
import { OccasionResponseDTO } from "../dtos/occasion.dto";

export class OccasionDtoMapper {
  public static toDTO(occasion: Occasion): OccasionResponseDTO {
    return {
      id: occasion.id,
      name: occasion.name,
      formalityLevel: occasion.formalityLevel,
    };
  }
}