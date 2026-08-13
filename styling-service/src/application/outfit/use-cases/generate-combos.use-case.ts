// Generate combos use case

import { IUseCase } from "../../common/use-case.interface";
import {
  GenerateCombosDTO,
  GenerateCombosResponseDTO,
} from "../dtos/generate-combos.dto";
import { ComboBacktrackingDomainService } from "../../../domain/combos/domain-services/combo-backtracking.service";

export class GenerateCombosUseCase implements IUseCase<
  GenerateCombosDTO,
  GenerateCombosResponseDTO
> {
  private algoService: ComboBacktrackingDomainService;

  constructor() {
    this.algoService = new ComboBacktrackingDomainService();
  }

  execute(request: GenerateCombosDTO): GenerateCombosResponseDTO {
    const combos = this.algoService.generateCombinations(request.items);
    return {
      totalCombos: combos.length,
      combinations: combos,
    };
  }
}