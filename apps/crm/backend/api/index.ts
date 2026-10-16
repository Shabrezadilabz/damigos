import serverless from "serverless-http";
import { buildCrmApp } from "../src/build-app.js";

type ServerlessHandler = ReturnType<typeof serverless>;

let cached: ServerlessHandler | null = null;

export default async function handler(req: unknown, res: unknown) {
  if (!cached) {
    const app = await buildCrmApp({ serverless: true });
    cached = serverless(app.server);
  }
  return cached(req as never, res as never);
}

export const config = {
  maxDuration: 60,
};
