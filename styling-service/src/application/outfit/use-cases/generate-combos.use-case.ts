// Generate combos use case

import { IUseCase } from "../../common/use-case.interface";
import {
  GenerateCombosDTO,
  GenerateCombosResponseDTO,
} from "../dtos/generate-combos.dto";
import { ComboBacktrackingDomainService } from "../../../domain/combos/domain-services/combo-backtracking.service";
import { IOccasionRepository } from "../../../domain/occasion/repositories/occasion.repository.interface";

export class GenerateCombosUseCase implements IUseCase<
  GenerateCombosDTO,
  GenerateCombosResponseDTO
> {
  private algoService: ComboBacktrackingDomainService;

  constructor(private occasionRepo?: IOccasionRepository) {
    this.algoService = new ComboBacktrackingDomainService();
  }

  async execute(request: GenerateCombosDTO): Promise<GenerateCombosResponseDTO> {
    const occasion = request.occasionId && this.occasionRepo
      ? await this.occasionRepo.findById(request.occasionId)
      : null;

    if (request.occasionId && !occasion) {
      throw new Error("Occasion not found.");
    }

    const combos = this.algoService.generateCombinations(request.items, {
      occasionFormality: occasion?.formalityLevel,
    });

    return {
      totalCombos: combos.length,
      combinations: combos,
    };
  }
}
