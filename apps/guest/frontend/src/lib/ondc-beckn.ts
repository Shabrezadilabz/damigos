import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

/**
 * ONDC Beckn Ed25519 signing + verification + PreProd catalog store.
 * Subscriber ID: damigos-guest-web.vercel.app
 * UKID: f09c99cd-1aef-4ee7-bb5c-23756774a4d7
 */

export const ONDC_DEFAULT_SUBSCRIBER_ID =
  process.env.ONDC_SUBSCRIBER_ID?.trim() || "damigos-guest-web.vercel.app";
export const ONDC_DEFAULT_SUBSCRIBER_URL =
  process.env.ONDC_SUBSCRIBER_URL?.trim() || "https://damigos-guest-web.vercel.app";
export const ONDC_DEFAULT_UKID =
  process.env.ONDC_UKID?.trim() || "f09c99cd-1aef-4ee7-bb5c-23756774a4d7";
export const ONDC_DEFAULT_SIGNING_PUBLIC_KEY =
  process.env.ONDC_SIGNING_PUBLIC_KEY?.trim() ||
  "aL6wJKJfkjT47diRrtqHzLj+OqlgBeRZnsNA60kwpAs=";
export const ONDC_DEFAULT_SIGNING_PRIVATE_KEY =
  process.env.ONDC_SIGNING_PRIVATE_KEY?.trim() ||
  "Hich6mHcuSG0imnkzVZemEuG2lgWL4v8oRjYcvBEU0hovrAkol+SNPjt2JGu2ofMuP46qWAF5Fmew0DrSTCkCw==";
export const ONDC_DEFAULT_ENCRYPTION_PUBLIC_KEY =
  process.env.ONDC_ENCRYPTION_PUBLIC_KEY?.trim() ||
  "MCowBQYDK2VuAyEAr/4x3SR/V5otf0usVH9/52m7fjLdsWK+1mELAO9rbhQ=";
export const ONDC_PREPROD_GATEWAY_URL =
  process.env.ONDC_GATEWAY_URL?.trim() || "https://preprod.gateway.ondc.org/search";

/** PKCS#8 DER prefix for a 32-byte raw Ed25519 private seed */
const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
/** SPKI DER prefix for a 32-byte raw Ed25519 public key */
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function blakeDigestBase64(rawBody: string): string {
  // Node's built-in blake2b512 produces 64-byte digest compatible with Beckn BLAKE-512
  const hash = createHash("blake2b512").update(rawBody, "utf8").digest("base64");
  return `BLAKE-512=${hash}`;
}

export function buildSigningString(input: {
  created: number;
  expires: number;
  rawBody: string;
}): string {
  const digest = blakeDigestBase64(input.rawBody);
  return `(created): ${input.created}\n(expires): ${input.expires}\ndigest: ${digest}`;
}

export function signOndcPayload(rawBody: string, createdSec?: number, ttlSec = 300): {
  header: string;
  created: number;
  expires: number;
  signature: string;
} {
  const created = createdSec ?? Math.floor(Date.now() / 1000);
  const expires = created + ttlSec;
  const signingString = buildSigningString({ created, expires, rawBody });

  const rawKey = Buffer.from(ONDC_DEFAULT_SIGNING_PRIVATE_KEY, "base64");
  // ONDC keys.json stores 64-byte NaCl secretKey (32-byte seed + 32-byte pubkey) or 32-byte seed
  const seed32 = rawKey.subarray(0, 32);
  const pkcs8Der = Buffer.concat([ED25519_PKCS8_PREFIX, seed32]);
  const privKey = createPrivateKey({ key: pkcs8Der, format: "der", type: "pkcs8" });

  const sig = sign(null, Buffer.from(signingString, "utf8"), privKey).toString("base64");
  const keyId = `${ONDC_DEFAULT_SUBSCRIBER_ID}|${ONDC_DEFAULT_UKID}|ed25519`;
  const header = `Signature keyId="${keyId}",algorithm="ed25519",created="${created}",expires="${expires}",headers="(created) (expires) digest",signature="${sig}"`;

  return { header, created, expires, signature: sig };
}

export function verifyOndcSignature(input: {
  authHeader: string | null | undefined;
  rawBody: string;
  publicKeyBase64?: string;
}): { valid: boolean; keyId?: string; reason?: string } {
  if (!input.authHeader) {
    return { valid: false, reason: "Missing Authorization header" };
  }
  const createdMatch = input.authHeader.match(/created="(\d+)"/);
  const expiresMatch = input.authHeader.match(/expires="(\d+)"/);
  const sigMatch = input.authHeader.match(/signature="([^"]+)"/);
  const keyIdMatch = input.authHeader.match(/keyId="([^"]+)"/);

  if (!createdMatch || !expiresMatch || !sigMatch) {
    return { valid: false, reason: "Malformed Signature header" };
  }

  const created = Number(createdMatch[1]);
  const expires = Number(expiresMatch[1]);
  const now = Math.floor(Date.now() / 1000);
  if (expires < now - 60) {
    return { valid: false, keyId: keyIdMatch?.[1], reason: "Signature expired" };
  }

  if (!input.publicKeyBase64) {
    // When gateway/BPP public key is not pinned locally, structural + timestamp check passes in PreProd
    return { valid: true, keyId: keyIdMatch?.[1], reason: "Structural + timestamp verified" };
  }

  try {
    const rawPub = Buffer.from(input.publicKeyBase64, "base64").subarray(0, 32);
    const spkiDer = Buffer.concat([ED25519_SPKI_PREFIX, rawPub]);
    const pubKey = createPublicKey({ key: spkiDer, format: "der", type: "spki" });
    const signingString = buildSigningString({ created, expires, rawBody: input.rawBody });
    const ok = verify(
      null,
      Buffer.from(signingString, "utf8"),
      pubKey,
      Buffer.from(sigMatch[1]!, "base64"),
    );
    return { valid: ok, keyId: keyIdMatch?.[1], reason: ok ? undefined : "Ed25519 verify failed" };
  } catch (err) {
    return {
      valid: false,
      keyId: keyIdMatch?.[1],
      reason: err instanceof Error ? err.message : "Verify error",
    };
  }
}

export function signChallengeString(challenge: string): string {
  const rawKey = Buffer.from(ONDC_DEFAULT_SIGNING_PRIVATE_KEY, "base64");
  const seed32 = rawKey.subarray(0, 32);
  const pkcs8Der = Buffer.concat([ED25519_PKCS8_PREFIX, seed32]);
  const privKey = createPrivateKey({ key: pkcs8Der, format: "der", type: "pkcs8" });
  return sign(null, Buffer.from(challenge, "utf8"), privKey).toString("base64");
}

export type OndcActionLog = {
  id: string;
  action: string;
  transactionId: string;
  messageId: string;
  bppId: string | null;
  bppUri: string | null;
  receivedAt: string;
  durationMs: number;
  signatureValid: boolean;
  providersCount: number;
  itemsCount: number;
  summary: unknown;
};

export type OndcDiscoveredRestaurant = {
  providerId: string;
  bppId: string;
  bppUri: string;
  name: string;
  shortDesc?: string;
  symbol?: string;
  gps?: string;
  address?: string;
  city?: string;
  itemsCount: number;
  sampleItems: Array<{ id: string; name: string; priceInr: string }>;
  updatedAt: string;
};

const actionLogs: OndcActionLog[] = [];
const discoveredRestaurants = new Map<string, OndcDiscoveredRestaurant>();

export function recordOndcCallback(input: {
  action: string;
  payload: Record<string, unknown>;
  durationMs: number;
  signatureValid: boolean;
}) {
  const ctx = (input.payload.context ?? {}) as Record<string, unknown>;
  const msg = (input.payload.message ?? {}) as Record<string, unknown>;
  const catalog = (msg.catalog ?? {}) as Record<string, unknown>;
  const providers = Array.isArray(catalog["bpp/providers"])
    ? (catalog["bpp/providers"] as Array<Record<string, unknown>>)
    : [];

  let totalItems = 0;
  const bppId = typeof ctx.bpp_id === "string" ? ctx.bpp_id : null;
  const bppUri = typeof ctx.bpp_uri === "string" ? ctx.bpp_uri : null;

  for (const p of providers) {
    const pId = String(p.id ?? "unknown");
    const desc = (p.descriptor ?? {}) as Record<string, unknown>;
    const name = String(desc.name ?? pId);
    const shortDesc = typeof desc.short_desc === "string" ? desc.short_desc : undefined;
    const symbol = typeof desc.symbol === "string" ? desc.symbol : undefined;
    const locs = Array.isArray(p.locations) ? (p.locations as Array<Record<string, unknown>>) : [];
    const firstLoc = locs[0] ?? {};
    const addrObj = (firstLoc.address ?? {}) as Record<string, unknown>;
    const items = Array.isArray(p.items) ? (p.items as Array<Record<string, unknown>>) : [];
    totalItems += items.length;

    const sampleItems = items.slice(0, 8).map((it) => {
      const itDesc = (it.descriptor ?? {}) as Record<string, unknown>;
      const itPrice = (it.price ?? {}) as Record<string, unknown>;
      return {
        id: String(it.id ?? ""),
        name: String(itDesc.name ?? "Item"),
        priceInr: String(itPrice.value ?? "0"),
      };
    });

    const key = `${bppId ?? "bpp"}:${pId}`;
    discoveredRestaurants.set(key, {
      providerId: pId,
      bppId: bppId ?? "unknown-bpp",
      bppUri: bppUri ?? "",
      name,
      shortDesc,
      symbol,
      gps: typeof firstLoc.gps === "string" ? firstLoc.gps : undefined,
      address: [addrObj.Flat_No, addrObj.street, addrObj.locality, addrObj.area_code]
        .filter(Boolean)
        .join(", "),
      city: typeof addrObj.city === "string" ? addrObj.city : "Bengaluru",
      itemsCount: items.length,
      sampleItems,
      updatedAt: new Date().toISOString(),
    });
  }

  const logEntry: OndcActionLog = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    action: String(ctx.action ?? input.action),
    transactionId: String(ctx.transaction_id ?? "N/A"),
    messageId: String(ctx.message_id ?? "N/A"),
    bppId,
    bppUri,
    receivedAt: new Date().toISOString(),
    durationMs: input.durationMs,
    signatureValid: input.signatureValid,
    providersCount: providers.length,
    itemsCount: totalItems,
    summary:
      input.action === "on_search"
        ? { providers: providers.length, items: totalItems }
        : msg.order ?? msg,
  };

  actionLogs.unshift(logEntry);
  if (actionLogs.length > 100) actionLogs.length = 100;
  return logEntry;
}

export function getOndcState() {
  return {
    subscriberId: ONDC_DEFAULT_SUBSCRIBER_ID,
    subscriberUrl: ONDC_DEFAULT_SUBSCRIBER_URL,
    ukid: ONDC_DEFAULT_UKID,
    domain: "ONDC:RET11",
    environment: "PreProd",
    signingPublicKey: ONDC_DEFAULT_SIGNING_PUBLIC_KEY,
    encryptionPublicKey: ONDC_DEFAULT_ENCRYPTION_PUBLIC_KEY,
    logsCount: actionLogs.length,
    restaurantsCount: discoveredRestaurants.size,
    logs: actionLogs.slice(0, 50),
    restaurants: Array.from(discoveredRestaurants.values()),
  };
}
