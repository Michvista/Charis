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
      console.warn("Occasions database query error:", err);
      SuccessResponse({ res, body: [] });
    }
  }
}
