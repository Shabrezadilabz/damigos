/** G-04.03 — mock Shiprocket until live credentials */
export type DeliveryMode = "off" | "mock";

export function deliveryMode(): DeliveryMode {
  const mode = (process.env.DELIVERY_MODE ?? "off").toLowerCase();
  if (mode === "mock") return "mock";
  return "off";
}

export const PLATFORM_DELIVERY_MARKUP_PAISE = 500;
