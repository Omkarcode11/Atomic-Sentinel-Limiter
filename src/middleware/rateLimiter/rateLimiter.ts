import type { RedisClientType } from "redis";
import type { RateLimitStrategy } from "./strategy/rateLimitStrategy.ts";
import type { NextFunction, Request, Response } from "express";
console.log("LOG: rateLimiter.ts module loaded");

export type RateLimitSchema = {
  limitBy: string; // ip, userId, brandId
  timeFrameMs: number; // hr, min, day
  limit: number; // per timeFrame 10, 30 or 100
  rateLimitStrategy: RateLimitStrategy; // pending implementing ratelimit strategy
  redisClient: any; // We use any here to support various Redis client versions/types easily
};

export function rateLimiter(conf: RateLimitSchema) {
  const config = conf;

  async function rateLimit(req: Request, res: Response, next: NextFunction) {
    console.log(
      `[RateLimiter] [${new Date().toISOString()}] Incoming request: ${req.method} ${req.url}`,
    );
    const isValidRequest = await config.rateLimitStrategy.validRequest(
      req,
      config,
    );

    if (!isValidRequest) {
      return res.status(429).send("limit exceed");
    }

    next();
  }

  return rateLimit;
}
