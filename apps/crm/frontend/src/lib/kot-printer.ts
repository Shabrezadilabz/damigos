"use client";

import { encodeKotEscPos, encodeTestPage, type KotTicketInput } from "@/lib/escpos-kot";
import type { CrmOrder } from "@/lib/api";

const STORAGE_KEY = "damigos_kot_printer_v1";

export type KotPrinterPrefs = {
  vendorId: number;
  productId: number;
  productName: string;
  paperMm: 58 | 80;
  autoPrintOnAccept: boolean;
  connectedAt: string;
};

type UsbDeviceLike = USBDevice;

let cachedDevice: UsbDeviceLike | null = null;

function usbAvailable() {
  return typeof navigator !== "undefined" && !!navigator.usb;
}

export function readKotPrinterPrefs(): KotPrinterPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as KotPrinterPrefs;
  } catch {
    return null;
  }
}

export function writeKotPrinterPrefs(prefs: KotPrinterPrefs | null) {
  if (typeof window === "undefined") return;
  if (!prefs) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

/** Filters covering Epson, Star, TVS-class, and common ESC/POS clone vendors + printer class. */
const USB_FILTERS: USBDeviceFilter[] = [
  { classCode: 7 }, // Printer class
  { vendorId: 0x04b8 }, // Epson
  { vendorId: 0x0519 }, // Star Micronics
  { vendorId: 0x0dd4 }, // Custom Engineering
  { vendorId: 0x154f }, // Wincor Nixdorf / some POS
  { vendorId: 0x0483 }, // ST / many clones
  { vendorId: 0x0416 }, // Winbond / clones
  { vendorId: 0x1a86 }, // QinHeng (CH340 bridges on clones)
  { vendorId: 0x067b }, // Prolific
  { vendorId: 0x0525 }, // Netchip / some POS
  { vendorId: 0x1504 }, // Some Rongta / Chinese ESC-POS
  { vendorId: 0x6868 }, // Generic POS
  { vendorId: 0x20d1 }, // Some thermal clones
];

async function openDevice(device: UsbDeviceLike) {
  if (!device.opened) await device.open();
  if (device.configuration == null) await device.selectConfiguration(1);

  const iface =
    device.configuration?.interfaces.find((i) =>
      i.alternates.some((a) => a.endpoints.some((e) => e.direction === "out")),
    ) ?? device.configuration?.interfaces[0];

  if (!iface) throw new Error("No USB interface found on printer");

  try {
    if (!iface.claimed) await device.claimInterface(iface.interfaceNumber);
  } catch {
    // Already claimed or OS driver holds it — try detach on Linux; Windows may need Zadig
    try {
      await device.claimInterface(iface.interfaceNumber);
    } catch (e) {
      throw new Error(
        e instanceof Error
          ? e.message
          : "Could not claim printer USB interface. Close other POS apps using it.",
      );
    }
  }

  const alternate = iface.alternates[0];
  const endpoint = alternate?.endpoints.find((e) => e.direction === "out" && e.type === "bulk");
  if (!endpoint) throw new Error("Printer has no USB OUT endpoint");

  return { interfaceNumber: iface.interfaceNumber, endpointNumber: endpoint.endpointNumber };
}

async function transfer(device: UsbDeviceLike, data: Uint8Array) {
  const { endpointNumber } = await openDevice(device);
  const CHUNK = 512;
  for (let i = 0; i < data.length; i += CHUNK) {
    const slice = data.subarray(i, Math.min(i + CHUNK, data.length));
    // Copy into a fresh ArrayBuffer so TS BufferSource matches WebUSB typings
    const chunk = new Uint8Array(slice);
    await device.transferOut(endpointNumber, chunk);
  }
}

export async function connectKotPrinter(): Promise<KotPrinterPrefs> {
  if (!usbAvailable()) {
    throw new Error("WebUSB not supported. Use Chrome/Edge on desktop (HTTPS).");
  }
  const device = await navigator.usb.requestDevice({ filters: USB_FILTERS });
  await openDevice(device);
  cachedDevice = device;
  const prefs: KotPrinterPrefs = {
    vendorId: device.vendorId,
    productId: device.productId,
    productName: device.productName || device.manufacturerName || "ESC/POS printer",
    paperMm: 80,
    autoPrintOnAccept: true,
    connectedAt: new Date().toISOString(),
  };
  writeKotPrinterPrefs(prefs);
  return prefs;
}

export async function disconnectKotPrinter() {
  const prefs = readKotPrinterPrefs();
  if (cachedDevice?.opened) {
    try {
      await cachedDevice.close();
    } catch {
      /* ignore */
    }
  }
  cachedDevice = null;
  writeKotPrinterPrefs(null);
  return prefs;
}

export async function resolveKotDevice(): Promise<UsbDeviceLike | null> {
  if (!usbAvailable()) return null;
  const prefs = readKotPrinterPrefs();
  if (!prefs) return null;

  if (
    cachedDevice &&
    cachedDevice.vendorId === prefs.vendorId &&
    cachedDevice.productId === prefs.productId
  ) {
    return cachedDevice;
  }

  const devices = await navigator.usb.getDevices();
  const match = devices.find(
    (d) => d.vendorId === prefs.vendorId && d.productId === prefs.productId,
  );
  if (!match) return null;
  cachedDevice = match;
  return match;
}

export async function isKotPrinterReady(): Promise<boolean> {
  try {
    return (await resolveKotDevice()) != null;
  } catch {
    return false;
  }
}

export class KotPrinterNotConnectedError extends Error {
  constructor(message = "No printer connected") {
    super(message);
    this.name = "KotPrinterNotConnectedError";
  }
}

export async function printEscPosBytes(data: Uint8Array) {
  const device = await resolveKotDevice();
  if (!device) throw new KotPrinterNotConnectedError();
  try {
    await transfer(device, data);
  } catch (e) {
    cachedDevice = null;
    throw e instanceof Error ? e : new Error("Print failed");
  }
}

export async function printKotTest() {
  const prefs = readKotPrinterPrefs();
  await printEscPosBytes(encodeTestPage(prefs?.paperMm ?? 80));
}

export function orderToKotTicket(
  order: CrmOrder,
  restaurantName: string,
  paperMm: 58 | 80 = 80,
): KotTicketInput {
  return {
    restaurantName,
    orderId: order.id,
    createdAt: order.createdAt,
    prepMinutes: order.suggestedPrepMinutes ?? order.committedPrepMinutes ?? null,
    customerPhoneLast4: order.customerPhoneLast4,
    channel: "WhatsApp",
    pickupCode: order.pickupCode ?? null,
    awb: order.shipment?.awb ?? null,
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPricePaise: i.unitPricePaise,
    })),
    totalPaise: order.totalPaise,
    paperMm,
  };
}

export async function printKotForOrder(order: CrmOrder, restaurantName: string) {
  const prefs = readKotPrinterPrefs();
  const paperMm = prefs?.paperMm ?? 80;
  const bytes = encodeKotEscPos(orderToKotTicket(order, restaurantName, paperMm));
  await printEscPosBytes(bytes);
}

/** Auto-print after Accept. Returns null on success, soft error string if print skipped/failed (never blocks tracking). */
export async function tryAutoPrintKot(
  order: CrmOrder,
  restaurantName: string,
): Promise<string | null> {
  const prefs = readKotPrinterPrefs();
  // Explicit opt-out only — default is try print (or toast if no printer)
  if (prefs && prefs.autoPrintOnAccept === false) return null;
  try {
    await printKotForOrder(order, restaurantName);
    return null;
  } catch (e) {
    if (e instanceof KotPrinterNotConnectedError) return "No printer connected";
    return e instanceof Error ? e.message : "KOT print failed";
  }
}

export function setKotAutoPrint(enabled: boolean) {
  const prefs = readKotPrinterPrefs();
  if (!prefs) return;
  writeKotPrinterPrefs({ ...prefs, autoPrintOnAccept: enabled });
}

export function setKotPaperMm(paperMm: 58 | 80) {
  const prefs = readKotPrinterPrefs();
  if (!prefs) return;
  writeKotPrinterPrefs({ ...prefs, paperMm });
}
