// Styling component

import { Component } from "@dolphjs/dolph/decorators";
import { VerdictController } from "../controllers/verdict.controller";
import { CombosController } from "../controllers/combos.controller";

@Component({
  controllers: [VerdictController, CombosController],
  services: [],
})
export class StylingComponent {}