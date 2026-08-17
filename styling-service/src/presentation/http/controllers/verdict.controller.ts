import { DolphControllerHandler } from "@dolphjs/dolph/classes";
import { Dolph, SuccessResponse } from "@dolphjs/dolph/common";
import {
  Route,
  Post,
  Patch,
  Get,
  DRes,
  Shield,
  DReq,
} from "@dolphjs/dolph/decorators";
import { EvaluateVerdictDTO } from "../../../application/outfit/dtos/verdict-response.dto";
import { TypeOrmOutfitRepository } from "../../../infrastructure/database/typeorm/repositories/typeorm-outfit.repository";
import { TypeOrmOccasionRepository } from "../../../infrastructure/database/typeorm/repositories/typeorm-occasion.repository";
import { BullMQPublisher } from "../../../infrastructure/queue/bullmq-combos.publisher";
import { EvaluateVerdictUseCase } from "../../../application/outfit/use-cases/evaluate-verdict.use-case";
import { Outfit } from "../../../domain/outfit/aggregates/outfit.aggregate";
import { OutfitItem } from "../../../domain/outfit/entities/outfit-item.domain-entity";
import { OutfitDtoMapper } from "../../../application/outfit/mappers/outfit-dto.mapper";
import { authShield } from "../shields/auth.shield";

@Shield(authShield)
@Route("verdict")
export class VerdictController extends DolphControllerHandler<Dolph> {
  private evaluateUseCase: EvaluateVerdictUseCase;
  private outfitRepo: TypeOrmOutfitRepository;
  private occasionRepo: TypeOrmOccasionRepository;

  constructor(
    outfitRepo: TypeOrmOutfitRepository,
    occasionRepo: TypeOrmOccasionRepository,
    publisher: BullMQPublisher,
  ) {
    super();
    this.outfitRepo = outfitRepo;
    this.occasionRepo = occasionRepo;
    this.evaluateUseCase = new EvaluateVerdictUseCase(
      this.outfitRepo,
      this.occasionRepo,
      publisher,
    );
  }

  @Post()
  async evaluateOutfit(@DReq() req: any, @DRes() res: any) {
    const body = (req.body ?? {}) as EvaluateVerdictDTO;
    const userId = req.payload?.id;

    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Unauthorized: missing authenticated user",
      });
    }

    const dto: EvaluateVerdictDTO = {
      ...body,
      userId,
    };

    try {
      const result = await this.evaluateUseCase.execute(dto);
      SuccessResponse({ res, body: result, status: 202 });
    } catch (err: any) {
      console.error("evaluateOutfit error:", err);
      return res.status(400).json({
        status: "fail",
        message: err.message || "Failed to evaluate outfit verdict",
      });
    }
  }

  @Patch(":id/complete")
  async completeOutfit(@DReq() req: any, @DRes() res: any) {
    const id = req.params?.id;
    const body = req.body ?? {};
    const payloadId = req.payload?.id;
    if (payloadId !== "internal-service") {
      return res.status(403).json({
        status: "fail",
        message: "Forbidden: internal route",
      });
    }

    const outfit = await this.outfitRepo.findById(id);

    if (!outfit) {
      return res.status(404).json({ status: "fail", message: "Outfit not found" });
    }

    const completedOutfit = Outfit.create(
      {
        userId: outfit.userId,
        occasionId: outfit.occasionId,
        compatibilityScore: outfit.compatibilityScoreVO,
        verdictText: outfit.verdictText,
        status: outfit.status,
        rankedCombos: outfit.rankedCombos,
        items: outfit.items.map((item) =>
          OutfitItem.create(
            {
              wardrobeItemId: item.wardrobeItemId,
              itemRole: item.itemRole,
            },
            item.id,
          ),
        ),
      },
      outfit.id,
    );

    if (body.status === "failed") {
      completedOutfit.fail(body.errorMessage || "Outfit processing failed.");
    } else if (body.aiVerdict) {
      completedOutfit.complete({
        compatibilityScore: Number(body.aiVerdict.confidence) || 0,
        verdictText: `${body.aiVerdict.verdict}: ${body.aiVerdict.visualNotes}`,
      });
    } else if (Array.isArray(body.combos)) {
      const bestCombo = body.combos[0];
      completedOutfit.complete({
        compatibilityScore: Number(bestCombo?.finalScore ?? bestCombo?.score ?? 0),
        verdictText: bestCombo?.visualNotes || "Combo generation complete.",
        rankedCombos: body.combos.slice(0, 10),
      });
    } else {
      completedOutfit.complete({
        compatibilityScore: outfit.compatibilityScoreVO,
        verdictText: outfit.verdictText || "",
        rankedCombos: outfit.rankedCombos,
      });
    }

    const savedOutfit = await this.outfitRepo.save(completedOutfit);
    SuccessResponse({ res, body: OutfitDtoMapper.toVerdictDTO(savedOutfit) });
  }

  @Get(":id")
  async getOutfitById(@DReq() req: any, @DRes() res: any) {
    const id = req.params?.id;
    const outfit = await this.outfitRepo.findById(id);

    if (!outfit) {
      return res
        .status(404)
        .json({ status: "fail", message: "Outfit not found" });
    }

    const payloadId = req.payload?.id;
    const isInternalRequest = payloadId === "internal-service";

    if (!isInternalRequest && payloadId !== outfit.userId) {
      return res
        .status(403)
        .json({ status: "fail", message: "Forbidden: outfit does not belong to this user" });
    }

    const data = {
      outfitId: outfit.id,
      userId: outfit.userId,
      status: outfit.status,
      score: outfit.compatibilityScore,
      verdictText: outfit.verdictText,
      rankedCombos: outfit.rankedCombos,
      items: outfit.items.map((i) => ({
        wardrobeItemId: i.wardrobeItemId,
        itemRole: i.itemRole,
      })),
    };

    SuccessResponse({ res, body: data });
  }
}
