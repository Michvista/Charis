// Occasion component

import { Component } from "@dolphjs/dolph/decorators";
import { OccasionController } from "../controllers/occasion.controller";
import { TypeOrmOccasionRepository } from "../../../infrastructure/database/typeorm/repositories/typeorm-occasion.repository";

@Component({
  controllers: [OccasionController as any],
  services: [TypeOrmOccasionRepository],
})
export class OccasionComponent {}
