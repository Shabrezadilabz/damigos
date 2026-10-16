const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

export function loadRazorpayCheckoutScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Razorpay script failed")));
      return;
    }
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
  amountPaise: number;
  orderId: string;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onDismiss?: () => void;
}) {
  if (!window.Razorpay) throw new Error("Razorpay not loaded");
  const rzp = new window.Razorpay({
    key: input.keyId,
    amount: input.amountPaise,
    currency: "INR",
    name: "D'aMigo's",
    description: "Restaurant order",
    order_id: input.orderId,
    theme: { color: "#C85D3E" },
    handler: input.onSuccess,
    modal: { ondismiss: input.onDismiss },
  });
  rzp.open();
}
