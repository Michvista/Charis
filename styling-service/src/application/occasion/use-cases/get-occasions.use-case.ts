// Get occasions use case

import { IUseCase } from "../../common/use-case.interface";
import { OccasionResponseDTO } from "../dtos/occasion.dto";
import { IOccasionRepository } from "../../../domain/occasion/repositories/occasion.repository.interface";
import { OccasionDtoMapper } from "../mappers/occasion-dto.mapper";

export class GetOccasionsUseCase implements IUseCase<
  void,
  OccasionResponseDTO[]
> {
  constructor(private occasionRepo: IOccasionRepository) {}

  async execute(): Promise<OccasionResponseDTO[]> {
    const occasions = await this.occasionRepo.findAll();
    return occasions.map(OccasionDtoMapper.toDTO);
  }
}