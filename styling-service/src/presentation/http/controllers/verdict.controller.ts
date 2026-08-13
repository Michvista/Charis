import { DolphControllerHandler } from "@dolphjs/dolph/classes";
import { Dolph, SuccessResponse } from "@dolphjs/dolph/common";
import {
  Route,
  Post,
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

    SuccessResponse({ res, body: result, status: 201 });
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
