// Occasion DTO

export interface CreateOccasionDTO {
  name: string;
  formalityLevel: number;
}

export interface OccasionResponseDTO {
  id: string;
  name: string;
  formalityLevel: number;
}