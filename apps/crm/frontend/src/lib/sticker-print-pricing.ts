/** Physical sticker print & ship quote (owner CRM). */

export const STICKER_UNIT_PAISE = 100; // ₹1 per sticker
/** GST on (stickers + delivery) — 18% */
export const STICKER_GST_RATE = 0.18;
/** Flat courier to kitchen (Bangalore pilot) */
export const STICKER_DELIVERY_PAISE = 4900; // ₹49

export type StickerPrintQuote = {
  quantity: number;
  unitPaise: number;
  stickersPaise: number;
  deliveryPaise: number;
  taxablePaise: number;
  gstPaise: number;
  gstRate: number;
  totalPaise: number;
};

export function quoteStickerPrint(quantity: number): StickerPrintQuote {
  const qty = Math.max(1, Math.min(2000, Math.floor(quantity) || 1));
  const stickersPaise = qty * STICKER_UNIT_PAISE;
  const deliveryPaise = STICKER_DELIVERY_PAISE;
  const taxablePaise = stickersPaise + deliveryPaise;
  const gstPaise = Math.round(taxablePaise * STICKER_GST_RATE);
  return {
    quantity: qty,
    unitPaise: STICKER_UNIT_PAISE,
    stickersPaise,
    deliveryPaise,
    taxablePaise,
    gstPaise,
    gstRate: STICKER_GST_RATE,
    totalPaise: taxablePaise + gstPaise,
  };
}
