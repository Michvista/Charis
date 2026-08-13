// Value object for formality level

import { ValueObject } from "../../../shared/domain/value-object.base";
import { Result } from "../../../shared/domain/result";

interface FormalityProps {
  value: number;
}

export class FormalityLevel extends ValueObject<FormalityProps> {
  get value(): number {
    return this.props.value;
  }

  public static create(level: number): Result<FormalityLevel> {
    if (level < 1 || level > 5) {
      return Result.fail<FormalityLevel>(
        "Formality level must be between 1 (Casual) and 5 (Black Tie).",
      );
    }
    return Result.ok<FormalityLevel>(new FormalityLevel({ value: level }));
  }
}