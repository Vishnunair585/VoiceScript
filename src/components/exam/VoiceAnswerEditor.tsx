import React, { useState, useEffect, useRef } from "react";
import {
  ExamQuestion,
  CandidateAnswer,
  DiagramShape,
  CandidateAccommodations,
} from "../../types";
import { KaTeXText } from "../KaTeXText";
import { DiagramCanvas } from "./DiagramCanvas";
import {
  parseVoiceCommand,
  applyEditingAction,
  VoiceCommandAction,
} from "../../lib/voiceCommands";
import { spokenMathToLaTeX, isLikelyMathExpression } from "../../lib/mathVoice";
import { parseDiagramVoiceCommand, isLikelyDiagramCommand } from "../../lib/diagramVoice";
import { VoiceCommandCheatsheet, VoiceCommandItem } from "../VoiceCommandCheatsheet";
import { soundFeedback, normalizeAcademicSpeech, getCleanMicAudioStream } from "../../lib/speechAccuracy";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Flag,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Hash,
  List,
  ListOrdered,
  Heading2,
  FileText,
  RotateCcw,
  Eraser,
  Eye,
  Type,
  ArrowLeft,
  ArrowRight,
  Compass,
} from "lucide-react";

interface VoiceAnswerEditorProps {
  question: ExamQuestion;
  answer: CandidateAnswer;
  onAnswerChange: (newAnswer: CandidateAnswer, auditDetails?: string) => void;
  accommodations: CandidateAccommodations;
  onNavigateNext: () => void;
  onNavigatePrev: () => void;
  onTimeQuery: () => void;
  onGoToReview: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function VoiceAnswerEditor({
  question,
  answer,
  onAnswerChange,
  accommodations,
  onNavigateNext,
  onNavigatePrev,
  onTimeQuery,
  onGoToReview,
  hasPrev,
  hasNext,
}: VoiceAnswerEditorProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [lastCommandFeedback, setLastCommandFeedback] = useState<string | null>(null);
  const [previewMath, setPreviewMath] = useState(true);
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(true);
  const [showDiagram, setShowDiagram] = useState(
    question.type === "diagram" || Boolean(answer.diagramShapes && answer.diagramShapes.length > 0)
  );

  useEffect(() => {
    setShowDiagram(question.type === "diagram" || Boolean(answer.diagramShapes && answer.diagramShapes.length > 0));
  }, [question.id]);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const isSpeakingTtsRef = useRef<boolean>(false);
  const hasAnnouncedMicActiveRef = useRef<boolean>(false);
  const lastExecutedCommandRef = useRef<{ text: string; time: number }>({ text: "", time: 0 });
  const currentAnswerRef = useRef<CandidateAnswer>(answer);
  currentAnswerRef.current = answer;

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  // Auto-read question if candidate accommodation is enabled
  useEffect(() => {
    if (accommodations.autoReadQuestions) {
      speakText(`Question ${question.number}. ${question.prompt}`);
    }
  }, [question.id]);

  // Clean up speech and synthesis on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      hasAnnouncedMicActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text-To-Speech helper
  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    isSpeakingTtsRef.current = true;
    setIsSpeakingTts(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = accommodations.speechRate || 1.0;
    utterance.onstart = () => {
      isSpeakingTtsRef.current = true;
      setIsSpeakingTts(true);
    };
    utterance.onend = () => {
      setTimeout(() => {
        isSpeakingTtsRef.current = false;
        setIsSpeakingTts(false);
      }, 200);
    };
    utterance.onerror = () => {
      isSpeakingTtsRef.current = false;
      setIsSpeakingTts(false);
    };
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeakingTts = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      isSpeakingTtsRef.current = false;
      setIsSpeakingTts(false);
    }
  };

  // Provide spoken confirmation if voiceFeedback accommodation is active (with loop-safe TTS gating)
  const confirmFeedback = (msg: string) => {
    setLastCommandFeedback(msg);
    if (accommodations.voiceFeedback && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        isSpeakingTtsRef.current = true;
        setIsSpeakingTts(true);
        const u = new SpeechSynthesisUtterance(msg);
        u.rate = accommodations.speechRate || 1.1;
        u.onend = () => {
          setTimeout(() => {
            isSpeakingTtsRef.current = false;
            setIsSpeakingTts(false);
          }, 200);
        };
        u.onerror = () => {
          isSpeakingTtsRef.current = false;
          setIsSpeakingTts(false);
        };
        window.speechSynthesis.speak(u);
      } catch {
        isSpeakingTtsRef.current = false;
        setIsSpeakingTts(false);
      }
    }
    setTimeout(() => {
      setLastCommandFeedback((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Toggle speech recognition
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (!SpeechRecognition) {
      alert("Web Speech Recognition is not supported on this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      hasAnnouncedMicActiveRef.current = false;
      const recognizer = new SpeechRecognition();
      recognitionRef.current = recognizer;
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = "en-US";
      recognizer.maxAlternatives = 3;

      recognizer.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        // Only announce and chime ONCE per intentional user activation.
        // Web Speech API regularly restarts recognition after silence/onend, which must NOT re-announce!
        if (!hasAnnouncedMicActiveRef.current) {
          hasAnnouncedMicActiveRef.current = true;
          soundFeedback.play("mic_on");
          setLastCommandFeedback("Microphone active. You may speak your answer or voice commands.");
          if (accommodations.voiceFeedback && "speechSynthesis" in window) {
            confirmFeedback("Microphone active");
          }
          setTimeout(() => {
            setLastCommandFeedback((prev) => (prev?.includes("Microphone active") ? null : prev));
          }, 3500);
        }
      };

      recognizer.onerror = (e: any) => {
        if (e.error !== "no-speech") {
          console.warn("Speech recognition error:", e.error);
        }
      };

      recognizer.onend = () => {
        // If still expected to listen, restart gracefully without repeating greeting
        if (isListeningRef.current) {
          try {
            recognizer.start();
          } catch {
            setTimeout(() => {
              if (isListeningRef.current) {
                try {
                  recognizer.start();
                } catch {}
              }
            }, 250);
          }
        } else {
          setIsListening(false);
        }
      };

      recognizer.onresult = (event: any) => {
        // Avoid picking up machine's own TTS output
        if (isSpeakingTtsRef.current || ("speechSynthesis" in window && window.speechSynthesis.speaking)) return;

        let interim = "";
        let finalUtterance = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalUtterance += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        setInterimTranscript(interim);

        // Immediate recognition for urgent navigation and repeat commands from interim stream!
        // This eliminates the 2-3 second delay where the user felt stuck waiting for isFinal.
        if (interim.trim()) {
          const testParse = parseVoiceCommand(interim.trim());
          if (
            testParse.isCommand &&
            (testParse.action.type === "NAVIGATE_NEXT" ||
              testParse.action.type === "NAVIGATE_PREV" ||
              testParse.action.type === "READ_QUESTION" ||
              testParse.action.type === "READ_ANSWER" ||
              testParse.action.type === "CHECK_TIME" ||
              testParse.action.type === "TOGGLE_FLAG" ||
              testParse.action.type === "TOGGLE_CHEATSHEET" ||
              testParse.action.type === "GO_TO_REVIEW")
          ) {
            const now = Date.now();
            if (now - lastExecutedCommandRef.current.time > 1100) {
              lastExecutedCommandRef.current = {
                text: interim.trim().toLowerCase(),
                time: now,
              };
              setInterimTranscript("");
              processSpokenUtterance(interim.trim());
              return;
            }
          }
        }

        if (finalUtterance.trim()) {
          const now = Date.now();
          const cleanUtterance = finalUtterance.trim().toLowerCase();
          // Avoid double execution if already handled by the interim trigger
          if (
            now - lastExecutedCommandRef.current.time < 1100 &&
            (cleanUtterance.includes(lastExecutedCommandRef.current.text) ||
              lastExecutedCommandRef.current.text.includes(cleanUtterance))
          ) {
            return;
          }
          lastExecutedCommandRef.current = { text: cleanUtterance, time: now };
          processSpokenUtterance(finalUtterance.trim());
        }
      };

      isListeningRef.current = true;
      recognizer.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      isListeningRef.current = false;
      setIsListening(false);
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    hasAnnouncedMicActiveRef.current = false;
    setIsListening(false);
    soundFeedback.play("mic_off");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setInterimTranscript("");
  };

  // Central Spoken Utterance Processor
  const processSpokenUtterance = (utterance: string) => {
    const parseResult = parseVoiceCommand(utterance);
    const currAns = currentAnswerRef.current;

    if (parseResult.isCommand) {
      const action = parseResult.action;

      // 1. Navigation
      if (action.type === "NAVIGATE_NEXT") {
        soundFeedback.play("page_turn");
        confirmFeedback("Moving to next page");
        onNavigateNext();
        return;
      }
      if (action.type === "NAVIGATE_PREV") {
        soundFeedback.play("page_turn");
        confirmFeedback("Moving to previous page");
        onNavigatePrev();
        return;
      }
      if (action.type === "CHECK_TIME") {
        soundFeedback.play("command_success");
        confirmFeedback("Checking remaining time");
        onTimeQuery();
        return;
      }
      if (action.type === "GO_TO_REVIEW") {
        soundFeedback.play("command_success");
        confirmFeedback("Opening review summary");
        onGoToReview();
        return;
      }
      if (action.type === "READ_QUESTION") {
        setLastCommandFeedback("Repeating question prompt aloud");
        speakText(`Question ${question.number}. ${question.prompt}`);
        setTimeout(() => {
          setLastCommandFeedback((prev) => (prev === "Repeating question prompt aloud" ? null : prev));
        }, 3500);
        return;
      }
      if (action.type === "READ_ANSWER") {
        const textToRead =
          currAns.textAnswer ||
          (currAns.selectedOption
            ? `Selected option ${currAns.selectedOption}`
            : "You have not recorded an answer yet.");
        setLastCommandFeedback("Reading recorded answer aloud");
        speakText(textToRead);
        setTimeout(() => {
          setLastCommandFeedback((prev) => (prev === "Reading recorded answer aloud" ? null : prev));
        }, 3500);
        return;
      }
      if (action.type === "TOGGLE_FLAG") {
        const newFlag = !currAns.isFlaggedForReview;
        onAnswerChange(
          { ...currAns, isFlaggedForReview: newFlag },
          `Toggled review flag to ${newFlag ? "FLAGGED" : "UNFLAGGED"}`
        );
        confirmFeedback(newFlag ? "Question marked for review" : "Flag removed");
        return;
      }
      if (action.type === "TOGGLE_CHEATSHEET") {
        setShowCheatsheet((prev) => !prev);
        confirmFeedback("Toggled voice command cheatsheet");
        return;
      }

      // 2. MCQ Option Selection
      if (action.type === "SELECT_OPTION") {
        onAnswerChange(
          {
            ...currAns,
            selectedOption: action.optionKey,
            lastModified: Date.now(),
          },
          `Selected MCQ Option ${action.optionKey}`
        );
        confirmFeedback(`Selected option ${action.optionKey}`);
        return;
      }

      // 2b. Toggle Diagram Canvas
      if (action.type === "TOGGLE_DIAGRAM") {
        setShowDiagram(action.show);
        confirmFeedback(action.show ? "Diagram drawing canvas opened" : "Diagram canvas closed");
        return;
      }

      // 3. Math Mode Conversion
      if (action.type === "MATH_MODE") {
        if (!action.mathSpeech.trim()) {
          confirmFeedback("Math mode active. Speak formula, such as 'x squared plus y squared equals r squared'");
          return;
        }
        const mathRes = spokenMathToLaTeX(action.mathSpeech);
        const latexToInsert = mathRes.latex || action.mathSpeech;
        const mathBlock = `\n$$${latexToInsert}$$\n`;
        const updatedText = (currAns.textAnswer ? currAns.textAnswer.trimEnd() + mathBlock : mathBlock).trim();
        const wordCount = updatedText.split(/\s+/).filter(Boolean).length;

        onAnswerChange(
          {
            ...currAns,
            textAnswer: updatedText,
            latexMath: latexToInsert,
            wordCount,
            lastModified: Date.now(),
            revisionCount: currAns.revisionCount + 1,
          },
          `Inserted math formula: ${latexToInsert}`
        );
        confirmFeedback(`Formatted math formula: ${latexToInsert}`);
        return;
      }

      // 3b. Diagram Command Execution
      if (action.type === "DIAGRAM_COMMAND") {
        const diagramResult = parseDiagramVoiceCommand(
          action.diagramSpeech,
          currAns.diagramShapes || []
        );
        setShowDiagram(true);
        onAnswerChange(
          {
            ...currAns,
            diagramShapes: diagramResult.shapes,
            lastModified: Date.now(),
            revisionCount: currAns.revisionCount + 1,
          },
          `Diagram: ${diagramResult.description}`
        );
        confirmFeedback(diagramResult.description);
        return;
      }

      // 4. Text Editing / Structuring actions
      const updatedText = applyEditingAction(currAns.textAnswer, action);
      const wordCount = updatedText.split(/\s+/).filter(Boolean).length;
      onAnswerChange(
        {
          ...currAns,
          textAnswer: updatedText,
          wordCount,
          lastModified: Date.now(),
          revisionCount: currAns.revisionCount + 1,
        },
        `Executed voice command: ${action.type}`
      );
      confirmFeedback(parseResult.feedbackMessage || "Command executed");
    } else {
      // Direct dictation text with high-accuracy academic normalization
      const normalizedUtterance = normalizeAcademicSpeech(utterance);
      const newRawTranscript = (currAns.rawTranscript ? currAns.rawTranscript + " " : "") + utterance;
      const needsSpace = currAns.textAnswer.length > 0 && !/[\s\n]$/.test(currAns.textAnswer);
      const updatedText = currAns.textAnswer + (needsSpace ? " " : "") + normalizedUtterance;
      const wordCount = updatedText.split(/\s+/).filter(Boolean).length;

      onAnswerChange(
        {
          ...currAns,
          textAnswer: updatedText,
          rawTranscript: newRawTranscript,
          wordCount,
          lastModified: Date.now(),
          revisionCount: currAns.revisionCount + 1,
        },
        `Dictated: "${utterance.slice(0, 40)}..."`
      );
    }
  };

  // Manual MCQ Selection
  const handleSelectOption = (key: string) => {
    onAnswerChange(
      {
        ...answer,
        selectedOption: key,
        lastModified: Date.now(),
      },
      `Selected Option ${key}`
    );
  };

  // Diagram change handler
  const handleDiagramChange = (shapes: DiagramShape[]) => {
    onAnswerChange(
      {
        ...answer,
        diagramShapes: shapes,
        lastModified: Date.now(),
      },
      `Modified diagram elements (count: ${shapes.length})`
    );
  };

  // Structuring shortcuts
  const handleInsertStructure = (template: "intro" | "conclusion" | "bullet" | "numbered" | "heading") => {
    let action: VoiceCommandAction;
    switch (template) {
      case "intro":
        action = { type: "INSERT_INTRO" };
        break;
      case "conclusion":
        action = { type: "INSERT_CONCLUSION" };
        break;
      case "bullet":
        action = { type: "ADD_BULLET", bulletText: "" };
        break;
      case "numbered":
        action = { type: "ADD_NUMBERED", pointText: "" };
        break;
      case "heading":
        action = { type: "INSERT_HEADING", headingText: "Key Analysis" };
        break;
    }
    const updated = applyEditingAction(answer.textAnswer, action);
    onAnswerChange(
      {
        ...answer,
        textAnswer: updated,
        wordCount: updated.split(/\s+/).filter(Boolean).length,
        lastModified: Date.now(),
      },
      `Inserted structuring: ${template}`
    );
  };

  const highContrast = !!accommodations.highContrast;

  return (
    <div className={`flex-1 flex flex-col gap-3 min-h-0 overflow-hidden ${highContrast ? "text-yellow-300" : ""}`}>
      {/* Question Header Card (Compact, Non-Scrollable) */}
      <div className={`shrink-0 ${highContrast ? "bg-black border-2 border-yellow-400 text-yellow-300" : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100"} rounded-2xl p-4 sm:p-5 shadow-xs`}>
        <div className={`flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b ${highContrast ? "border-yellow-500" : "border-stone-200 dark:border-stone-800"}`}>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg ${highContrast ? "bg-yellow-400 text-black font-black" : "bg-blue-600 text-white font-black"} font-mono text-xs sm:text-sm`}>
              Q{question.number}
            </span>
            <span className={`text-xs font-bold ${highContrast ? "text-yellow-400" : "text-stone-500"} uppercase tracking-wider`}>
              {question.section}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-md ${highContrast ? "bg-yellow-950 border border-yellow-400 text-yellow-300" : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"} font-semibold capitalize`}>
              {question.type.replace("_", " ")}
            </span>
            <span className={`text-xs font-mono font-bold ${highContrast ? "text-yellow-400" : "text-blue-600 dark:text-blue-400"}`}>
              {question.marks} Marks
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Flag button */}
            <button
              type="button"
              onClick={() => {
                const newFlag = !answer.isFlaggedForReview;
                onAnswerChange(
                  { ...answer, isFlaggedForReview: newFlag },
                  `Toggled review flag to ${newFlag}`
                );
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                answer.isFlaggedForReview
                  ? (highContrast ? "bg-yellow-400 text-black border-yellow-400" : "bg-amber-500 text-white border-amber-600 shadow-xs")
                  : (highContrast ? "bg-black text-yellow-300 border-yellow-400 hover:bg-yellow-950/40" : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:border-amber-400")
              }`}
            >
              <Flag className={`w-3.5 h-3.5 ${answer.isFlaggedForReview ? (highContrast ? "fill-black" : "fill-white") : ""}`} />
              <span className="hidden sm:inline">{answer.isFlaggedForReview ? "Flagged" : "Flag"}</span>
            </button>

            {/* Read question TTS button */}
            <button
              type="button"
              onClick={() => {
                if (isSpeakingTts) {
                  stopSpeakingTts();
                } else {
                  speakText(`Question ${question.number}. ${question.prompt}`);
                }
              }}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                isSpeakingTts
                  ? (highContrast ? "bg-yellow-400 text-black border-yellow-400 animate-pulse" : "bg-blue-600 text-white border-blue-600 animate-pulse")
                  : (highContrast ? "bg-black text-yellow-300 border-yellow-400 hover:bg-yellow-950/40" : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:border-blue-500")
              }`}
              title={isSpeakingTts ? "Stop reading" : "Read question prompt aloud"}
            >
              {isSpeakingTts ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className={`w-3.5 h-3.5 ${highContrast ? "text-yellow-400" : "text-blue-600"}`} />}
              <span className="hidden sm:inline">{isSpeakingTts ? "Stop Audio" : "Read Prompt"}</span>
            </button>
          </div>
        </div>

        {/* Prompt Text */}
        <div className={`mt-2.5 text-sm sm:text-base font-medium ${highContrast ? "text-yellow-200" : "text-stone-900 dark:text-stone-100"} leading-snug`}>
          {question.prompt}
        </div>

        {/* Math Template Hint if available */}
        {question.mathTemplate && (
          <div className={`mt-2 p-2 rounded-lg border flex items-center justify-between text-xs ${
            highContrast ? "bg-yellow-950/50 border-yellow-400 text-yellow-300" : "bg-blue-50/60 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900"
          }`}>
            <span className={highContrast ? "text-yellow-300 font-medium" : "text-blue-800 dark:text-blue-300 font-medium"}>
              Expression reference:
            </span>
            <span className={`font-mono font-bold ${highContrast ? "text-yellow-300" : "text-stone-800 dark:text-stone-200"}`}>
              ${question.mathTemplate}$
            </span>
          </div>
        )}
      </div>

      {/* MAIN WORKSPACE GRID:
          Center Area (8 cols): Divided into Template 1 (Input) & Template 2 (Output) side-by-side
          Right Panel (4 cols): Operations (Maths, Signs, Science, Diagrams)
      */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
        {/* CENTER AREA (8 cols): Divided into Template 1 (Input) & Template 2 (Output) side-by-side */}
        <div className="xl:col-span-8 flex flex-col min-h-0 h-full overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0 overflow-hidden">
            {/* TEMPLATE 1: Spoken Dictation / Speech Input */}
            <div
              className={`h-full flex flex-col rounded-2xl border p-3 sm:p-3.5 shadow-xs overflow-hidden ${
                highContrast
                  ? "bg-black border-2 border-yellow-400 text-yellow-300"
                  : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800"
              }`}
            >
              {/* Template 1 Header */}
              <div
                className={`flex items-center justify-between pb-2 border-b shrink-0 ${
                  highContrast ? "border-yellow-500" : "border-stone-200 dark:border-stone-800"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Mic className={`w-3.5 h-3.5 ${highContrast ? "text-yellow-400" : "text-[#e07a5f]"}`} />
                  <span className={`text-xs font-black uppercase tracking-wider ${highContrast ? "text-yellow-300" : "text-[#3d5b59] dark:text-[#a5cfcc]"}`}>
                    Spoken Dictation (Input)
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {/* Primary Mic Toggle */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition-all ${
                      isListening
                        ? (highContrast ? "bg-red-600 text-white ring-2 ring-yellow-400 animate-pulse shadow-xs" : "bg-[#e07a5f] hover:bg-[#cc674e] text-white shadow-xs animate-pulse ring-2 ring-[#e07a5f]/40")
                        : (highContrast ? "bg-yellow-400 text-black hover:bg-yellow-300 font-black shadow-2xs" : "bg-[#3d5b59] hover:bg-[#273b3a] text-white shadow-2xs")
                    }`}
                  >
                    {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    <span>{isListening ? "Stop Mic" : "Start Dictating"}</span>
                  </button>

                  {/* Scratch That */}
                  <button
                    type="button"
                    onClick={() => {
                      const words = answer.textAnswer.trimEnd().split(/\s+/);
                      words.pop();
                      const updated = words.join(" ");
                      onAnswerChange(
                        {
                          ...answer,
                          textAnswer: updated,
                          wordCount: words.filter(Boolean).length,
                          lastModified: Date.now(),
                        },
                        "Voice shortcut: Scratch that"
                      );
                      confirmFeedback("Erased last word");
                    }}
                    disabled={!answer.textAnswer.trim()}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer disabled:opacity-35 ${
                      highContrast
                        ? "border-yellow-400 bg-black text-yellow-300 hover:bg-yellow-950/40"
                        : "border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 text-stone-700 dark:text-stone-300"
                    }`}
                    title="Say or click 'scratch that' to delete last word"
                  >
                    Undo
                  </button>

                  {/* Clear text */}
                  <button
                    type="button"
                    onClick={() => {
                      onAnswerChange(
                        {
                          ...answer,
                          textAnswer: "",
                          wordCount: 0,
                          lastModified: Date.now(),
                        },
                        "Cleared answer text"
                      );
                      confirmFeedback("Cleared text");
                    }}
                    disabled={!answer.textAnswer.trim()}
                    className={`p-1 rounded-lg border text-[11px] font-semibold cursor-pointer disabled:opacity-35 ${
                      highContrast
                        ? "border-yellow-400 text-yellow-300 hover:bg-yellow-950/40"
                        : "border-stone-200 dark:border-stone-700 text-stone-500 hover:text-red-600"
                    }`}
                    title="Clear input"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Hearing interim speech */}
              {isListening && interimTranscript && (
                <div
                  className={`mt-1.5 p-1.5 rounded-lg border border-dashed text-xs italic shrink-0 ${
                    highContrast
                      ? "bg-black border-yellow-400 text-yellow-300"
                      : "bg-blue-50/60 dark:bg-blue-950/40 border-blue-400 text-blue-700 dark:text-blue-300"
                  }`}
                >
                  Hearing: <span className="font-bold underline">"{interimTranscript}"</span>
                </div>
              )}

              {/* Multiple Choice Options (If MCQ) */}
              {question.type === "mcq" && question.options && (
                <div className="my-2 shrink-0">
                  <span className={`text-[10px] font-bold ${highContrast ? "text-yellow-400" : "text-stone-500"} uppercase tracking-wider block mb-1`}>
                    Choose Option (or say "Select option A/B/C/D"):
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {question.options.map((opt) => {
                      const isSelected = answer.selectedOption === opt.key;
                      return (
                        <button
                          key={`opt-${opt.key}`}
                          type="button"
                          onClick={() => handleSelectOption(opt.key)}
                          className={`p-1.5 px-2 rounded-xl border text-left transition-all flex items-center gap-1.5 cursor-pointer ${
                            highContrast
                              ? isSelected
                                ? "border-2 border-yellow-400 bg-yellow-950/60 text-yellow-300 shadow-xs"
                                : "border border-yellow-600/70 hover:border-yellow-400 bg-black text-yellow-200"
                              : isSelected
                              ? "border-blue-600 bg-blue-50 dark:bg-blue-950/60 ring-1 ring-blue-500 shadow-xs"
                              : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md text-[11px] font-mono font-black flex items-center justify-center shrink-0 ${
                              highContrast
                                ? isSelected
                                  ? "bg-yellow-400 text-black font-black"
                                  : "bg-yellow-950 border border-yellow-500 text-yellow-300"
                                : isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className={`text-[11px] font-medium truncate ${highContrast ? "text-yellow-200 font-bold" : "text-stone-900 dark:text-stone-100"}`}>
                            {opt.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dictation Textarea (Takes full remaining space) */}
              <div className="mt-2 flex-1 min-h-0 flex flex-col">
                <textarea
                  value={answer.textAnswer}
                  onChange={(e) => {
                    const text = e.target.value;
                    const wordCount = text.split(/\s+/).filter(Boolean).length;
                    onAnswerChange(
                      {
                        ...answer,
                        textAnswer: text,
                        wordCount,
                        lastModified: Date.now(),
                      },
                      "Manual text edit"
                    );
                  }}
                  placeholder="Whatever you speak records here live in real time... (Say equations like 'fraction 1 over 2', 'x squared', or formulas from the right side)"
                  className={`w-full flex-1 p-3 rounded-xl border leading-relaxed font-sans resize-none ${
                    highContrast
                      ? "border-2 border-yellow-400 bg-black text-yellow-300 placeholder-yellow-600/70 focus:outline-hidden focus:ring-1 focus:ring-yellow-400 font-bold"
                      : "border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  } ${
                    accommodations.fontSize === "x-large"
                      ? "text-base"
                      : accommodations.fontSize === "large"
                      ? "text-sm"
                      : "text-xs sm:text-sm"
                  } ${accommodations.dyslexiaFont ? "tracking-wider font-mono" : ""}`}
                />
              </div>

              {/* Template 1 Footer */}
              <div
                className={`flex items-center justify-between text-[11px] pt-1.5 mt-1.5 border-t shrink-0 ${
                  highContrast ? "border-yellow-500 text-yellow-300" : "border-stone-200 dark:border-stone-800 text-stone-500"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>
                    Words: <strong className="font-mono">{answer.wordCount}</strong>
                    {question.wordLimit && ` / ${question.wordLimit}`}
                  </span>
                  <span>•</span>
                  <span>Revisions: <strong className="font-mono">{answer.revisionCount}</strong></span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Autosaved</span>
                </div>
              </div>
            </div>

            {/* TEMPLATE 2: Live Formatted Answer Output (Rendered Preview on the Right of Text) */}
            <div
              className={`h-full flex flex-col rounded-2xl border p-3 sm:p-3.5 shadow-xs overflow-hidden ${
                highContrast
                  ? "bg-black border-2 border-yellow-400 text-yellow-300"
                  : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800"
              }`}
            >
              {/* Template 2 Header */}
              <div
                className={`flex items-center justify-between pb-2 border-b shrink-0 ${
                  highContrast ? "border-yellow-500" : "border-stone-200 dark:border-stone-800"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className={`w-3.5 h-3.5 ${highContrast ? "text-yellow-400" : "text-[#e07a5f]"}`} />
                  <span className={`text-xs font-black uppercase tracking-wider ${highContrast ? "text-yellow-300" : "text-[#3d5b59] dark:text-[#a5cfcc]"}`}>
                    Formatted Output (Preview)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                    highContrast
                      ? "border-yellow-400 bg-yellow-950 text-yellow-300"
                      : "border-[#3d5b59]/30 dark:border-[#3d5b59]/50 bg-[#e8f1f0] dark:bg-[#253b3a] text-[#3d5b59] dark:text-[#a5cfcc]"
                  }`}>
                    KaTeX Math
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowDiagram(!showDiagram)}
                    className={`px-2 py-0.5 rounded-md border text-[11px] font-bold cursor-pointer flex items-center gap-1 ${
                      showDiagram || (answer.diagramShapes && answer.diagramShapes.length > 0)
                        ? "bg-purple-600 text-white border-purple-600"
                        : highContrast
                        ? "border-yellow-400 text-yellow-300"
                        : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100"
                    }`}
                    title="Toggle diagram drawing canvas"
                  >
                    <Compass className="w-3 h-3" />
                    <span>Diagram {answer.diagramShapes?.length ? `(${answer.diagramShapes.length})` : ""}</span>
                  </button>

                  {/* Read Answer Aloud Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isSpeakingTts) {
                        stopSpeakingTts();
                      } else {
                        speakText(answer.textAnswer || "No answer recorded yet.");
                      }
                    }}
                    disabled={!answer.textAnswer.trim() && !answer.selectedOption}
                    className={`p-1 rounded-md border text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 ${
                      highContrast
                        ? "border-yellow-400 bg-black text-yellow-300"
                        : "border-stone-200 dark:border-stone-700 hover:border-blue-500 text-stone-600 dark:text-stone-300"
                    }`}
                    title="Listen to your formatted answer read aloud"
                  >
                    <Volume2 className="w-3 h-3 text-blue-600" />
                  </button>
                </div>
              </div>

              {/* Template 2 Content (Positioned strictly right side of text, NEVER below!) */}
              <div className="mt-2 flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
                {/* MCQ Chosen Option Card Banner */}
                {question.type === "mcq" && answer.selectedOption && (
                  <div
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                      highContrast
                        ? "bg-yellow-950/60 border-yellow-400 text-yellow-300"
                        : "bg-blue-50/80 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-stone-900 dark:text-stone-100"
                    }`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-mono font-black text-xs flex items-center justify-center shrink-0">
                      {answer.selectedOption}
                    </span>
                    <div className="text-xs">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                        Selected Answer Option:
                      </span>
                      <span className="font-semibold">
                        {question.options?.find((o) => o.key === answer.selectedOption)?.text}
                      </span>
                    </div>
                  </div>
                )}

                {/* Rendered Diagram Canvas */}
                {(showDiagram || question.type === "diagram" || Boolean(answer.diagramShapes && answer.diagramShapes.length > 0)) && (
                  <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xs">
                    <DiagramCanvas
                      shapes={answer.diagramShapes || []}
                      onShapesChange={handleDiagramChange}
                      initialPrompt={question.diagramInitialPrompt}
                      isListening={isListening}
                    />
                  </div>
                )}

                {/* Rendered Formatted Answer / KaTeX Equations */}
                {answer.textAnswer.trim() ? (
                  <div
                    className={`p-3 rounded-xl border leading-relaxed min-h-[120px] ${
                      highContrast
                        ? "bg-black border-yellow-400 text-yellow-200"
                        : "bg-stone-50/60 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100"
                    }`}
                  >
                    <KaTeXText text={answer.textAnswer} />
                  </div>
                ) : !showDiagram && !answer.selectedOption ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-xl h-full text-stone-400 dark:text-stone-500">
                    <Sparkles className="w-8 h-8 mb-2 opacity-50 text-blue-500" />
                    <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
                      Formatted Output Displayed Here
                    </p>
                    <p className="text-[11px] mt-1 max-w-xs leading-relaxed">
                      Whatever you speak records in the left template and renders here on the right with math formulas, signs, diagrams, and formatted text without scrolling.
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Template 2 Footer */}
              <div
                className={`pt-1.5 mt-1.5 border-t shrink-0 flex items-center justify-between text-[10px] ${
                  highContrast ? "border-yellow-500 text-yellow-300" : "border-stone-200 dark:border-stone-800 text-stone-500"
                }`}
              >
                <span className="font-medium">Live Rendered Document View</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">Single-Page Accessible View</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (4 cols): Operations (Maths, Signs, Science & Diagrams) */}
        <div className="xl:col-span-4 flex flex-col min-h-0 h-full overflow-hidden">
          <VoiceCommandCheatsheet
            mode="answering"
            variant="side-panel"
            highContrast={highContrast}
            defaultTab="math"
            allowedTabs={["math", "signs", "science", "diagrams"]}
            title="Operations: Maths, Signs & Diagrams"
            hideNavigationCommands={true}
            onSelectCommand={(cmd) => {
              if (cmd.phrase.startsWith("select option")) {
                const match = cmd.phrase.match(/select option\s+([A-D])/i);
                if (match) handleSelectOption(match[1].toUpperCase());
              } else if (
                isLikelyDiagramCommand(cmd.phrase) ||
                isLikelyDiagramCommand(cmd.exampleSpeech) ||
                cmd.category === "tools" ||
                cmd.phrase.startsWith("draw") ||
                cmd.phrase.includes("diagram") ||
                cmd.phrase.includes("canvas") ||
                cmd.phrase.includes("shape") ||
                cmd.action.toLowerCase().includes("draw") ||
                cmd.action.toLowerCase().includes("diagram")
              ) {
                const speechToParse = cmd.exampleSpeech || cmd.phrase;
                const currentShapes = answer.diagramShapes || [];
                const diagramResult = parseDiagramVoiceCommand(speechToParse, currentShapes);
                setShowDiagram(true);
                onAnswerChange(
                  {
                    ...answer,
                    diagramShapes: diagramResult.shapes,
                    lastModified: Date.now(),
                    revisionCount: answer.revisionCount + 1,
                  },
                  `Diagram: ${diagramResult.description}`
                );
                confirmFeedback(diagramResult.description);
              } else if (cmd.category === "math" || cmd.latexExample || isLikelyMathExpression(cmd.phrase)) {
                const mathRes = spokenMathToLaTeX(cmd.exampleSpeech || cmd.phrase);
                const latexToInsert = cmd.latexExample || mathRes.latex;
                const mathBlock = `\n$$${latexToInsert}$$\n`;
                const updatedText = (answer.textAnswer ? answer.textAnswer.trimEnd() + mathBlock : mathBlock).trim();
                const wordCount = updatedText.split(/\s+/).filter(Boolean).length;
                onAnswerChange(
                  {
                    ...answer,
                    textAnswer: updatedText,
                    latexMath: latexToInsert,
                    wordCount,
                    lastModified: Date.now(),
                    revisionCount: answer.revisionCount + 1,
                  },
                  `Inserted equation: ${latexToInsert}`
                );
                confirmFeedback(`Formatted math: ${cmd.phrase}`);
              } else {
                processSpokenUtterance(cmd.exampleSpeech);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
