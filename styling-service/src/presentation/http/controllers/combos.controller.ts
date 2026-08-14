import { DolphControllerHandler } from '@dolphjs/dolph/classes';
import { Dolph, SuccessResponse } from '@dolphjs/dolph/common';
import { Route, Post, DBody, DRes, Shield, DReq } from '@dolphjs/dolph/decorators';
import { GenerateCombosUseCase } from '../../../application/outfit/use-cases/generate-combos.use-case';
import { TypeOrmOutfitRepository } from '../../../infrastructure/database/typeorm/repositories/typeorm-outfit.repository';
import { TypeOrmOccasionRepository } from '../../../infrastructure/database/typeorm/repositories/typeorm-occasion.repository';
import { ComboBacktrackingDomainService } from '../../../domain/combos/domain-services/combo-backtracking.service';
import { authShield } from '../shields/auth.shield';

@Shield(authShield)
@Route('combos')
export class CombosController extends DolphControllerHandler<Dolph> {
  private generateUseCase: GenerateCombosUseCase;
  private comboService: ComboBacktrackingDomainService;

  constructor() {
    super();
    this.generateUseCase = new GenerateCombosUseCase(
      new TypeOrmOutfitRepository(),
      new TypeOrmOccasionRepository(),
    );
    this.comboService = new ComboBacktrackingDomainService();
  }

  @Post()
  async generateCombos(@DBody() body: any, @DReq() req: any, @DRes() res: any) {
    const userId = req.payload?.id;

    if (!userId) {
      return res.status(401).json({
        status: 'fail',
        message: 'Unauthorized: missing authenticated user',
      });
    }

    const dto = {
      userId,
      occasionId: body.occasionId,
      targetSeason: body.targetSeason,
      items: body.items || [],
    };

    const result = await this.generateUseCase.execute(dto);

    SuccessResponse({ res, body: result, status: 202 });
  }

  @Post("generate-sync")
  async generateCombosSync(@DBody() body: any, @DReq() req: any, @DRes() res: any) {
    const userId = req.payload?.id;

    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Unauthorized: missing authenticated user",
      });
    }

    if (userId !== "internal-service") {
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
