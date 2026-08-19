import { axiosInstance } from "./axios";

/**
 * Dynamically injects the Razorpay Checkout script if not already present.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Triggers the Razorpay checkout process for a subscription plan.
 */
export async function triggerPlanCheckout(plan: "Standard" | "Pro", onSuccess: () => void) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    alert("Failed to load Razorpay Checkout SDK. Please check your internet connection.");
    return;
  }

  try {
    // 1. Create order on the backend
    const { data: orderData } = await axiosInstance.post("/payment/order", { plan });

    // 2. Setup checkout options
    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "AI Feedback Assistant",
      description: `Upgrade to ${plan} Plan (1 Year Subscription)`,
      order_id: orderData.orderId,
      handler: async (response: any) => {
        try {
          // 3. Verify payment signature
          const { data: verifyData } = await axiosInstance.post("/payment/verify", {
            plan,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            isSimulated: orderData.isSimulated,
          });
          alert(verifyData.message || "Payment verified successfully!");
          onSuccess();
        } catch (err: any) {
          alert("Payment verification failed: " + (err.response?.data?.error || err.message));
        }
      },
      theme: {
        color: "#0f0f11",
      },
    };

    if (orderData.isSimulated) {
      // Simulation mode approval confirmation
      const formattedPrice = (orderData.amount / 100).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      });

      if (confirm(`[Billing Sandbox] Confirm purchase of ${plan} Plan (${formattedPrice}/year)?`)) {
        try {
          const { data: verifyData } = await axiosInstance.post("/payment/verify", {
            plan,
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `pay_${Math.random().toString(36).substring(2, 15)}`,
            razorpay_signature: `mock_sig_${Math.random().toString(36).substring(2, 15)}`,
            isSimulated: true,
          });
          alert(verifyData.message || "Simulated payment successful!");
          onSuccess();
        } catch (err: any) {
          alert("Simulated upgrade failed: " + (err.response?.data?.error || err.message));
        }
      }
    } else {
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    }
  } catch (err: any) {
    alert("Checkout initialization failed: " + (err.response?.data?.error || err.message));
  }
}
