// Generate combos use case

import { IUseCase } from "../../common/use-case.interface";
import {
  GenerateCombosDTO,
  GenerateCombosResponseDTO,
} from "../dtos/generate-combos.dto";
import { IOccasionRepository } from "../../../domain/occasion/repositories/occasion.repository.interface";
import { IOutfitRepository } from "../../../domain/outfit/repositories/outfit.repository.interface";
import { Outfit } from "../../../domain/outfit/aggregates/outfit.aggregate";
import { OutfitItem } from "../../../domain/outfit/entities/outfit-item.domain-entity";
import { CompatibilityScore } from "../../../domain/outfit/value-objects/compatibility-score.vo";
import { BullMQPublisher } from "../../../infrastructure/queue/bullmq-combos.publisher";

export class GenerateCombosUseCase implements IUseCase<
  GenerateCombosDTO,
  GenerateCombosResponseDTO
> {
  private publisher: BullMQPublisher;

  constructor(
    private outfitRepo: IOutfitRepository,
    private occasionRepo?: IOccasionRepository,
  ) {
    this.publisher = new BullMQPublisher();
  }

  async execute(request: GenerateCombosDTO): Promise<GenerateCombosResponseDTO> {
    const occasion = request.occasionId && this.occasionRepo
      ? await this.occasionRepo.findById(request.occasionId)
      : null;

    if (request.occasionId && !occasion) {
      throw new Error("Occasion not found.");
    }

    const outfit = Outfit.create({
      userId: request.userId,
      occasionId: request.occasionId,
      compatibilityScore: CompatibilityScore.create(0).getValue(),
      verdictText: "processing",
      status: "pending",
      items: request.items.map((item) =>
        OutfitItem.create({
          wardrobeItemId: item.id,
          itemRole: item.category,
        }),
      ),
    });

    const savedOutfit = await this.outfitRepo.save(outfit);

    await this.publisher.publishComboJob({
      outfitId: savedOutfit.id,
      wardrobeItems: request.items,
      occasion: occasion?.name || "the selected occasion",
      occasionFormality: occasion?.formalityLevel ?? 3,
      targetSeason: request.targetSeason,
      maxResults: 10,
    });

    return {
      outfitId: savedOutfit.id,
      status: "processing",
    };
  }
}
