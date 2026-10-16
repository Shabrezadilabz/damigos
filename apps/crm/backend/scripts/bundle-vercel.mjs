import esbuild from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(here, "..");

const shared = {
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  logLevel: "info",
  banner: {
    js: "import { createRequire as __damigosCreateRequire } from 'node:module'; const require = __damigosCreateRequire(import.meta.url);",
  },
};

await esbuild.build({
  ...shared,
  entryPoints: [join(backendRoot, "src/vercel-handler.ts")],
  outfile: join(backendRoot, "api/bundle.mjs"),
  external: ["@fastify/websocket"],
});

await esbuild.build({
  ...shared,
  entryPoints: [join(backendRoot, "src/vercel-otp-verify.ts")],
  outfile: join(backendRoot, "api/otp-verify-bundle.mjs"),
});

console.log("[bundle-vercel] wrote api/bundle.mjs + api/otp-verify-bundle.mjs");
