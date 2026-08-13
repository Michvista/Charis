// Evaluate verdict use case

import { IUseCase } from "../../common/use-case.interface";
import {
  EvaluateVerdictDTO,
  VerdictResponseDTO,
} from "../dtos/verdict-response.dto";
import { CompatibilityGraphDomainService } from "../../../domain/verdict/domain-services/compatibility-graph.service";
import { IOutfitRepository } from "../../../domain/outfit/repositories/outfit.repository.interface";
import { Outfit } from "../../../domain/outfit/aggregates/outfit.aggregate";
import { OutfitItem } from "../../../domain/outfit/entities/outfit-item.domain-entity";
import { OutfitDtoMapper } from "../mappers/outfit-dto.mapper";

export class EvaluateVerdictUseCase implements IUseCase<
  EvaluateVerdictDTO,
  VerdictResponseDTO
> {
  private graphService: CompatibilityGraphDomainService;

  constructor(private outfitRepo: IOutfitRepository) {
    this.graphService = new CompatibilityGraphDomainService();
  }

  async execute(request: EvaluateVerdictDTO): Promise<VerdictResponseDTO> {
    const evaluation = this.graphService.evaluateOutfit({
      itemIds: request.items.map((i) => i.wardrobeItemId),
      occasionFormality: 3,
    });

    const outfitItems = request.items.map((i) =>
      OutfitItem.create({
        wardrobeItemId: i.wardrobeItemId,
        itemRole: i.itemRole,
      }),
    );

    const outfit = Outfit.create({
      userId: request.userId,
      occasionId: request.occasionId,
      compatibilityScore: evaluation.score,
      verdictText: evaluation.verdictText,
      items: outfitItems,
    });

    const savedOutfit = await this.outfitRepo.save(outfit);
    return OutfitDtoMapper.toVerdictDTO(savedOutfit);
  }
}