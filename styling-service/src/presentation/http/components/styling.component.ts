// Styling component

import { Component } from "@dolphjs/dolph/decorators";
import { VerdictController } from "../controllers/verdict.controller";
import { CombosController } from "../controllers/combos.controller";
import { TypeOrmOutfitRepository } from "../../../infrastructure/database/typeorm/repositories/typeorm-outfit.repository";
import { TypeOrmOccasionRepository } from "../../../infrastructure/database/typeorm/repositories/typeorm-occasion.repository";
import { BullMQPublisher } from "../../../infrastructure/queue/bullmq-combos.publisher";

@Component({
  controllers: [VerdictController as any, CombosController as any],
  services: [TypeOrmOutfitRepository, TypeOrmOccasionRepository, BullMQPublisher],
})
export class StylingComponent {}
