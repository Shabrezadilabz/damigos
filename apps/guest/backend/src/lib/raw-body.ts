import type { FastifyInstance, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
  }
}

/** JSON parser that preserves exact bytes for HMAC webhooks (Razorpay). */
export async function registerWebhookRawBodyScope(app: FastifyInstance, routes: (scope: FastifyInstance) => Promise<void>) {
  await app.register(async (scope) => {
    scope.removeAllContentTypeParsers();
    scope.addContentTypeParser(
      "application/json",
      { parseAs: "string" },
      (request: FastifyRequest, body: string, done) => {
        request.rawBody = body;
        try {
          done(null, JSON.parse(body) as unknown);
        } catch (err) {
          const error = err instanceof Error ? err : new Error("Invalid JSON");
          (error as Error & { statusCode?: number }).statusCode = 400;
          done(error, undefined);
        }
      },
    );
    await routes(scope);
  });
}
