// Occasion controller
import { DolphControllerHandler } from "@dolphjs/dolph/classes";
import { Dolph, SuccessResponse } from "@dolphjs/dolph/common";
import {
  Route,
  Post,
  Get,
  DBody,
  DRes,
  Shield,
} from "@dolphjs/dolph/decorators";
import { CreateOccasionUseCase } from "../../../application/occasion/use-cases/create-occasion.use-case";
import { TypeOrmOccasionRepository } from "../../../infrastructure/database/typeorm/repositories/typeorm-occasion.repository";
import { authShield } from "../shields/auth.shield";

@Shield(authShield)
@Route("occasions")
export class OccasionController extends DolphControllerHandler<Dolph> {
  private createOccasionUseCase: CreateOccasionUseCase;
  private occasionRepo: TypeOrmOccasionRepository;

  constructor() {
    super();
    this.occasionRepo = new TypeOrmOccasionRepository();
    this.createOccasionUseCase = new CreateOccasionUseCase(this.occasionRepo);
  }

  @Post()
  async create(@DBody() body: any, @DRes() res: any) {
    const result = await this.createOccasionUseCase.execute({
      name: body.name,
      formalityLevel: body.formalityLevel ?? 1,
    });

    if (result.isFailure) {
      return res.status(400).json({ status: "fail", message: result.error });
    }

    SuccessResponse({ res, body: result.getValue(), status: 201 });
  }

  @Get()
  async findAll(@DRes() res: any) {
    const occasions = await this.occasionRepo.findAll();
    SuccessResponse({ res, body: occasions });
  }
}