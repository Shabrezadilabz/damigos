import { isPlausibleRestaurantDisplayName, menuImportMode } from "@damigos/domain";
import { eq } from "drizzle-orm";
import {
  catalogImageForMatch,
  db,
  matchFoodCatalog,
  menuImportJobs,
  menuItems,
  restaurants,
} from "@damigos/db";

function normalizeDishKey(name: string) {
  return name
    .toLowerCase()
    .replace(/\s*\((mini|regular)\)\s*$/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
import { aiChatTimeoutMs } from "./ai/ai-fetch-timeout.js";
import { aiTextConfigured } from "./ai/ai-text.js";
import { extractMenuBrandFromImage } from "./ai/extract-menu-brand-from-image.js";
import {
  cleanDishTitle,
  dedupeMenuImportDishes,
  expandEmbeddedPriceDishes,
  isJunkMenuDishName,
} from "./ai/menu-dish-quality.js";
import { ensureBrandSchema } from "./ensure-brand-schema.js";
import {
  clampVarchar,
  mergeDescription,
  normalizeMenuItemName,
  MENU_IMPORT_FILENAME_MAX,
} from "./sanitize-menu-varchar.js";

const STALE_IMPORT_MS = Number(process.env.MENU_IMPORT_STALE_MS ?? 180_000);

export type MenuImportJobDto = {
  id: string;
  restaurantId: string;
  status: string;
  progressPct: number;
  sourceFilename: string;
  errorMessage: string | null;
  itemsCreated: number;
  createdAt: string;
  completedAt: string | null;
};

function rowToDto(row: typeof menuImportJobs.$inferSelect): MenuImportJobDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    status: row.status,
    progressPct: row.progressPct,
    sourceFilename: row.sourceFilename,
    errorMessage: row.errorMessage,
    itemsCreated: row.itemsCreated,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

const MOCK_EXTRACT_ROWS = [
  {
    name: "AI Imported Paneer Butter Masala",
    description: "Extracted from PDF (mock DeepSeek)",
    pricePaise: 28_000,
    isVeg: true,
    importConfidence: 92,
  },
  {
    name: "AI Imported Dal Tadka",
    description: "Extracted from PDF (mock DeepSeek)",
    pricePaise: 18_000,
    isVeg: true,
    importConfidence: 88,
  },
  {
    name: "AI Imported Chicken Chettinad",
    description: "Low-confidence price — review before publish",
    pricePaise: 32_000,
    isVeg: false,
    importConfidence: 55,
  },
] as const;

async function patchJob(
  jobId: string,
  patch: Partial<{
    status: string;
    progressPct: number;
    errorMessage: string | null;
    itemsCreated: number;
    completedAt: Date | null;
  }>,
) {
  await db
    .update(menuImportJobs)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(menuImportJobs.id, jobId));
}

function shouldSimulateFailure(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.includes("fail") || lower === "e2e-import-fail.pdf";
}

/** C-03.03 — mock PDF extract (live: S3 + queue + DeepSeek) */
export async function runMenuImportJob(jobId: string): Promise<void> {
  const [job] = await db.select().from(menuImportJobs).where(eq(menuImportJobs.id, jobId)).limit(1);
  if (!job || job.status !== "queued") return;

  const mode = menuImportMode();
  await patchJob(jobId, { status: "processing", progressPct: 10 });

  if (mode === "live") {
    await ensureBrandSchema();
    const dataUrl = job.sourceImageDataUrl;
    if (!dataUrl) {
      await patchJob(jobId, {
        status: "failed",
        progressPct: 100,
        errorMessage: "Live import requires imageBase64 on POST /menu/import",
        completedAt: new Date(),
      });
      return;
    }
    if (!aiTextConfigured()) {
      await patchJob(jobId, {
        status: "failed",
        progressPct: 100,
        errorMessage: "Set HIVE_API_KEY (AI_TEXT_PROVIDER=hive) or DEEPSEEK_API_KEY for MENU_IMPORT_MODE=live",
        completedAt: new Date(),
      });
      return;
    }
    try {
      await patchJob(jobId, { progressPct: 30 });
      const visionTimeoutMs = aiChatTimeoutMs();
      const progressTimer = setInterval(() => {
        void (async () => {
          const [row] = await db.select().from(menuImportJobs).where(eq(menuImportJobs.id, jobId)).limit(1);
          if (!row || row.status !== "processing") return;
          const next = Math.min(88, row.progressPct + 4);
          if (next > row.progressPct) await patchJob(jobId, { progressPct: next });
        })();
      }, 8000);

      let kit;
      try {
        kit = await extractMenuBrandFromImage(dataUrl, visionTimeoutMs);
      } finally {
        clearInterval(progressTimer);
      }

      await patchJob(jobId, { progressPct: 90 });
      const [restRow] = await db
        .select({ name: restaurants.name })
        .from(restaurants)
        .where(eq(restaurants.id, job.restaurantId))
        .limit(1);
      const displayName = isPlausibleRestaurantDisplayName(kit.displayName)
        ? kit.displayName
        : (restRow?.name ?? "Restaurant");
      const safeKit = { ...kit, displayName };
      await db
        .update(restaurants)
        .set({ brandKit: JSON.stringify(safeKit) })
        .where(eq(restaurants.id, job.restaurantId));

      let created = 0;
      const rows = dedupeMenuImportDishes(expandEmbeddedPriceDishes(kit.dishes));
      const existingRows = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.restaurantId, job.restaurantId));
      const byKey = new Map(existingRows.map((r) => [normalizeDishKey(r.name), r]));

      for (const dish of rows) {
        const titled = cleanDishTitle(dish.name);
        const { name, extraDescription } = normalizeMenuItemName(titled.name);
        if (isJunkMenuDishName(name, dish.description ?? extraDescription)) continue;
        const description = mergeDescription(dish.description ?? null, extraDescription);
        const catalogName = name.replace(/\s*\((Mini|Regular)\)\s*$/i, "").trim();
        const catalogMatch = await matchFoodCatalog(catalogName, description, dish.isVeg);
        const catalogImage = catalogImageForMatch(catalogMatch);
        const clampedName = clampVarchar(name, 250);
        const key = normalizeDishKey(clampedName);
        const prior = byKey.get(key);
        const payload = {
          name: clampedName,
          description: description ?? undefined,
          pricePaise: dish.pricePaise ?? 0,
          isVeg: titled.isVegHint ?? dish.isVeg,
          draft: true as const,
          available: true,
          importConfidence: dish.confidence ?? 80,
          importJobId: jobId,
          imageUrl: catalogImage ?? prior?.imageUrl ?? undefined,
          foodCatalogId:
            catalogImage && catalogMatch ? catalogMatch.id : prior?.foodCatalogId ?? undefined,
        };
        if (prior) {
          const [updated] = await db
            .update(menuItems)
            .set(payload)
            .where(eq(menuItems.id, prior.id))
            .returning();
          if (updated) byKey.set(key, updated);
        } else {
          const [inserted] = await db
            .insert(menuItems)
            .values({
              restaurantId: job.restaurantId,
              ...payload,
            })
            .returning();
          if (inserted) byKey.set(key, inserted);
        }
        created += 1;
        await patchJob(jobId, {
          progressPct: 30 + Math.round((created / Math.max(rows.length, 1)) * 65),
        });
      }

      await patchJob(jobId, {
        status: "completed",
        progressPct: 100,
        itemsCreated: created,
        completedAt: new Date(),
      });
    } catch (err) {
      await patchJob(jobId, {
        status: "failed",
        progressPct: 100,
        errorMessage: err instanceof Error ? err.message : "DeepSeek extract failed",
        completedAt: new Date(),
      });
    }
    return;
  }

  if (shouldSimulateFailure(job.sourceFilename)) {
    await new Promise((r) => setTimeout(r, 400));
    await patchJob(jobId, {
      status: "failed",
      progressPct: 100,
      errorMessage: "Could not parse menu PDF (mock failure for E2E)",
      completedAt: new Date(),
    });
    return;
  }

  await patchJob(jobId, { progressPct: 45 });
  await new Promise((r) => setTimeout(r, 300));

  let created = 0;
  const existingMock = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.restaurantId, job.restaurantId));
  const mockByKey = new Map(existingMock.map((r) => [normalizeDishKey(r.name), r]));
  for (const row of MOCK_EXTRACT_ROWS) {
    const key = normalizeDishKey(row.name);
    const prior = mockByKey.get(key);
    const payload = {
      name: row.name,
      description: row.description,
      pricePaise: row.pricePaise,
      isVeg: row.isVeg,
      draft: true as const,
      importConfidence: row.importConfidence,
      importJobId: jobId,
    };
    if (prior) {
      await db.update(menuItems).set(payload).where(eq(menuItems.id, prior.id));
    } else {
      await db.insert(menuItems).values({
        restaurantId: job.restaurantId,
        ...payload,
      });
    }
    created += 1;
    await patchJob(jobId, { progressPct: 45 + Math.round((created / MOCK_EXTRACT_ROWS.length) * 50) });
  }

  await patchJob(jobId, {
    status: "completed",
    progressPct: 100,
    itemsCreated: created,
    completedAt: new Date(),
  });
}

export function enqueueMenuImportJob(jobId: string) {
  setImmediate(() => {
    void runMenuImportJob(jobId).catch((err) => {
      console.error("[menu-import]", jobId, err);
      void patchJob(jobId, {
        status: "failed",
        progressPct: 100,
        errorMessage: err instanceof Error ? err.message : "Import worker error",
        completedAt: new Date(),
      });
    });
  });
}

export async function createMenuImportJob(
  restaurantId: string,
  sourceFilename: string,
  sourceImageDataUrl?: string | null,
): Promise<MenuImportJobDto> {
  await ensureBrandSchema();
  const [row] = await db
    .insert(menuImportJobs)
    .values({
      restaurantId,
      sourceFilename: clampVarchar(sourceFilename, MENU_IMPORT_FILENAME_MAX),
      sourceImageDataUrl: sourceImageDataUrl ?? null,
      status: "queued",
      progressPct: 0,
    })
    .returning();

  enqueueMenuImportJob(row.id);
  return rowToDto(row);
}

async function failStaleJobIfNeeded(row: typeof menuImportJobs.$inferSelect): Promise<typeof menuImportJobs.$inferSelect> {
  if (row.status !== "processing" && row.status !== "queued") return row;
  const ageMs = Date.now() - row.updatedAt.getTime();
  if (ageMs < STALE_IMPORT_MS) return row;
  await patchJob(row.id, {
    status: "failed",
    progressPct: 100,
    errorMessage:
      "Import stalled — vision did not finish in time. Restart CRM API and retry with a smaller menu photo.",
    completedAt: new Date(),
  });
  const [fresh] = await db.select().from(menuImportJobs).where(eq(menuImportJobs.id, row.id)).limit(1);
  return fresh ?? row;
}

export async function getMenuImportJob(jobId: string): Promise<MenuImportJobDto | null> {
  const [row] = await db.select().from(menuImportJobs).where(eq(menuImportJobs.id, jobId)).limit(1);
  if (!row) return null;
  const reconciled = await failStaleJobIfNeeded(row);
  return rowToDto(reconciled);
}

export async function listMenuImportReviewItems(jobId: string) {
  return db.select().from(menuItems).where(eq(menuItems.importJobId, jobId));
}
