import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let loaded = false;

/** Load `.env` from repo root when apps run with cwd in `apps/*` (npm workspaces). */
export function loadMonorepoEnv(entryImportMetaUrl: string) {
  if (loaded) return;
  loaded = true;

  let dir = dirname(fileURLToPath(entryImportMetaUrl));
  for (let depth = 0; depth < 10; depth++) {
    const envPath = join(dir, ".env");
    if (existsSync(envPath)) {
      config({ path: envPath });
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  config();
}
