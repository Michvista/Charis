import { DolphControllerHandler } from '@dolphjs/dolph/classes';
import { Dolph, SuccessResponse } from '@dolphjs/dolph/common';
import { Route, Post, DRes, Shield, DReq } from '@dolphjs/dolph/decorators';
import { GenerateCombosDTO } from '../../../application/outfit/dtos/generate-combos.dto';
import { GenerateCombosUseCase } from '../../../application/outfit/use-cases/generate-combos.use-case';
import { TypeOrmOutfitRepository } from '../../../infrastructure/database/typeorm/repositories/typeorm-outfit.repository';
import { TypeOrmOccasionRepository } from '../../../infrastructure/database/typeorm/repositories/typeorm-occasion.repository';
import { BullMQPublisher } from '../../../infrastructure/queue/bullmq-combos.publisher';
import { ComboBacktrackingDomainService } from '../../../domain/combos/domain-services/combo-backtracking.service';
import { authShield } from '../shields/auth.shield';

@Shield(authShield)
@Route('combos')
export class CombosController extends DolphControllerHandler<Dolph> {
  private generateUseCase: GenerateCombosUseCase;
  private comboService: ComboBacktrackingDomainService;

  constructor(
    outfitRepo: TypeOrmOutfitRepository,
    occasionRepo: TypeOrmOccasionRepository,
    publisher: BullMQPublisher,
  ) {
    super();
    this.generateUseCase = new GenerateCombosUseCase(outfitRepo, occasionRepo, publisher);
    this.comboService = new ComboBacktrackingDomainService();
  }

  @Post()
  async generateCombos(@DReq() req: any, @DRes() res: any) {
    let userId = req.payload?.id;
    if (!userId) {
      return res.status(401).json({
        status: 'fail',
        message: 'Unauthorized: missing authenticated user',
      });
    }

    if (userId === "internal-service") {
      userId = (req.body && typeof req.body.userId === "string" && req.body.userId) || "00000000-0000-0000-0000-000000000000";
    }

    const body = req.body ?? {};
    const dto: GenerateCombosDTO = {
      ...body,
      userId,
    };

    try {
      const result = await this.generateUseCase.execute(dto);
      SuccessResponse({ res, body: result, status: 202 });
    } catch (err: any) {
      console.error("generateCombos error:", err);
      return res.status(400).json({
        status: "fail",
        message: err.message || "Failed to generate outfit combinations",
      });
    }
  }

  @Post("generate-sync")
  async generateCombosSync(@DReq() req: any, @DRes() res: any) {
    const body = req.body ?? {};
    const userId = req.payload?.id;

    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Unauthorized: missing authenticated user",
      });
    }

    const isInternal = req.payload?.isInternal || userId === "internal-service";
    if (!isInternal) {
      return res.status(403).json({
        status: "fail",
        message: "Forbidden: internal route",
      });
    }

    const combos = this.comboService.generateCombinations(body.wardrobeItems || body.items || [], {
      occasionFormality: body.occasionFormality,
      targetSeason: body.targetSeason,
      maxResults: body.maxResults ?? 10,
    });

    SuccessResponse({
      res,
      body: {
        combinations: combos,
        status: "done",
      },
    });
  }
}
