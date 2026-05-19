// api/chat.js — Multi-provider API route
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { model, system, messages, provider } = req.body;

  try {
    // Ollama / Claude Code (local)
    if (provider === "ollama") {
      const ollamaRes = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model || "mistral",
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            ...messages,
          ],
          stream: false,
        }),
      });
      const data = await ollamaRes.json();
      if (!ollamaRes.ok) return res.status(500).json({ error: "Ollama error" });
      return res.status(200).json({
        content: [{ type: "text", text: data.message?.content || "" }],
      });
    }

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
