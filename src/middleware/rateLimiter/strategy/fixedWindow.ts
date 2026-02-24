import type { Request } from "express";
import type { RateLimitStrategy } from "./rateLimitStrategy.ts";
import type { RedisClientType } from "redis";
import type { RateLimitSchema } from "../rateLimiter.ts";

/**
 * FixedWindow Strategy
 *
 * Logic 
 * Uses a Redis Lua script to ensure atomicity. This prevents race conditions
 * where multiple concurrent requests might bypass the limit before the key is updated.
 */
export class FixedWindow implements RateLimitStrategy {
  async validRequest(req: Request, config: RateLimitSchema): Promise<boolean> {
    const key = config.limitBy;
    // Safely extract the identifier (IP, userId, etc.)
    const identifier = (req as any)[key] || req.ip || "anonymous";
    const redis = config.redisClient as RedisClientType;
    const { timeFrameMs, limit } = config;

    const bucketKey = `rate_limit:${key}:${identifier}`;

    /**
     * LUA Script Explanation:
     * 1. Check if key exists.
     * 2. If it exists and value >= limit, return 0 (Deny).
     * 3. If it doesn't exist, set it to 1 and set expiry.
     * 4. If it exists, increment it.
     * 5. Return 1 (Allow).
     */
    const luaScript = `
      local current = redis.call("GET", KEYS[1])
      if current and tonumber(current) >= tonumber(ARGV[1]) then
        return 0
      end
      
      local new_val = redis.call("INCR", KEYS[1])
      if tonumber(new_val) == 1 then
        redis.call("PEXPIRE", KEYS[1], ARGV[2])
      end
      return 1
    `;

    try {
      const result = await redis.eval(luaScript, {
        keys: [bucketKey],
        arguments: [limit.toString(), timeFrameMs.toString()],
      });

      return result === 1;
    } catch (error) {
      console.error("[RateLimiter] Redis error:", error); 
      return true;
    }
  }
}
