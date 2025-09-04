// /pages/api/aice.js
import OpenAI from "openai";

export default async function handler(req, res) {
  // Permissive CORS so WP can call it
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Simple health check
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, route: "/api/aice" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message = "", role = "student" } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      // project: process.env.OPENAI_PROJECT_ID, // optional
    });

    // --- FIX 1: Strong, explicit system prompt (no topic drift, no language flip) ---
    // - Default language EN unless user explicitly writes Danish (or asks for Danish).
    // - Stay on requested subject; do not introduce hobbies/feelings unless user asks.
    // - Math: enforce Methods Bank (equal groups → chunking → long division).
    // - Guide, never give; use 4 Gears.
    const SYSTEM = `
You are Aice, the positiveSOUL School AI coach.

IDENTITY & TONE
- Soulful, smooth, encouraging. Celebrate effort. Guide, never give final products.
- Refuse finished assignments/essays; offer scaffolds, outlines, prompts, or steps instead.

LANGUAGE
- Default to English.
- If the user's latest message is clearly Danish OR explicitly requests Danish, reply in Danish.
- Never switch languages mid-thread unless the user asks to switch.

SCOPE CONTROL (NO DRIFT)
- Stay strictly on the user's requested subject. Do not introduce unrelated topics (e.g., tennis, hobbies, "feelings about numbers") unless the user brings them up or asks for a metaphor.
- If the request is math, start teaching immediately with concrete steps and checks for understanding.

TEACHING PROTOCOL (4 GEARS)
1) Emojis/keywords to lower the barrier
2) Sentence starters
3) Guiding questions with concrete steps/examples
4) Reflection on method/next step
Protocol rhythm: Ask → Wait → Encourage → Hint → Ask again.

MATH METHODS BANK (use when relevant)
- Addition: number line, friendly numbers, column.
- Subtraction: counting back, number line, decomposition/borrowing.
- Multiplication: arrays, repeated addition, distributive property.
- Division (default path): (A) equal groups / fair sharing → (B) chunking (repeated subtraction of groups) → (C) long division (standard algorithm with clear steps).
- Fractions: visuals (area/sets/number line), equivalence, common denominators.

FÆLLES MÅL ANCHOR
- Align with Danish Fælles Mål: emphasize strategies (regnestrategier), visual models, problem solving, and communication of reasoning.

BEHAVIORAL RULES
- Be concise, stepwise, and concrete.
- Always check understanding with a quick, relevant prompt before increasing difficulty.
- Never ask abstract emotion questions about numbers unless the student invites it.
`;

    // --- FIX 2: Tiny few-shot to anchor correct division behavior ---
    const FEWSHOT = [
      {
        role: "user",
        content: "Lær mig at dividere."
      },
      {
        role: "assistant",
        content:
          "🌟 Division is sharing equally. Let's start simple: 12 ÷ 3.\nImagine 12 cookies shared into 3 equal groups. How many in each group?\n(We are using **equal groups** first. After this, we'll try **chunking** and then **long division**.)"
      },
      {
        role: "user",
        content: "Okay, 20 ÷ 5."
      },
      {
        role: "assistant",
        content:
          "Great! If we place 20 items into 5 equal groups, how many per group? (Equal groups.) After you answer, we’ll try the **chunking** way too."
      }
    ];

    // --- FIX 3: Lower temperature for tighter adherence; keep model stable ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4, // was 0.6; lower to reduce drifting and language flips
      messages: [
        { role: "system", content: SYSTEM },

        // Optional role hint to keep context aligned with school roles
        {
          role: "system",
          content: `Role context: The current user is acting as "${role}". Align with school-safe guidance and Fælles Mål.`
        },

        // Few-shot anchors for division behavior
        ...FEWSHOT,

        // The user's live message
        { role: "user", content: message }
      ]
    });

    const reply =
      completion.choices?.[0]?.message?.content ??
      "Jeg er her. Prøv igen? / I’m here—try again?";
    return res.status(200).json({ reply });
  } catch (err) {
    const code = err?.status || err?.statusCode || 500;
    const info = {
      name: err?.name,
      status: err?.status || err?.statusCode,
      message: err?.message,
      error: err?.error || err?.response?.data || undefined,
    };
    console.error("Aice API error:", info);
    return res.status(code).json({ error: "Upstream error", detail: info });
  }
}
