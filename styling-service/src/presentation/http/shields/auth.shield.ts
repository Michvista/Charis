// Auth shield

import jwt from "jsonwebtoken";
import { DRequest, DResponse, DNextFunc } from "@dolphjs/dolph/common";

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";
const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY || "";

export const authShield = (req: DRequest, res: DResponse, next: DNextFunc) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      status: "fail",
      message: "Unauthorized: Missing Authorization header",
    });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : authHeader.trim();

  if (!token) {
    return res.status(401).json({
      status: "fail",
      message: "Unauthorized: Empty authorization token",
    });
  }

  if (INTERNAL_API_KEY && token === INTERNAL_API_KEY) {
    (req as any).payload = { id: "internal-service" };
    return next();
  }

  if (!JWT_SECRET) {
    return res.status(500).json({
      status: "fail",
      message: "JWT secret is not configured",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    const userId = typeof decoded.sub === "string" ? decoded.sub : decoded.id;

    if (!userId || typeof userId !== "string") {
      return res.status(401).json({
        status: "fail",
        message: "Unauthorized: Token is missing a user id",
      });
    }

    (req as any).payload = {
      id: userId,
      email: typeof decoded.email === "string" ? decoded.email : undefined,
    };
    next();
  } catch {
    return res.status(401).json({
      status: "fail",
      message: "Unauthorized: Invalid token",
    });
  }
};
