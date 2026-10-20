import { isPlausibleRestaurantDisplayName } from "@damigos/domain";
import { z } from "zod";

export const brandDishSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  pricePaise: z.number().int().min(0),
  isVeg: z.boolean(),
  category: z.string().optional().nullable(),
  confidence: z.number().int().min(0).max(100).optional(),
});

export const restaurantBrandKitSchema = z.object({
  displayName: z.string().min(1),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  logoDataUrl: z.string().optional().nullable(),
  logoNotes: z.string().optional().nullable(),
  dishes: z.array(brandDishSchema),
  extractedAt: z.string(),
  model: z.string(),
});

export type RestaurantBrandKit = z.infer<typeof restaurantBrandKitSchema>;

export function parseBrandKit(raw: string | null | undefined): RestaurantBrandKit | null {
  if (!raw) return null;
  try {
    return restaurantBrandKitSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function brandKitForGuest(kit: RestaurantBrandKit | null) {
  if (!kit) return null;
  if (!isPlausibleRestaurantDisplayName(kit.displayName)) return null;
  return {
    displayName: kit.displayName,
    primaryColor: kit.primaryColor,
    backgroundColor: kit.backgroundColor,
    accentColor: kit.accentColor,
    logoDataUrl: kit.logoDataUrl ?? null,
  };
}
