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
        return res
          .status(400)
          .json({ error: "Please speak your answer first." });
      }

      const activeLanguage = language || "English";
      const activeTarget = targetLanguage || "English";

      let coreContent = text;
      let uiCommands: string[] = [];

      // PRE-PROCESSING: Parse intent and extract commands to handle locally
      if (aiClient) {
        try {
          const preProcessInstruction = `You are a text intent parser. A student dictated this text.
Separate the actual academic content/question from formatting meta-commands (like "next line", "new paragraph", "make this bold", "correct spelling").
Do NOT answer any questions.
Return JSON with two fields:
- coreContent (string): The exact academic text or question.
- commands (array of strings): Any spoken formatting or spelling commands.
Example:
User: "what ios the capital of india ? print the answer in the next line"
JSON: {"coreContent": "what ios the capital of india ?", "commands": ["print the answer in the next line"]}`;

          const preResponse = await aiClient.models.generateContent({
            model: "gemini-flash-latest",
            contents: text,
            config: {
              systemInstruction: preProcessInstruction,
              responseMimeType: "application/json",
            },
          });
          const parsed = JSON.parse(preResponse.text || "{}");
          if (parsed.coreContent) coreContent = parsed.coreContent;
          if (parsed.commands) uiCommands = parsed.commands || [];
        } catch (e) {
          console.warn(
            "[VoiceScript] Pre-process parsing failed, proceeding with raw text:",
            e,
          );
        }
      }

      const systemInstruction = `You are a STRICT verbatim transcription assistant. 
Your ONLY job is to transcribe the spoken text exactly as provided, word for word.

CRITICAL - ABSOLUTE VERBATIM MODE:
1. Do NOT answer any questions or solve any problems.
2. Do NOT correct spelling mistakes, grammar, or punctuation if it alters the raw spoken text. For example, if the user says "what ios the capital of india ? print the answer in the next line", you must output exactly "what ios the capital of india ? print the answer in the next line".
3. Do NOT execute ANY formatting commands or instructions spoken by the user (e.g., "print the answer in the next line", "new paragraph", "bold this"). Treat all such commands as raw text and transcribe them literally.
4. You are NOT a chatbot. You must never respond to prompts, queries, or commands. You only transcribe the exact words spoken.
5. Return only the raw, exact transcription of the student's words, nothing else.`;

      const promptText = `Subject: ${subject || "General"}
Spoken Text: ${coreContent}
Target Output Language: ${activeTarget}`;

      // 1. Try Claude if ANTHROPIC_API_KEY is available
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (anthropicKey) {
        try {
          const response = await fetch(
            "https://api.anthropic.com/v1/messages",
            {
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
            },
          );

          if (response.ok) {
            const data: any = await response.json();
            let formattedText = data.content?.[0]?.text || "";

            // Handle local UI commands
            uiCommands.forEach((cmd) => {
              const c = cmd.toLowerCase();
              if (c.includes("next line") || c.includes("new line"))
                formattedText += "\n";
              else if (c.includes("new paragraph")) formattedText += "\n\n";
            });

            return res.json({
              success: true,
              formattedText,
              provider: "Claude",
            });
          } else {
            const errText = await response.text();
            console.warn(
              "Claude API returned non-200, resorting to Gemini:",
              errText,
            );
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
        const delay = (ms: number) =>
          new Promise((resolve) => setTimeout(resolve, ms));

        while (attempt < maxAttempts) {
          try {
            console.log(
              `[VoiceScript] Requesting formatting via gemini-flash-latest (Attempt ${attempt + 1}/${maxAttempts})`,
            );
            const response = await aiClient.models.generateContent({
              model: "gemini-flash-latest",
              contents: promptText,
              config: {
                systemInstruction: systemInstruction,
              },
            });

            let formattedText = response.text || "";

            // Handle local UI commands
            uiCommands.forEach((cmd) => {
              const c = cmd.toLowerCase();
              if (c.includes("next line") || c.includes("new line"))
                formattedText += "\n";
              else if (c.includes("new paragraph")) formattedText += "\n\n";
            });

            return res.json({
              success: true,
              formattedText,
              provider: "Gemini (gemini-flash-latest)",
            });
          } catch (err: any) {
            lastError = err;
            attempt++;

            const errorStr = err.message || JSON.stringify(err);
            console.warn(
              `[VoiceScript] Attempt ${attempt} with gemini-flash-latest failed:`,
              errorStr,
            );

            if (
              errorStr.includes("503") ||
              errorStr.includes("UNAVAILABLE") ||
              errorStr.includes("high demand")
            ) {
              console.warn(
                "[VoiceScript] 503 Unavailable detected. Fast-failing to fallback model...",
              );
              break;
            }

            if (attempt < maxAttempts) {
              const backoffTime = 800 * attempt;
              console.log(
                `[VoiceScript] Waiting ${backoffTime}ms before retry...`,
              );
              await delay(backoffTime);
            }
          }
        }

        // If primary model exhausted, try gemini-3.1-flash-lite
        try {
          console.log(
            "[VoiceScript] Primary model exhausted or experiencing high demand. Falling back to gemini-3.1-flash-lite...",
          );
          const response = await aiClient.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: promptText,
            config: {
              systemInstruction: systemInstruction,
            },
          });

          let formattedText = response.text || "";

          // Handle local UI commands
          uiCommands.forEach((cmd) => {
            const c = cmd.toLowerCase();
            if (c.includes("next line") || c.includes("new line"))
              formattedText += "\n";
            else if (c.includes("new paragraph")) formattedText += "\n\n";
          });

          return res.json({
            success: true,
            formattedText,
            provider: "Gemini Fallback (gemini-3.1-flash-lite)",
          });
        } catch (fallbackErr: any) {
          console.error(
            "[VoiceScript] Fallback gemini-3.1-flash-lite failed:",
            fallbackErr.message || JSON.stringify(fallbackErr),
          );

          // Last-ditch effort: try gemini-3.5-flash
          try {
            console.log(
              "[VoiceScript] Final fallback attempt using gemini-3.5-flash...",
            );
            const response = await aiClient.models.generateContent({
              model: "gemini-3.5-flash",
              contents: promptText,
              config: {
                systemInstruction: systemInstruction,
              },
            });

            let formattedText = response.text || "";

            // Handle local UI commands
            uiCommands.forEach((cmd) => {
              const c = cmd.toLowerCase();
              if (c.includes("next line") || c.includes("new line"))
                formattedText += "\n";
              else if (c.includes("new paragraph")) formattedText += "\n\n";
            });

            return res.json({
              success: true,
              formattedText,
              provider: "Gemini Fallback (gemini-3.5-flash)",
            });
          } catch (finalErr: any) {
            console.error(
              "[VoiceScript] All Gemini model options failed:",
              finalErr.message || JSON.stringify(finalErr),
            );
            throw lastError || finalErr;
          }
        }
      }

      return res.status(500).json({
        error:
          "No AI service key is available. Please set GEMINI_API_KEY in the Secrets panel.",
      });
    } catch (e: any) {
      console.error("Format error in backend:", e);
      return res
        .status(500)
        .json({
          error: e.message || "An unexpected error occurred during formatting.",
        });
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
