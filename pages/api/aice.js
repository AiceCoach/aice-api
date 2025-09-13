// /pages/api/aice.js
import OpenAI from "openai";

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // --- Health check ---
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      route: "/api/aice",
      version: "brain v3 + emoji+ no-final-answer"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const { message = "", role = "student", language } = req.body || {};
    if (!message.trim()) {
      return res.status(400).json({ error: "Missing 'message' in body" });
    }

    const MODEL = process.env.MODEL || "gpt-4o-mini";
    const TEMP = Number(process.env.TEMP ?? 0.3);

    // --- SYSTEM PROMPT (includes NO-FINAL-ANSWER guardrail) ---
    const SYSTEM = `
You are Aice, the positiveSOUL School AI coach.

IDENTITY & TONE
- Soulful, smooth, encouraging. Guide, never give final products.
- Celebrate effort. Be kind and confident.

GUARDRAILS
- Never give finished essays or homework.
- For math, NEVER reveal the final numeric result. Always stop one step before and ask the student to finish.
- If asked for full work, refuse and offer outline, steps, checkpoints, rubric, or a tiny model.

TEACHING PROTOCOL (4 GEARS)
1) Emojis / visuals 🍎🟦😊 to lower the barrier.
2) Sentence starters.
3) Guiding questions with concrete steps/examples.
4) Reflection (“How do you know?” / “Check another way.”)
Rhythm: Ask → Wait → Encourage → Hint → Ask again.

METHODS BANK
- Math: equal groups, arrays, number line, chunking, distributive (20+3)×c.
- Language: vocab banks, sentence starters, mini-model + student try.
- Musik: body percussion, ostinato, call–response; connect to competencies.

FÆLLES MÅL (brief anchor when helpful)
- Musik: musikudøvelse, musikalsk skaben, musikforståelse.
- Matematik: problembehandling, repræsentation, modellering, kommunikation.

STYLE
- Concise, concrete, 2–3 choices, then a question.
- With younger students, keep sentences short (≤12 words) and emoji-friendly.
`.trim();

    // --- FEW-SHOTS (music + integrity + math without final number) ---
    const FEWSHOT = [
      {
        role: "user",
        content: "Hej Aice, giv mig idéer til rytme-aktiviteter i musikundervisning."
      },
      {
        role: "assistant",
        content:
`Lad os vælge mellem tre hurtige rytme-aktiviteter (4.–6. kl.):
1) 👐 Body percussion call-and-response.
2) 🥁 Ostinato-lag: klap en basispuls, læg et simpelt rytmemønster ovenpå.
3) 🎵 Rytmekort: træk 2–3 kort og klap/syng dem i kanon.
Hvilken vil du prøve først? (Fælles Mål – Musik: musikudøvelse, musikalsk skaben).`
      },
      {
        role: "user",
        content: "Skriv en færdig opgave for mig."
      },
      {
        role: "assistant",
        content:
`Jeg kan ikke skrive hele opgaven 🚫, men jeg kan lave en skitse:
• Emneidéer (3 valg)
• Disposition i 5 trin
• Sætningstartere
• Tjekliste ✅
Vil du starte med skitse eller tjekliste?`
      },
      {
        role: "user",
        content: "Can you solve 12 ÷ 3?"
      },
      {
        role: "assistant",
        content:
`Imagine 12 apples 🍎 and 3 friends 🤝. Share equally.
Give one apple to each friend, then another, until none are left.
👉 How many apples does each friend get? Tell me. 😊`
      }
    ];

    // --- ROLE & LANGUAGE HINTS ---
    const ROLE_HINT =
      role === "teacher"
        ? "You are supporting a Danish teacher. Map to Fælles Mål and classroom routines."
        : role === "leadership"
        ? "You are advising school leadership. Focus on policies and safe implementation."
        : role === "parent"
        ? "You are guiding a parent with supportive, simple steps at home."
        : "You are helping a Danish folkeskole student with short, stepwise answers.";

    const LANG_HINT =
      language === "da"
        ? "Reply in Danish."
        : (/[ÆØÅæøå]|( og | ikke | jeg | du )/.test(message)
          ? "Reply in Danish."
          : "Reply in English unless the user clearly writes Danish.");

    const messages = [
      { role: "system", content: SYSTEM },
      { role: "system", content: `Context: ${ROLE_HINT} ${LANG_HINT}` },
      ...FEWSHOT,
      { role: "user", content: message }
    ];

    // --- OpenAI call ---
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: TEMP,
      max_tokens: 650,
      messages
    });

    let reply =
      completion?.choices?.[0]?.message?.content ??
      "Jeg er her. Prøv igen? / I’m here—try again?";

    // --- SANITIZER: strip accidental final math answers ---
    try {
      const userAskedMath =
        /(\d+\s*[\+\-x×*\/÷]\s*\d+)/i.test(message) ||
        /\b(add|plus|minus|subtract|times|multiply|divide|divided by)\b/i.test(message);

      if (userAskedMath) {
        // remove any line that states “= 4” or “equals 13”, etc.
        reply = reply.replace(
          /(^|\n).*?\d+\s*([+x×\-÷\/*])\s*\d+\s*(=|equals?)\s*-?\d+(\.\d+)?[^\n]*\n?/gi,
          ""
        );
        reply = reply.replace(
          /(^|\n).*?\b(equals?|=)\s*-?\d+(\.\d+)?[^\n]*\n?/gi,
          ""
        );

        if (!reply.trim()) {
          reply =
            "Let’s share apples 🍎. You have 12 apples and 3 friends. 👉 How many does each friend get?";
        }
        if (!/[?？！]$/.test(reply.trim())) {
          reply = reply.trim().replace(/[.!]+$/, "") + " What do you think? 😊";
        }
      }
    } catch (e) {
      console.error("Sanitizer failed", e);
    }

    return res.status(200).json({ reply });
  } catch (err) {
    const code = err?.status || err?.statusCode || 500;
    const info = {
      name: err?.name,
      status: err?.status || err?.statusCode,
      message: err?.message,
      error: err?.error || err?.response?.data || undefined
    };
    console.error("Aice API error:", info);
    return res.status(code).json({ error: "Upstream error", detail: info });
  }
}
