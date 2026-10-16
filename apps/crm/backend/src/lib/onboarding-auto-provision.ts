import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { hashPhone, phoneLast4 } from "@damigos/auth";
import { db, restaurants, userRestaurantRoles, users } from "@damigos/db";
import type { FssaiVerifyResult } from "./fssai-verify.js";
import { ensureOnboardingSchema } from "./ensure-onboarding-schema.js";

export type AutoProvisionInput = {
  legalName: string;
  operatorName: string;
  phone: string;
  email: string;
  city: string;
  cuisineTags?: string[];
  fssai?: string;
  fssaiVerification?: FssaiVerifyResult | null;
};

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

function slugify(legalName: string): string {
  const base = legalName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "outlet"}-${randomUUID().slice(0, 8)}`;
}

export function onboardingAutoApproveEnabled(): boolean {
  if (process.env.ONBOARDING_AUTO_APPROVE === "false") return false;
  if (process.env.ONBOARDING_AUTO_APPROVE === "true") return true;
  if (process.env.ENABLE_DEV_FIXTURES === "true") return true;
  const env = process.env.DAMIGOS_ENV ?? "local";
  return env !== "production";
}

export async function autoProvisionOnboardingTenant(input: AutoProvisionInput) {
  await ensureOnboardingSchema();

  const phone = normalizePhone(input.phone);
  if (phone.length < 10) {
    throw new Error("INVALID_PHONE");
  }

  const phoneHash = hashPhone(phone);
  let [user] = await db.select().from(users).where(eq(users.phoneHash, phoneHash)).limit(1);

  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        phoneHash,
        phoneLast4: phoneLast4(phone),
      })
      .returning();
  }

  const roleRows = await db
    .select()
    .from(userRestaurantRoles)
    .where(eq(userRestaurantRoles.userId, user.id));

  const existingOwner = roleRows.find((r) => r.role === "RESTAURANT_OWNER");
  if (existingOwner) {
    return {
      applicationId: randomUUID(),
      status: "ACTIVE" as const,
      restaurantId: existingOwner.restaurantId,
      phone,
      message: "This phone already has an owner account — sign in with OTP.",
    };
  }

  const now = new Date();
  const fssaiNumber =
    input.fssaiVerification?.fssaiNumber?.trim() ||
    input.fssai?.replace(/\D/g, "").slice(0, 14) ||
    null;

  const [restaurant] = await db
    .insert(restaurants)
    .values({
      name: input.legalName.trim(),
      city: input.city.trim(),
      slug: slugify(input.legalName),
      hubListed: true,
      orderingEnabled: process.env.DEV_ORDERING_ENABLED !== "false",
      onboardingCompletedAt: now,
      fssaiNumber,
      fssaiVerifiedAt: input.fssaiVerification ? now : null,
    })
    .returning({ id: restaurants.id, slug: restaurants.slug });

  await db.insert(userRestaurantRoles).values({
    userId: user.id,
    restaurantId: restaurant.id,
    role: "RESTAURANT_OWNER",
  });

  return {
    applicationId: randomUUID(),
    status: "ACTIVE" as const,
    restaurantId: restaurant.id,
    restaurantSlug: restaurant.slug,
    phone,
    message: "Tenant activated for testing — sign in with your director mobile and OTP.",
  };
}
