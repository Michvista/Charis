// Compatibility score value object

import { ValueObject } from "../../../shared/domain/value-object.base";
import { Result } from "../../../shared/domain/result";

interface ScoreProps {
  score: number;
}

export class CompatibilityScore extends ValueObject<ScoreProps> {
  get value(): number {
    return this.props.score;
  }

  public static create(score: number): Result<CompatibilityScore> {
    if (typeof score !== "number" || Number.isNaN(score) || score < 0 || score > 100) {
      return Result.fail<CompatibilityScore>(
        "Score must be between 0 and 100.",
      );
    }
    return Result.ok<CompatibilityScore>(new CompatibilityScore({ score }));
  }
}
