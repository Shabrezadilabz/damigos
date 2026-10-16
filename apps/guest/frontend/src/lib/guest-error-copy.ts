/** G-ERR-* copy — packaging QR (not table session). See docs/gaps/GAPS-AND-FLAWS.md */

export type GuestErrorContent = {
  errId: string;
  title: string;
  body: string;
  badge?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

const DEFAULT: GuestErrorContent = {
  errId: "G-ERR-00",
  title: "Something went wrong",
  body: "We could not open this link. Try scanning the packaging QR again or browse other kitchens.",
  primaryCta: { label: "Browse kitchens", href: "/hub" },
  secondaryCta: { label: "Your orders", href: "/orders" },
};

export const SCAN_ERROR_COPY: Record<string, GuestErrorContent> = {
  STICKER_NOT_FOUND: {
    errId: "G-ERR-01",
    title: "Invalid packaging QR",
    body: "This link is not recognised. Check you scanned the sticker on your delivery bag, not a screenshot or old link.",
    badge: "Invalid",
    primaryCta: { label: "Browse kitchens", href: "/hub" },
    secondaryCta: { label: "Contact support", href: "/hub" },
  },
  STICKER_EXPIRED: {
    errId: "G-ERR-02",
    title: "This sticker batch expired",
    body: "Packaging stickers are valid for about 10–15 days after the kitchen activates a batch. Ask the restaurant for a fresh bag QR, or discover other kitchens on D'aMigo's.",
    badge: "Expired",
    primaryCta: { label: "Discover kitchens", href: "/hub" },
    secondaryCta: { label: "Your orders", href: "/orders" },
  },
  STICKER_REVOKED: {
    errId: "G-ERR-03",
    title: "Sticker no longer valid",
    body: "The restaurant or platform disabled this sticker batch. Your past orders and rewards in your profile are unchanged.",
    badge: "Revoked",
    primaryCta: { label: "Browse kitchens", href: "/hub" },
    secondaryCta: { label: "Your orders", href: "/orders" },
  },
  STICKER_CONSUMED: {
    errId: "G-ERR-04",
    title: "Sticker already used",
    body: "This packaging QR was already scanned under our single-use policy. Open your orders to reorder from the same kitchen.",
    badge: "Used",
    primaryCta: { label: "Your orders", href: "/orders" },
    secondaryCta: { label: "Discover kitchens", href: "/hub" },
  },
  STICKER_NOT_ACTIVATED: {
    errId: "G-ERR-05",
    title: "Kitchen has not activated stickers yet",
    body: "The restaurant still needs to enter their batch code in CRM Settings. Try again later or order from another kitchen.",
    badge: "Pending",
    primaryCta: { label: "Browse kitchens", href: "/hub" },
  },
  ORDERING_PAUSED: {
    errId: "G-ERR-06",
    title: "Direct ordering paused",
    body: "This kitchen is not taking delivery orders right now. You can still view the menu read-only or check back soon.",
    badge: "Paused",
    primaryCta: { label: "Your orders", href: "/orders" },
    secondaryCta: { label: "Discover kitchens", href: "/hub" },
  },
};

export function resolveGuestError(code?: string | null): GuestErrorContent {
  if (!code) return DEFAULT;
  return SCAN_ERROR_COPY[code] ?? { ...DEFAULT, body: `${DEFAULT.body} (${code})` };
}

export const PAYMENT_FAILED_COPY: GuestErrorContent = {
  errId: "G-ERR-PAY",
  title: "Payment did not go through",
  body: "Your bank or UPI app declined the payment or the session timed out. If money was debited, it is usually refunded within 24–48 hours — you will not be charged twice.",
  badge: "Failed",
  primaryCta: { label: "Try again", href: "/orders" },
  secondaryCta: { label: "Back to menu", href: "/" },
};
