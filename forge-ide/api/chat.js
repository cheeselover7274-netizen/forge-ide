// api/chat.js — Multi-provider API route
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { model, system, messages, provider } = req.body;

  try {

    // Gemini
    if (provider === "gemini") {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) return res.status(500).json({ error: "Add GEMINI_API_KEY in Vercel env vars" });
      const geminiMessages = messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: system ? { parts: [{ text: system }] } : undefined,
            contents: geminiMessages,
            generationConfig: { maxOutputTokens: 8000 },
          }),
        }
      );
      const data = await geminiRes.json();
      if (!geminiRes.ok) return res.status(500).json({ error: data.error?.message || "Gemini error" });
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return res.status(200).json({ content: [{ type: "text", text }] });
    }

    // Groq
    if (provider === "groq") {
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) return res.status(500).json({ error: "Add GROQ_API_KEY in Vercel env vars" });
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({
          model,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            ...messages,
          ],
          max_tokens: 8000,
        }),
      });
      const data = await groqRes.json();
      if (!groqRes.ok) return res.status(500).json({ error: data.error?.message || "Groq error" });
      const text = data.choices?.[0]?.message?.content || "";
      return res.status(200).json({ content: [{ type: "text", text }] });
    }

    // OpenRouter
    if (provider === "openrouter") {
      const orKey = process.env.OPENROUTER_API_KEY;
      if (!orKey) return res.status(500).json({ error: "Add OPENROUTER_API_KEY in Vercel env vars" });
      const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${orKey}`,
          "HTTP-Referer": "https://forge-ide.vercel.app",
          "X-Title": "Forge IDE",
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            ...messages,
          ],
          max_tokens: 8000,
        }),
      });
      const data = await orRes.json();
      if (!orRes.ok) return res.status(500).json({ error: data.error?.message || "OpenRouter error" });
      const text = data.choices?.[0]?.message?.content || "";
      return res.status(200).json({ content: [{ type: "text", text }] });
    }

    // Cohere
    if (provider === "cohere") {
      const cohereKey = process.env.COHERE_API_KEY;
      if (!cohereKey) return res.status(500).json({ error: "Add COHERE_API_KEY in Vercel env vars" });
      const cohereRes = await fetch("https://api.cohere.com/v2/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cohereKey}` },
        body: JSON.stringify({
          model,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            ...messages,
          ],
          max_tokens: 8000,
        }),
      });
      const data = await cohereRes.json();
      if (!cohereRes.ok) return res.status(500).json({ error: data.message || "Cohere error" });
      const text = data.message?.content?.[0]?.text || "";
      return res.status(200).json({ content: [{ type: "text", text }] });
    }

    // Anthropic (default)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Add ANTHROPIC_API_KEY in Vercel env vars" });
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: 8000, system, messages }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || "Anthropic API error" });
    return res.status(200).json(data);

  } catch (err) {
    console.error("API route error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
