import { createHash } from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export type GuestJwtPayload = JWTPayload & {
  typ: "guest";
  sub: string;
  phoneLast4?: string;
};

export type StaffJwtPayload = JWTPayload & {
  typ: "staff";
  sub: string;
  roles: string[];
  restaurantId?: string;
};

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET must be set (min 16 chars)");
  }
  return new TextEncoder().encode(secret);
}

export function hashPhone(phone: string): string {
  const normalized = phone.replace(/\D/g, "").slice(-10);
  return createHash("sha256").update(normalized).digest("hex");
}

export function phoneLast4(phone: string): string {
  return phone.replace(/\D/g, "").slice(-4);
}

export async function signGuestToken(customerId: string, phoneLast4Digits?: string) {
  return new SignJWT({
    typ: "guest",
    phoneLast4: phoneLast4Digits,
  } satisfies Omit<GuestJwtPayload, "sub" | "iat" | "exp">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(customerId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function signStaffToken(input: {
  userId: string;
  roles: string[];
  restaurantId?: string;
}) {
  return new SignJWT({
    typ: "staff",
    roles: input.roles,
    restaurantId: input.restaurantId,
  } satisfies Omit<StaffJwtPayload, "sub" | "iat" | "exp">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
}

export async function verifyGuestToken(token: string): Promise<GuestJwtPayload> {
  const { payload } = await jwtVerify(token, secretKey());
  if (payload.typ !== "guest" || !payload.sub) throw new Error("Invalid guest token");
  return payload as GuestJwtPayload;
}

export async function verifyStaffToken(token: string): Promise<StaffJwtPayload> {
  const { payload } = await jwtVerify(token, secretKey());
  if (payload.typ !== "staff" || !payload.sub) throw new Error("Invalid staff token");
  return payload as StaffJwtPayload;
}

export function bearerToken(authorization?: string): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice(7).trim() || null;
}
