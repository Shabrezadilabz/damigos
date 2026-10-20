const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

export type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function loadRazorpayCheckoutScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Razorpay) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Razorpay script failed")));
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay script failed"));
    document.body.appendChild(script);
  });
}

export function openRazorpayCheckout(input: {
  keyId: string;
  orderId: string;
  amountPaise: number;
  name?: string;
  description?: string;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onDismiss?: () => void;
}) {
  if (!window.Razorpay) throw new Error("Razorpay not loaded");
  const rzp = new window.Razorpay({
    key: input.keyId,
    amount: input.amountPaise,
    currency: "INR",
    name: input.name ?? "D'aMigo's Grow",
    description: input.description ?? "Marketing wallet top-up",
    order_id: input.orderId,
    handler: (response: RazorpaySuccessResponse) => input.onSuccess(response),
    modal: {
      ondismiss: () => input.onDismiss?.(),
    },
  });
  rzp.open();
}
