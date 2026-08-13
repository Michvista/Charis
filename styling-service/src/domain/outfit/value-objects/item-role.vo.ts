// Item role value object

import { ValueObject } from "../../../shared/domain/value-object.base";
import { Result } from "../../../shared/domain/result";

export type AllowedRole =
  | "TOP"
  | "BOTTOM"
  | "SHOES"
  | "OUTERWEAR"
  | "ACCESSORY";

interface RoleProps {
  role: AllowedRole;
}

export class ItemRole extends ValueObject<RoleProps> {
  get value(): AllowedRole {
    return this.props.role;
  }

  public static create(role: string): Result<ItemRole> {
    const validRoles: AllowedRole[] = [
      "TOP",
      "BOTTOM",
      "SHOES",
      "OUTERWEAR",
      "ACCESSORY",
    ];
    const uppercaseRole = role.toUpperCase() as AllowedRole;

    if (!validRoles.includes(uppercaseRole)) {
      return Result.fail<ItemRole>(
        `Invalid item role. Allowed: ${validRoles.join(", ")}`,
      );
    }
    return Result.ok<ItemRole>(new ItemRole({ role: uppercaseRole }));
  }
}