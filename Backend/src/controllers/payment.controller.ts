import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { BaseController } from "./base.controller";
import { IUsersRepository } from "../db/repositories/interfaces";
import Razorpay from "razorpay";
import crypto from "crypto";
import { env } from "../config";

const razorpay = env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    })
  : null;

export class PaymentController extends BaseController {
  private usersRepo: IUsersRepository;

  constructor(usersRepo: IUsersRepository) {
    super();
    this.usersRepo = usersRepo;
  }

  /**
   * Initialize a Razorpay Order.
   */
  createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { plan } = req.body;
      if (plan !== "Standard" && plan !== "Pro") {
        this.badRequest(res, "Invalid plan selected");
        return;
      }

      // Calculate amount in Paise (1 INR = 100 Paise)
      const amount = plan === "Standard" ? 999 * 100 : 4999 * 100;
      const currency = "INR";
      const receipt = `rcpt_${Math.random().toString(36).substring(2, 10)}`;

      if (razorpay) {
        const order = await razorpay.orders.create({
          amount,
          currency,
          receipt,
        });

        this.ok(res, {
          isSimulated: false,
          keyId: env.RAZORPAY_KEY_ID,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
        });
      } else {
        // Fallback simulation mode
        this.ok(res, {
          isSimulated: true,
          keyId: "rzp_test_mockkeyid123",
          orderId: `order_${Math.random().toString(36).substring(2, 15)}`,
          amount,
          currency,
        });
      }
    } catch (error) {
      this.serverError(res, error, "Failed to create payment order:");
    }
  };

  /**
   * Verify Razorpay Payment Signature and upgrade user plan.
   */
  verifyPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        plan,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        isSimulated,
      } = req.body;

      if (!plan || (plan !== "Standard" && plan !== "Pro")) {
        this.badRequest(res, "Invalid plan selection");
        return;
      }

      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      if (isSimulated || !razorpay) {
        // Simulate payment success in sandbox mode
        await this.usersRepo.update(req.userId!, {
          plan,
          planExpiresAt: oneYearFromNow,
        });

        this.ok(res, {
          message: "Simulated payment verified successfully! Your account has been upgraded.",
          plan,
        });
        return;
      }

      // Live verification using HMAC SHA256 signature check
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        await this.usersRepo.update(req.userId!, {
          plan,
          planExpiresAt: oneYearFromNow,
        });

        this.ok(res, {
          message: "Payment verified successfully! Plan upgraded to " + plan + " for 1 year.",
          plan,
        });
      } else {
        this.badRequest(res, "Invalid payment signature verification failed");
      }
    } catch (error) {
      this.serverError(res, error, "Payment verification error:");
    }
  };
}
