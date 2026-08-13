// Occasion component

import { Component } from "@dolphjs/dolph/decorators";
import { OccasionController } from "../controllers/occasion.controller";

@Component({
  controllers: [OccasionController],
  services: [],
})
export class OccasionComponent {}