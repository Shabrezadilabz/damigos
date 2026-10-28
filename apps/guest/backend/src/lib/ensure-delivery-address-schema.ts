import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

/** Persist guest delivery address text on carts + orders for CRM. */
export async function ensureDeliveryAddressSchema() {
  const statements = [
    sql`ALTER TABLE carts ADD COLUMN IF NOT EXISTS delivery_address_text varchar(240)`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address_text varchar(240)`,
  ];
  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (err) {
      console.warn("[ensure-delivery-address-schema]", err);
    }
  }
}
