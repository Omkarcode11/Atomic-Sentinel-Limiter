# Atomic-Sentinel-Limiter 🛡️

A production-grade, distributed rate-limiting middleware for Node.js. Architected with the **Strategy Pattern** for ultimate flexibility and powered by **Redis Lua scripts** to ensure strict atomicity against high-concurrency race conditions.

---

## 🚀 Why Atomic-Sentinel-Limiter?

Most rate limiters suffer from "Check-then-Act" race conditions. Under high load, multiple concurrent requests can bypass limits because the database check and increment aren't atomic.

**Atomic-Sentinel-Limiter solves this by:**

- **Atomic Operations:** Offloading logic to Redis Lua scripts so that no two requests can interfere with each other.
- **Distributed by Design:** Built for horizontal scaling across multiple server instances.
- **Strategy Pattern:** Easily swap between `FixedWindow`, `SlidingWindow`, or `TokenBucket` (coming soon) without changing your middleware configuration.

---

## ✨ Features

- ✅ **Strict Atomicity:** Guaranteed no leakage under high concurrency.
- ✅ **Pluggable Strategies:** Modular design using the Strategy Design Pattern.
- ✅ **Redis Backed:** Fast, distributed state management.
- ✅ **Fail-Open Support:** Built-in resilience to ensure your API stays up even if Redis is down.
- ✅ **Clean TypeScript:** Fully typed for a better developer experience.

---

## 📦 Installation

```bash
npm install express redis
```

---

## 🛠️ Quick Start

### 1. Define your Strategy

```typescript
import { FixedWindow } from "./middleware/rateLimiter/strategy/fixedWindow";
import redisClient from "./client/redisClient";

const fixedWindow = new FixedWindow();
```

### 2. Configure the Middleware

```typescript
import { rateLimiter } from "./middleware/rateLimiter/rateLimiter";

const limiter = rateLimiter({
  limitBy: "ip", // Can be 'ip', 'userId', etc.
  timeFrameMs: 60 * 1000, // 1 minute
  limit: 100, // 100 requests per minute
  rateLimitStrategy: fixedWindow,
  redisClient: redisClient,
});

app.use(limiter);
```

---

## 🔬 Technical Deep Dive: The Concurrency Problem

In a standard distributed rate limiter, the flow usually looks like this:

1. `GET count` from Redis.
2. If `count < limit`, then `INCR count`.

**The Flaw:** If 10 requests arrive at the exact same millisecond, they all might see `count = 99` and all 10 will increment, allowing 109 requests instead of 100.

### The Solution: Redis Lua Scripting

This project uses an embedded Lua script to handle the logic **inside** Redis:

```lua
local current = redis.call("GET", KEYS[1])
if current and tonumber(current) >= tonumber(ARGV[1]) then
  return 0 -- Deny
end

local new_val = redis.call("INCR", KEYS[1])
if tonumber(new_val) == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[2])
end
return 1 -- Allow
```

Since Redis is single-threaded and executes Lua scripts as a single atomic unit, it is **mathematically impossible** for race conditions to occur.

---

## 🏗️ Architecture

The project follows the **Strategy Pattern**:

- **`RateLimitStrategy` (Interface):** Defines the contract for all limiting algorithms.
- **`FixedWindow` (Class):** Implements the fixed-window counter logic.
- **`RateLimiter` (Middleware):** The core Express middleware that consumes any strategy.

---

## 🗺️ Roadmap

- [ ] **Sliding Window Log Strategy** for smoother limiting.
- [ ] **Token Bucket Strategy** for handling burst traffic.
- [ ] **Dynamic Limits** based on user tiers.

---

## 📄 License

MIT © [Omkarcode11](https://github.com/Omkarcode11)
