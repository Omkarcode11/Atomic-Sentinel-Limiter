import express, { type Request, type Response } from "express";
import { Worker } from "worker_threads";
import { rateLimiter } from "./middleware/rateLimiter/rateLimiter.ts";
import { FixedWindow } from "./middleware/rateLimiter/strategy/fixedWindow.ts";
import redisClient from "./client/redisClient.ts";

const fixedWindow = new FixedWindow();
const app = express();
const rateLimit = rateLimiter({
  limitBy: "ip",
  timeFrameMs: 60 * 1000, // 1 minute
  limit: 5, // 5 requests per minute
  rateLimitStrategy: fixedWindow,
  redisClient,
});

// Logging middleware with ERROR stream to avoid buffering
app.use((req, res, next) => {
  console.error(
    `[CONSOLE_CHECK] ${new Date().toISOString()} - ${req.method} ${req.url}`,
  );
  next();
});

app.use(rateLimit);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/factorial/:num", (req: Request, res: Response) => {
  let num = Number(req.params.num);
  if (isNaN(num) || num < 0) {
    res.status(400).send("Invalid number");
    return;
  }
  const fibWorker = new Worker("./src/workers/factorial");
  fibWorker.postMessage(num);

  fibWorker.once("message", (result) => {
    res.status(200).send(result);
    fibWorker.terminate();
  });

  fibWorker.once("error", (error) => {
    res.status(500).send(error);
    fibWorker.terminate();
  });
});

app.listen(3000, () => {
  redisClient.connect();
  console.log("Example app listening on port 3000!");
});
