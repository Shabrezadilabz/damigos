import { eq } from "drizzle-orm";
import { hashPhone, phoneLast4, signStaffToken } from "@damigos/auth";
import { db, userRestaurantRoles, users } from "@damigos/db";
import { isOtpBypassCode } from "./otp-bypass.js";

export type StaffOtpVerifyResult = {
  verified: true;
  token: string;
  roles: string[];
  restaurantId: string | null;
  expiresIn: string;
};

export class StaffOtpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function verifyStaffOtp(phone: string, code: string): Promise<StaffOtpVerifyResult> {
  if (!phone || phone.replace(/\D/g, "").length < 10) {
    throw new StaffOtpError(400, "INVALID_REQUEST", "phone required");
  }
  if (!code || code.length < 5) {
    throw new StaffOtpError(400, "INVALID_REQUEST", "phone and code required");
  }
  if (!isOtpBypassCode(code)) {
    throw new StaffOtpError(401, "OTP_INVALID", "Invalid code");
  }

  const normalized = phone.replace(/\D/g, "").slice(-10);
  const phoneHash = hashPhone(normalized);
  let [user] = await db.select().from(users).where(eq(users.phoneHash, phoneHash)).limit(1);

  if (!user) {
    [user] = await db
      .insert(users)
      .values({ phoneHash, phoneLast4: phoneLast4(normalized) })
      .returning();
  }

  const roleRows = await db
    .select()
    .from(userRestaurantRoles)
    .where(eq(userRestaurantRoles.userId, user.id));

  const roles = roleRows.map((r) => r.role);
  if (roles.length === 0) {
    throw new StaffOtpError(403, "NO_STAFF_ACCESS", "No restaurant role assigned for this phone");
  }

  const ownerRow = roleRows.find((r) => r.role === "RESTAURANT_OWNER");
  const restaurantId = ownerRow?.restaurantId ?? roleRows[0]?.restaurantId ?? null;

  const token = await signStaffToken({
    userId: user.id,
    roles,
    restaurantId,
  });

  return { verified: true, token, roles, restaurantId, expiresIn: "12h" };
}
