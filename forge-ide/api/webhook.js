// api/webhook.js — Stripe webhook handler
// This receives payment confirmations from Stripe and grants Pro automatically

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(500).json({ error: "STRIPE_WEBHOOK_SECRET not configured in Vercel env vars" });
  }

  // Get raw body for Stripe signature verification
  const sig = req.headers["stripe-signature"];
  let rawBody = "";
  
  try {
    // Read raw body
    await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", chunk => { data += chunk; });
      req.on("end", () => { rawBody = data; resolve(); });
      req.on("error", reject);
    });

    // Verify Stripe signature manually (no SDK needed)
    const crypto = await import("crypto");
    const parts = sig.split(",");
    const timestamp = parts.find(p => p.startsWith("t="))?.split("=")[1];
    const signature = parts.find(p => p.startsWith("v1="))?.split("=")[1];
    
    const payload = `${timestamp}.${rawBody}`;
    const expected = crypto.createHmac("sha256", webhookSecret)
      .update(payload, "utf8")
      .digest("hex");

    if (expected !== signature) {
      return res.status(400).json({ error: "Invalid Stripe signature" });
    }

    const event = JSON.parse(rawBody);

    // Handle successful payment
    if (event.type === "checkout.session.completed" || 
        event.type === "invoice.payment_succeeded" ||
        event.type === "customer.subscription.created") {
      
      const email = event.data?.object?.customer_email || 
                    event.data?.object?.customer_details?.email ||
                    event.data?.object?.metadata?.email;
      
      if (email) {
        // Store pro status by email in a simple KV approach
        // We use a global store that persists per serverless instance
        // For production: use a real DB (Vercel KV, PlanetScale, etc.)
        if (!global.PRO_EMAILS) global.PRO_EMAILS = new Set();
        global.PRO_EMAILS.add(email.toLowerCase());
        
        console.log(`✅ Granted Pro to: ${email}`);
        return res.status(200).json({ received: true, email, status: "pro_granted" });
      }
    }

    // Handle subscription cancelled
    if (event.type === "customer.subscription.deleted") {
      const email = event.data?.object?.metadata?.email;
      if (email && global.PRO_EMAILS) {
        global.PRO_EMAILS.delete(email.toLowerCase());
        console.log(`❌ Revoked Pro from: ${email}`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(400).json({ error: err.message });
  }
}
