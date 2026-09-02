import Stripe from "stripe";

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, currency } = req.body || {};

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: amount || 1000, // Default to $10.00 if not provided
      currency: currency || "usd",
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: error.message });
  }
}
