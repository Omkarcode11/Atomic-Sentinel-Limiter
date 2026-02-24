import type { RedisClientType } from "redis";
import type { Request } from "express";
import type { RateLimitSchema } from "../rateLimiter.ts";

export interface RateLimitStrategy {
  validRequest(req: Request, config: RateLimitSchema): Promise<boolean>;
}
