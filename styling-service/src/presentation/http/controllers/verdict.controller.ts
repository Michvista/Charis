import { DolphControllerHandler } from "@dolphjs/dolph/classes";
import { Dolph, SuccessResponse } from "@dolphjs/dolph/common";
import {
  Route,
  Post,
  Patch,
  Get,
  DBody,
  DParam,
  DRes,
  Shield,
  DReq,
} from "@dolphjs/dolph/decorators";
import { TypeOrmOutfitRepository } from "../../../infrastructure/database/typeorm/repositories/typeorm-outfit.repository";
import { TypeOrmOccasionRepository } from "../../../infrastructure/database/typeorm/repositories/typeorm-occasion.repository";
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

  constructor() {
    super();
    this.outfitRepo = new TypeOrmOutfitRepository();
    this.occasionRepo = new TypeOrmOccasionRepository();
    this.evaluateUseCase = new EvaluateVerdictUseCase(
      this.outfitRepo,
      this.occasionRepo,
    );
  }

  @Post()
  async evaluateOutfit(@DBody() body: any, @DReq() req: any, @DRes() res: any) {
    const userId = req.payload?.id;

    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Unauthorized: missing authenticated user",
      });
    }

    const dto = {
      userId,
      occasionId: body.occasionId,
      items: body.items || [],
    };

    const result = await this.evaluateUseCase.execute(dto);

    SuccessResponse({ res, body: result, status: 202 });
  }

  @Patch(":id/complete")
  async completeOutfit(@DParam("id") id: string, @DBody() body: any, @DReq() req: any, @DRes() res: any) {
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

    let compatibilityScore = outfit.compatibilityScore;
    let verdictText = outfit.verdictText || "";
    let status: "pending" | "done" | "failed" = body.status || "done";

    if (body.aiVerdict) {
      compatibilityScore = Number(body.aiVerdict.confidence) || 0;
      verdictText = `${body.aiVerdict.verdict}: ${body.aiVerdict.visualNotes}`;
    } else if (Array.isArray(body.combos)) {
      const bestCombo = body.combos[0];
      if (bestCombo) {
        compatibilityScore = Number(bestCombo.finalScore ?? bestCombo.score ?? 0);
        verdictText = bestCombo.visualNotes || "Combo generation complete.";
      }
    }

    const completedOutfit = Outfit.create({
      userId: outfit.userId,
      occasionId: outfit.occasionId,
      compatibilityScore,
      verdictText,
      status,
      items: outfit.items.map((item) =>
        OutfitItem.create(
          {
            wardrobeItemId: item.wardrobeItemId,
            itemRole: item.itemRole,
          },
          item.id,
        ),
      ),
    }, outfit.id);

    const savedOutfit = await this.outfitRepo.save(completedOutfit);
    SuccessResponse({ res, body: OutfitDtoMapper.toVerdictDTO(savedOutfit) });
  }

  @Get(":id")
  async getOutfitById(@DParam("id") id: string, @DReq() req: any, @DRes() res: any) {
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
      items: outfit.items.map((i) => ({
        wardrobeItemId: i.wardrobeItemId,
        itemRole: i.itemRole,
      })),
    };

    SuccessResponse({ res, body: data });
  }
}
