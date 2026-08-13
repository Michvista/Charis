// User decorator

import { DPayload } from "@dolphjs/dolph/decorators";

export interface AuthenticatedUserPayload {
  sub: string; // User ID
  email?: string;
}

export function getUserFromReq(req: any): AuthenticatedUserPayload | null {
  return null;
}
