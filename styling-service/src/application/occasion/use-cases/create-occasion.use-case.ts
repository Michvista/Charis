// Create occasion use case

import { IUseCase } from "../../common/use-case.interface";
import { CreateOccasionDTO, OccasionResponseDTO } from "../dtos/occasion.dto";
import { IOccasionRepository } from "../../../domain/occasion/repositories/occasion.repository.interface";
import { Occasion } from "../../../domain/occasion/entities/occasion.domain-entity";
import { OccasionDtoMapper } from "../mappers/occasion-dto.mapper";
import { Result } from "../../../shared/domain/result";

export class CreateOccasionUseCase implements IUseCase<
  CreateOccasionDTO,
  Result<OccasionResponseDTO>
> {
  constructor(private occasionRepo: IOccasionRepository) {}

  async execute(
    request: CreateOccasionDTO,
  ): Promise<Result<OccasionResponseDTO>> {
    const existing = await this.occasionRepo.findByName(request.name);
    if (existing) {
      return Result.fail<OccasionResponseDTO>(
        "An occasion with this name already exists.",
      );
    }

    const occasion = Occasion.create({
      name: request.name,
      formalityLevel: request.formalityLevel,
    });

    const saved = await this.occasionRepo.save(occasion);
    return Result.ok<OccasionResponseDTO>(OccasionDtoMapper.toDTO(saved));
  }
}