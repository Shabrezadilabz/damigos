/** Fast health for Vercel (no full Fastify boot). */
export default function handler(_req: unknown, res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (b: string) => void }) {
  const hasDb = Boolean(process.env.DATABASE_URL?.trim());
  const provider = process.env.AI_TEXT_PROVIDER ?? "hive";
  const hasHive = Boolean(process.env.HIVE_API_KEY?.trim());
  const hasDeepseek = Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  const textConfigured = provider === "hive" ? hasHive : hasDeepseek;

  const body = {
    ok: hasDb,
    service: "crm-api",
    dependencies: {
      database: hasDb ? "configured" : "missing_DATABASE_URL",
    },
    ai: {
      textConfigured,
      menuImportMode: process.env.MENU_IMPORT_MODE ?? "mock",
      provider,
    },
  };
  res.statusCode = hasDb ? 200 : 503;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}
