import esbuild from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(here, "..");

await esbuild.build({
  entryPoints: [join(backendRoot, "src/vercel-handler.ts")],
  outfile: join(backendRoot, "api/bundle.mjs"),
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  logLevel: "info",
  banner: {
    js: "import { createRequire as __damigosCreateRequire } from 'node:module'; const require = __damigosCreateRequire(import.meta.url);",
  },
});

console.log("[bundle-vercel] wrote api/bundle.mjs");
