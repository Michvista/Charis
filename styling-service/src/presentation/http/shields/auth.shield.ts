// Auth shield

import { DRequest, DResponse, DNextFunc } from '@dolphjs/dolph/common';

export const authShield = (req: DRequest, res: DResponse, next: DNextFunc) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      status: 'fail',
      message: 'Unauthorized: Missing Authorization header',
    });
  }

  (req as any).payload = { id: 'mock-user-uuid-1234' };
  next();
};