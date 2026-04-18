// api/check-pro.js — Check if a user has Pro status
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const isPro = global.PRO_EMAILS?.has(email.toLowerCase()) || false;
  return res.status(200).json({ isPro, email });
}
