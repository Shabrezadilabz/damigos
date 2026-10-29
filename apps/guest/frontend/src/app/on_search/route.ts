import { NextRequest } from "next/server";
import { handleOndcCallback } from "@/lib/ondc-callback-handler";

export async function POST(req: NextRequest) {
  return handleOndcCallback(req, "on_search");
}
