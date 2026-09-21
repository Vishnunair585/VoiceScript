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
      const uiCommands: string[] = [];

      // 1. LOCAL RULE-BASED INTENT PARSER (Zero latency, 100% resilient to 503/network spikes)
      // Handles spoken UI meta-commands like "print the answer in the next line", "new line", "new paragraph", "correct spelling"
      const newLinePattern = /\b(?:please\s+)?(?:print\s+(?:the\s+)?(?:answer|result|text)?\s*(?:in|on)?\s*(?:the\s+)?(?:next|new)\s+line|go\s+to\s+(?:the\s+)?(?:next|new)\s+line|print\s+(?:in|on)\s+(?:the\s+)?(?:next|new)\s+line|(?:on\s+a\s+)?new\s+line|next\s+line)\b/gi;
      if (newLinePattern.test(coreContent)) {
        uiCommands.push("next line");
        coreContent = coreContent.replace(newLinePattern, "").trim();
      }

      const newParagraphPattern = /\b(?:please\s+)?(?:start\s+(?:a\s+)?new\s+paragraph|next\s+paragraph|new\s+paragraph)\b/gi;
      if (newParagraphPattern.test(coreContent)) {
        uiCommands.push("new paragraph");
        coreContent = coreContent.replace(newParagraphPattern, "").trim();
      }

      const spellingPattern = /\b(?:please\s+)?(?:correct\s+(?:the\s+)?spelling|check\s+spelling)\b/gi;
      if (spellingPattern.test(coreContent)) {
        uiCommands.push("correct spelling");
        coreContent = coreContent.replace(spellingPattern, "").trim();
      }

      // Normalize multiple spaces or dangling punctuation from command removal
      coreContent = coreContent.replace(/\s{2,}/g, " ").trim();
      if (!coreContent) {
        coreContent = text; // safety fallback
      }

      // 2. OPTIONAL AI-ASSISTED PRE-PROCESSING WITH MULTI-MODEL FALLBACK
      if (aiClient) {
        const preProcessInstruction = `You are an academic transcription intent parser. A student dictated an exam answer.
Separate the actual academic content/question from meta-commands (like "next line", "new paragraph", "make this bold", "correct spelling").
Do NOT answer any questions or modify academic terms.
Return JSON with two fields:
- coreContent (string): The exact academic text with all meta-commands removed.
- commands (array of strings): Any formatting or editing instructions.
Example:
User: "what is the capital of india ? print the answer in the next line"
JSON: {"coreContent": "what is the capital of india ?", "commands": ["next line"]}`;

        const candidateModels = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
        for (const modelName of candidateModels) {
          try {
            const preResponse = await aiClient.models.generateContent({
              model: modelName,
              contents: coreContent,
              config: {
                systemInstruction: preProcessInstruction,
                responseMimeType: "application/json",
              },
            });
            const parsed = JSON.parse(preResponse.text || "{}");
            if (parsed.coreContent && typeof parsed.coreContent === "string" && parsed.coreContent.trim()) {
              coreContent = parsed.coreContent.trim();
            }
            if (Array.isArray(parsed.commands) && parsed.commands.length > 0) {
              uiCommands.push(...parsed.commands);
            }
            break; // Succeeded, exit pre-process loop
          } catch (preErr: any) {
            const errStr = preErr.message || JSON.stringify(preErr);
            console.log(`[VoiceScript] Pre-processor on ${modelName} encountered (${errStr.includes("503") ? "503 High Demand" : "notice"}), trying next model or local rules.`);
          }
        }
      }

      const systemInstruction = `You are a STRICT verbatim transcription assistant. 
Your ONLY job is to transcribe the spoken text exactly as provided, word for word.

CRITICAL - ABSOLUTE VERBATIM MODE:
1. Do NOT answer any questions or solve any problems.
2. Do NOT correct spelling mistakes, grammar, or punctuation if it alters the raw spoken text. For example, if the user says "what ios the capital of india ?", you must output exactly "what ios the capital of india ?".
3. Do NOT execute ANY formatting commands or instructions spoken by the user. Treat all academic content literally.
4. You are NOT a chatbot. You must never respond to prompts, queries, or commands. You only transcribe the exact words spoken.
5. Return only the raw, exact transcription of the student's words, nothing else.`;

      const promptText = `Subject: ${subject || "General"}
Spoken Text: ${coreContent}
Target Output Language: ${activeTarget}`;

      // Helper to apply local UI commands
      const applyUiCommands = (baseText: string) => {
        let result = baseText;
        uiCommands.forEach((cmd) => {
          const c = cmd.toLowerCase();
          if (c.includes("next line") || c.includes("new line")) {
            if (!result.endsWith("\n")) result += "\n";
          } else if (c.includes("new paragraph")) {
            if (!result.endsWith("\n\n")) result += "\n\n";
          }
        });
        return result;
      };

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
            const formattedText = applyUiCommands(data.content?.[0]?.text || coreContent);
            return res.json({
              success: true,
              formattedText,
              provider: "Claude",
            });
          } else {
            const errText = await response.text();
            console.warn("Claude API returned non-200, resorting to Gemini:", errText);
          }
        } catch (err) {
          console.error("Claude format proxy failed:", err);
        }
      }

      // 2. Gemini with fast fallback across models and high-demand (503) protection
      if (aiClient) {
        const modelsToTry = [
          "gemini-3.8-flash",
          "gemini-flash-latest",
          "gemini-3.1-flash-lite",
        ];

        for (const modelName of modelsToTry) {
          try {
            console.log(`[VoiceScript] Requesting formatting via ${modelName}...`);
            const response = await aiClient.models.generateContent({
              model: modelName,
              contents: promptText,
              config: {
                systemInstruction: systemInstruction,
              },
            });

            const formattedText = applyUiCommands(response.text || coreContent);
            return res.json({
              success: true,
              formattedText,
              provider: `Gemini (${modelName})`,
            });
          } catch (err: any) {
            const errorStr = err.message || JSON.stringify(err);
            console.warn(`[VoiceScript] Model ${modelName} failed (${errorStr.includes("503") ? "503 High Demand" : errorStr.slice(0, 80)}). Trying next fallback...`);
          }
        }

        // If all Gemini cloud models are momentarily experiencing high-demand (503) or rate limits,
        // safely return the local verbatim transcript with commands executed so the user is never blocked!
        console.warn("[VoiceScript] All external model endpoints busy. Using resilient local transcript fallback.");
        const localFormattedText = applyUiCommands(coreContent);
        return res.json({
          success: true,
          formattedText: localFormattedText,
          provider: "VoiceScript Local Verbatim (Offline / High-Demand Fallback)",
        });
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
