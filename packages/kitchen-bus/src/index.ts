import { createClient, type RedisClientType } from "redis";



const CHANNEL_PREFIX = "damigos:kitchen:";



function redisUrl() {

  return process.env.REDIS_URL ?? "redis://localhost:6379";

}



let publisher: RedisClientType | null = null;



async function getPublisher() {

  if (!publisher) {

    publisher = createClient({ url: redisUrl() });

    publisher.on("error", () => undefined);

    await publisher.connect();

  }

  return publisher;

}



/** Notify CRM kitchen boards to reload orders for a restaurant. */

export async function publishKitchenRefresh(restaurantId: string) {

  try {

    const client = await getPublisher();

    await client.publish(`${CHANNEL_PREFIX}${restaurantId}`, String(Date.now()));

  } catch {

    // Redis optional when not running

  }

}



/** Ping Redis for health checks and local dev scripts. */

export async function pingRedis(timeoutMs = 2000): Promise<boolean> {

  const client = createClient({ url: redisUrl() });

  client.on("error", () => undefined);

  let timer: ReturnType<typeof setTimeout> | undefined;

  try {

    await Promise.race([

      (async () => {

        await client.connect();

        const pong = await client.ping();

        if (pong !== "PONG") throw new Error("bad_ping");

      })(),

      new Promise<void>((_, reject) => {

        timer = setTimeout(() => reject(new Error("redis_ping_timeout")), timeoutMs);

      }),

    ]);

    return true;

  } catch {

    return false;

  } finally {

    if (timer) clearTimeout(timer);

    try {

      if (client.isOpen) await client.quit();

    } catch {

      // ignore

    }

  }

}



export async function subscribeKitchenRefresh(

  restaurantId: string,

  onRefresh: () => void,

): Promise<() => Promise<void>> {

  const sub = createClient({ url: redisUrl() });

  sub.on("error", () => undefined);

  await sub.connect();

  const channel = `${CHANNEL_PREFIX}${restaurantId}`;

  await sub.subscribe(channel, () => onRefresh());

  return async () => {

    await sub.unsubscribe(channel);

    await sub.quit();

  };

}


