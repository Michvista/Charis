// Occasion DTOs

import { IsInt, IsString, Max, Min } from "class-validator";

export class CreateOccasionBodyDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  formalityLevel!: number;
}

export interface CreateOccasionDTO {
  name: string;
  formalityLevel: number;
}

export interface OccasionResponseDTO {
  id: string;
  name: string;
  formalityLevel: number;
}
