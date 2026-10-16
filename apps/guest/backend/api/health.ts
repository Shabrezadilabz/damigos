export default function handler(_req: unknown, res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (b: string) => void }) {
  const hasDb = Boolean(process.env.DATABASE_URL?.trim());
  const body = {
    ok: hasDb,
    service: "guest-api",
    phase: "P0",
    dependencies: {
      database: hasDb ? "configured" : "missing_DATABASE_URL",
    },
  };
  res.statusCode = hasDb ? 200 : 503;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}
