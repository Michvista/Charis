// Domain entity for occasion

import { BaseEntity } from "../../../shared/domain/entity.base";

export interface OccasionProps {
  name: string;
  formalityLevel: number;
}

export class Occasion extends BaseEntity<OccasionProps> {
  get name(): string {
    return this.props.name;
  }
  get formalityLevel(): number {
    return this.props.formalityLevel;
  }

  public static create(props: OccasionProps, id?: string): Occasion {
    return new Occasion(props, id);
  }
}