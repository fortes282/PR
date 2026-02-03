import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { store } from "../store.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

export interface JwtPayload {
  userId: string;
  role: string;
}

export function signToken(payload: JwtPayload, expiresInSeconds = 3600): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresInSeconds });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    const user = store.users.get(payload.userId);
    if (!user || !user.active) {
      throw new UnauthorizedError("User not found or inactive");
    }
    request.user = { userId: payload.userId, role: payload.role };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError("Invalid or expired token");
  }
}
