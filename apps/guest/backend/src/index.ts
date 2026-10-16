import { buildGuestApp } from "./build-app.js";

const port = Number(process.env.PORT ?? process.env.GUEST_API_PORT ?? 4000);
const host = process.env.GUEST_API_HOST ?? "0.0.0.0";

try {
  const app = await buildGuestApp();
  await app.listen({ port, host });
} catch (err) {
  console.error(err);
  process.exit(1);
}
