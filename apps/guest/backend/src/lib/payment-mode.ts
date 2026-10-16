export type PaymentMode = "mock" | "stub" | "razorpay";

export function paymentMode(): PaymentMode {
  const mode = (process.env.PAYMENT_MODE ?? "mock").toLowerCase();
  if (mode === "stub" || mode === "razorpay" || mode === "mock") return mode;
  return "mock";
}

export function razorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID ?? null;
}
