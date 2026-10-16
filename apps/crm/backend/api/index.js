/** Re-exports esbuild output (see scripts/bundle-vercel.mjs). JS entry avoids Vercel TS7016 on ./bundle.mjs */
export { default, config } from "./bundle.mjs";
