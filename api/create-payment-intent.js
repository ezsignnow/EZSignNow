import Stripe from "stripe";
import { applyCors } from "./_lib/cors.js";
import { parsePaymentIntentRequest } from "./_lib/paymentIntent.js";

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parsed = parsePaymentIntentRequest(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  try {
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: parsed.amount,
      currency: parsed.currency,
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    // Stripe errors can name account settings and keys; keep them in the logs.
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: "Couldn't start the payment. Please try again." });
  }
}
