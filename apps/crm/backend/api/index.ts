import type { IncomingMessage, ServerResponse } from "node:http";
import serverless from "serverless-http";
import { buildCrmApp } from "../src/build-app.js";

type ServerlessHandler = (req: IncomingMessage, res: ServerResponse) => void;

let cached: ServerlessHandler | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!cached) {
    const app = await buildCrmApp({ serverless: true });
    cached = serverless(app.server) as ServerlessHandler;
  }
  return cached(req, res);
}

export const config = {
  maxDuration: 60,
};
