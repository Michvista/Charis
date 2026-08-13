import { DolphControllerHandler } from '@dolphjs/dolph/classes';
import { Dolph, SuccessResponse } from '@dolphjs/dolph/common';
import { Route, Post, DBody, DRes, Shield, DReq } from '@dolphjs/dolph/decorators';
import { GenerateCombosUseCase } from '../../../application/outfit/use-cases/generate-combos.use-case';
import { TypeOrmOccasionRepository } from '../../../infrastructure/database/typeorm/repositories/typeorm-occasion.repository';
import { authShield } from '../shields/auth.shield';

@Shield(authShield)
@Route('combos')
export class CombosController extends DolphControllerHandler<Dolph> {
  private generateUseCase: GenerateCombosUseCase;

  constructor() {
    super();
    this.generateUseCase = new GenerateCombosUseCase(new TypeOrmOccasionRepository());
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
      items: body.items || [],
    };

    const result = await this.generateUseCase.execute(dto);

    SuccessResponse({ res, body: result });
  }
}
