// Occasion controller
import { DolphControllerHandler } from "@dolphjs/dolph/classes";
import { Dolph, SuccessResponse } from "@dolphjs/dolph/common";
import {
  Route,
  Post,
  Get,
  DRes,
  Shield,
  DBody,
} from "@dolphjs/dolph/decorators";
import {
  CreateOccasionBodyDto,
  CreateOccasionDTO,
} from "../../../application/occasion/dtos/occasion.dto";
import { CreateOccasionUseCase } from "../../../application/occasion/use-cases/create-occasion.use-case";
import { TypeOrmOccasionRepository } from "../../../infrastructure/database/typeorm/repositories/typeorm-occasion.repository";
import { authShield } from "../shields/auth.shield";

@Shield(authShield)
@Route("occasions")
export class OccasionController extends DolphControllerHandler<Dolph> {
  private createOccasionUseCase: CreateOccasionUseCase;
  private occasionRepo: TypeOrmOccasionRepository;

  constructor(occasionRepo: TypeOrmOccasionRepository) {
    super();
    this.occasionRepo = occasionRepo;
    this.createOccasionUseCase = new CreateOccasionUseCase(this.occasionRepo);
  }

  @Post()
  async create(
    @DBody(CreateOccasionBodyDto)
    body: CreateOccasionBodyDto,
    @DRes() res: any,
  ) {
    const request = body as unknown as CreateOccasionDTO;
    const result = await this.createOccasionUseCase.execute(request);

    if (result.isFailure) {
      return res.status(400).json({ status: "fail", message: result.error });
    }

    SuccessResponse({ res, body: result.getValue(), status: 201 });
  }

  @Get()
  async findAll(@DRes() res: any) {
    try {
      const occasions = await this.occasionRepo.findAll();
      SuccessResponse({ res, body: occasions });
    } catch (err) {
      console.warn("Occasions database query error, returning default fallback occasions:", err);
      const fallbackOccasions = [
        { id: "occ-1", name: "Formal Dinner / Gallery Opening", formalityLevel: 4 },
        { id: "occ-2", name: "Casual Weekend / City Exploring", formalityLevel: 2 },
        { id: "occ-3", name: "Executive Meeting / Business Formal", formalityLevel: 5 },
        { id: "occ-4", name: "Smart Casual / Cocktail Hour", formalityLevel: 3 },
      ];
      SuccessResponse({ res, body: fallbackOccasions });
    }
  }
}
