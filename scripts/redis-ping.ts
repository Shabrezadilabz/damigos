import { loadMonorepoEnv } from "@damigos/domain";
import { pingRedis } from "@damigos/kitchen-bus";

loadMonorepoEnv(import.meta.url);

const ok = await pingRedis();
if (!ok) {
  console.error("Redis unreachable. Start: docker compose up -d redis");
  process.exit(1);
}
console.log(`Redis OK (${process.env.REDIS_URL ?? "redis://localhost:6379"})`);
