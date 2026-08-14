// Evaluate verdict use case

import { IUseCase } from "../../common/use-case.interface";
import {
  EvaluateVerdictDTO,
  VerdictResponseDTO,
} from "../dtos/verdict-response.dto";
import { IOutfitRepository } from "../../../domain/outfit/repositories/outfit.repository.interface";
import { IOccasionRepository } from "../../../domain/occasion/repositories/occasion.repository.interface";
import { Outfit } from "../../../domain/outfit/aggregates/outfit.aggregate";
import { OutfitItem } from "../../../domain/outfit/entities/outfit-item.domain-entity";
import { CompatibilityScore } from "../../../domain/outfit/value-objects/compatibility-score.vo";
import { BullMQPublisher } from "../../../infrastructure/queue/bullmq-combos.publisher";

export class EvaluateVerdictUseCase implements IUseCase<
  EvaluateVerdictDTO,
  VerdictResponseDTO
> {
  constructor(
    private outfitRepo: IOutfitRepository,
    private occasionRepo: IOccasionRepository,
    private publisher: BullMQPublisher,
  ) {}

  async execute(request: EvaluateVerdictDTO): Promise<VerdictResponseDTO> {
    if (!request.occasionId) {
      throw new Error("occasionId is required to evaluate an outfit.");
    }

    const occasion = await this.occasionRepo.findById(request.occasionId);
    if (!occasion) {
      throw new Error("Occasion not found.");
    }

    const outfitItems = request.items.map((i) =>
      OutfitItem.create({
        wardrobeItemId: i.wardrobeItemId,
        itemRole: i.itemRole,
      }),
    );

    const outfit = Outfit.create({
      userId: request.userId,
      occasionId: request.occasionId,
      compatibilityScore: CompatibilityScore.create(0).getValue(),
      verdictText: "processing",
      status: "pending",
      items: outfitItems,
    });

    const savedOutfit = await this.outfitRepo.save(outfit);

    await this.publisher.publishVerdictJob({
      outfitId: savedOutfit.id,
      items: request.items.map((item) => ({
        imageUrl: item.imageUrl || "",
        category: item.itemRole,
        colorHex: item.colorHex || "",
        formalityLevel: item.formalityLevel ?? occasion.formalityLevel,
      })),
      occasion: occasion.name,
      occasionFormality: occasion.formalityLevel,
    });

    return {
      outfitId: savedOutfit.id,
      status: "processing",
    };
  }
}
