import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = 3000;

  // Initialize Gemini if key exists
  const geminiApiKey = process.env.GEMINI_API_KEY;
  let aiClient: any = null;
  if (geminiApiKey) {
    aiClient = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  // Format My Answer Endpoint
  app.post("/api/format", async (req, res) => {
    try {
      const { text, subject, language, targetLanguage } = req.body;

      if (!text || text.trim() === "") {
        return res.status(400).json({ error: "Please speak your answer first." });
      }

      const activeLanguage = language || "English";
      const activeTarget = targetLanguage || "English";

      const systemInstruction = `You are an academic formatting assistant and professional scribe for Indian school examinations.
The student has spoken their answer aloud in ${activeLanguage}. Convert it into a clean, properly formatted, highly academic exam-ready document structure in ${activeTarget}.

CRITICAL - SCRIBE-ONLY MODE (NO ANSWERING OR SOLVING):
You are strictly a *writing machine* and a *voice scribe*. Your sole job is to transcribe, refine, and format exactly what the student dictates.
- If the student dictates a question, an equation, a problem to solve, or a query (e.g., "What is the integral of x square DX?", "What is H2O?", "How does a cell respire?"), you MUST NOT answer it, solve it, explain it, or generate any solutions/responses.
- You must ONLY write down the student's dictated question or input exactly as spoken, applying appropriate LaTeX formatting for math ($...$ or $$...$$), chemical subscripts, or code blocks, and fixing transcription/microphone typos.
- DO NOT add any answers, solutions, or explanations. You must not "think" for yourself or solve anything. If the student asks a question, write down the question, and nothing else.

Rules:
1. Fix grammar, spelling, punctuation, and academic sentence structures. Correct all spoken transcription and microphone errors.
2. If subject is "Computer Science" or the student dictates programming terms: Convert spoken phrases or descriptions of code into actual, clean, syntactically correct code blocks wrapped in standard markdown triple backticks (e.g. \`\`\`cpp ... \`\`\` or \`\`\`python ... \`\`\`) rather than writing plain text.
   - For example: if the user says "hash include I/O stream" or "hash include iostream", write \`#include <iostream>\`.
   - If they say "using namespace std", write \`using namespace std;\`.
   - If they say "standard output stream hello world" or "print hello world", write complete valid code statements like \`std::cout << "Hello, World!" << std::endl;\` or \`print("Hello, World!")\`.
   - If they dictate code logic in any programming language, synthesize it into clean, indented code syntax with proper braces, brackets, and keywords.
3. Translation Rule:
   - For English to English, correct academic/technical phrasing, improve clarity and sentence flow, and resolve Scientific/Mathematical/CS notation.
4. If subject is Mathematics: convert spoken math (e.g. 'x squared plus 2x minus 5 equals 0', 'integral of x dx', 'infinity', 'theta equals pi over 2') into proper LaTeX format wrapped in $...$ for inline or $$...$$ for block equations.
5. If subject is Chemistry: format chemical formulae correctly (e.g. H2O, CO2, H2SO4, C6H12O6) with proper subscripts, but do NOT balance or solve equations unless the student explicitly dictated the fully balanced equation. Just write what they said, properly formatted with subscripts.
6. If subject is Physics: format symbols, units, and equations properly.
7. Structure the answer with clear, structured paragraphs, numbered lists, and bold headings to make it highly readable and exam-ready.
8. Do not add any facts, theories, or details that the student did not mention. Keep everything strictly faithful to the student's words.
9. Return only the formatted answer text, nothing else. Do not say "Here is your formatted answer" or include conversational preambles/postambles.`;

      const promptText = `Subject: ${subject || "General"}
Spoken Text: ${text}
Target Output Language: ${activeTarget}`;

      // 1. Try Claude if ANTHROPIC_API_KEY is available
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (anthropicKey) {
        try {
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": anthropicKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 4000,
              system: systemInstruction,
              messages: [{ role: "user", content: promptText }],
            }),
          });

          if (response.ok) {
            const data: any = await response.json();
            const formattedText = data.content?.[0]?.text || "";
            return res.json({ success: true, formattedText, provider: "Claude" });
          } else {
            const errText = await response.text();
            console.warn("Claude API returned non-200, resorting to Gemini:", errText);
          }
        } catch (err) {
          console.error("Claude format proxy failed:", err);
        }
      }

      // 2. Gemini fallback / main provider with retry and model fallback logic
      if (aiClient) {
        let attempt = 0;
        const maxAttempts = 3;
        let lastError: any = null;
        let formattedText = "";

        // Helper delay function
        const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        while (attempt < maxAttempts) {
          try {
            console.log(`[VoiceScript] Requesting formatting via gemini-3.5-flash (Attempt ${attempt + 1}/${maxAttempts})`);
            const response = await aiClient.models.generateContent({
              model: "gemini-3.5-flash",
              contents: promptText,
              config: {
                systemInstruction: systemInstruction,
              },
            });

            formattedText = response.text || "";
            return res.json({ success: true, formattedText, provider: "Gemini (gemini-3.5-flash)" });
          } catch (err: any) {
            lastError = err;
            attempt++;
            console.warn(`[VoiceScript] Attempt ${attempt} with gemini-3.5-flash failed:`, err.message || err);
            
            // Check if error might be transient (like 503, 429, or network interruption)
            if (attempt < maxAttempts) {
              const backoffTime = 800 * attempt;
              console.log(`[VoiceScript] Waiting ${backoffTime}ms before retry...`);
              await delay(backoffTime);
            }
          }
        }

        // If primary model exhausted, try gemini-3.1-flash-lite
        try {
          console.log("[VoiceScript] Primary model exhausted or experiencing high demand. Falling back to gemini-3.1-flash-lite...");
          const response = await aiClient.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: promptText,
            config: {
              systemInstruction: systemInstruction,
            },
          });

          formattedText = response.text || "";
          return res.json({ success: true, formattedText, provider: "Gemini Fallback (gemini-3.1-flash-lite)" });
        } catch (fallbackErr: any) {
          console.error("[VoiceScript] Fallback gemini-3.1-flash-lite failed:", fallbackErr.message || fallbackErr);

          // Last-ditch effort: try gemini-flash-latest
          try {
            console.log("[VoiceScript] Final fallback attempt using gemini-flash-latest...");
            const response = await aiClient.models.generateContent({
              model: "gemini-flash-latest",
              contents: promptText,
              config: {
                systemInstruction: systemInstruction,
              },
            });

            formattedText = response.text || "";
            return res.json({ success: true, formattedText, provider: "Gemini Fallback (gemini-flash-latest)" });
          } catch (finalErr: any) {
            console.error("[VoiceScript] All Gemini model options failed:", finalErr.message || finalErr);
            throw lastError || finalErr;
          }
        }
      }

      return res.status(500).json({
        error: "No AI service key is available. Please set GEMINI_API_KEY in the Secrets panel.",
      });
    } catch (e: any) {
      console.error("Format error in backend:", e);
      return res.status(500).json({ error: e.message || "An unexpected error occurred during formatting." });
    }
  });

  // Serve static assets and handle routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[VoiceScript Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
