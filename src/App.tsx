import React, { useState, useRef, useEffect } from "react";
import { signInWithPopup, User as FirebaseUser } from "firebase/auth";
import { auth, googleAuthProvider, db } from "./lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import {
  Mic,
  MicOff,
  Sparkles,
  ArrowLeft,
  CheckCircle,
  FileText,
  RefreshCw,
  User,
  BookOpen,
  Languages,
  TriangleAlert,
  Download,
  Volume2,
  VolumeX,
  Info,
  Layers,
  Compass,
  FileCheck,
  Settings,
  HelpCircle,
  Award,
  Sun,
  Moon,
  Command,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { KaTeXText } from "./components/KaTeXText";
import { AudioVisualizer } from "./components/AudioVisualizer";
import { DocumentsView } from "./components/DocumentsView";
import {
  ScreenState,
  Subject,
  Language,
  SheetSize,
  SheetOrientation,
} from "./types";

// Constant mappings for languages
const LANGUAGES: { name: Language; code: string; localName: string }[] = [
  { name: "English", code: "en-IN", localName: "English (India)" },
];

const SUBJECTS: Subject[] = [
  "General",
  "Mathematics",
  "Chemistry",
  "Physics",
  "Biology",
  "English",
  "History",
  "Computer Science",
];

// Subject guides for spoken advice helper
const SUBJECT_HELPER: Record<Subject, string> = {
  General:
    "Speak naturally. Avoid pauses. Use 'point number 1', 'next point' or 'new paragraph' to structure notes.",
  Mathematics:
    "Say 'x squared plus 2x plus 5 equals 0' or 'integral of x dx'. We'll format it with LaTeX standard $...$ symbols.",
  Chemistry:
    "Equations like '2 H2 plus O2 gives 2 H2O' will be balanced, and compounds like 'H2SO4' will get chemical subscripts automatically.",
  Physics:
    "Units (e.g., '10 meters per second squared', '50 kilograms') and formulas (e.g., 'E equals m c squared') will format correctly.",
  Biology:
    "Use biological terms or lists. Say 'point 1: cell respiration occurs in mitochondria...' to draw headers.",
  English:
    "Dictate essay paragraphs or punctuation explicitly like 'comma', 'period' or 'new line'.",
  History:
    "Format events and timelines by mentioning dates like '15 August 1947' or lists of historical emperors.",
  "Computer Science":
    "Speak code commands like 'hash include IO stream', 'using namespace std', 'integer main', 'print hello world'. We will convert them to actual executive code blocks!",
};

export default function App() {
  // App screen navigation
  const [screen, setScreen] = useState<ScreenState>("SETUP_VIEW");

  // Scribe Configurations
  const [sheetSize, setSheetSize] = useState<SheetSize>("A4");
  const [sheetOrientation, setSheetOrientation] =
    useState<SheetOrientation>("Portrait");
  const [language, setLanguage] = useState<Language>("English");
  const [targetLanguage, setTargetLanguage] = useState<Language>("English");
  const [subject, setSubject] = useState<Subject>("General");
  const [studentName, setStudentName] = useState("");
  const [examinerName, setExaminerName] = useState("");

  // Scribe Live Data State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isFormatting, setIsFormatting] = useState(false);
  const [formattedAnswer, setFormattedAnswer] = useState("");
  const [providerUsed, setProviderUsed] = useState("AI Scribe Service");

  // Status Alerts
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"PDF" | "Markdown">("PDF");

  // Speech Recognition reference
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Web Speech API check
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  const [user, setUser] = useState<FirebaseUser | null>(null);

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [previewFontSize, setPreviewFontSize] = useState<number>(14);

  // Auto-save & Local Storage
  const isInitialMount = useRef(true);

  useEffect(() => {
    const savedTranscript = localStorage.getItem("scribe_transcript");
    const savedFormatted = localStorage.getItem("scribe_formatted");
    const savedFontSize = localStorage.getItem("scribe_font_size");
    const savedTheme = localStorage.getItem("scribe_theme") as "light" | "dark";

    if (savedTranscript) setTranscript(savedTranscript);
    if (savedFormatted) setFormattedAnswer(savedFormatted);
    if (savedFontSize) setPreviewFontSize(Number(savedFontSize));
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) return;
    localStorage.setItem("scribe_transcript", transcript);
  }, [transcript]);

  useEffect(() => {
    if (isInitialMount.current) return;
    localStorage.setItem("scribe_formatted", formattedAnswer);
  }, [formattedAnswer]);

  useEffect(() => {
    if (isInitialMount.current) return;
    localStorage.setItem("scribe_font_size", previewFontSize.toString());
  }, [previewFontSize]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    localStorage.setItem("scribe_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      console.error(err);
      if (
        err.code !== "auth/cancelled-popup-request" &&
        err.code !== "auth/popup-closed-by-user"
      ) {
        setErrorMessage("Failed to sign in with Google.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveToFirebase = async () => {
    if (!user) {
      setErrorMessage("Please login to save your transcript.");
      return;
    }
    if (!transcript.trim() && !formattedAnswer.trim()) {
      setWarningMessage("Cannot save an empty document.");
      return;
    }

    try {
      await addDoc(collection(db, `users/${user.uid}/documents`), {
        userId: user.uid,
        rawTranscript: transcript,
        formattedText: formattedAnswer,
        subject,
        studentName,
        examinerName,
        createdAt: serverTimestamp(),
      });
      setScreen("PDF_SUCCESS"); // Or another success screen
    } catch (err: any) {
      console.error("Firebase Error: ", err);
      setErrorMessage(err.message || "Failed to save to Firebase.");
    }
  };

  useEffect(() => {
    if (!SpeechRecognition) {
      setErrorMessage(
        "Web Speech API is not fully supported in this browser. VoiceScript works best on Google Chrome or Microsoft Edge.",
      );
    }
  }, []);

  // Cleanup microphones on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleTextToSpeech = () => {
    if (!formattedAnswer.trim()) {
      setWarningMessage("No formatted text to read aloud.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Strip basic markdown/LaTeX characters to make speech cleaner
    const cleanText = formattedAnswer
      .replace(/[*_#`~>]/g, "")
      .replace(/\$+.*?\$+/g, " math equation ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-IN";
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const getLangCode = (lang: Language) => {
    const found = LANGUAGES.find((l) => l.name === lang);
    return found ? found.code : "en-IN";
  };

  const startListening = () => {
    if (!SpeechRecognition) {
      setErrorMessage("Speech Recognition is not supported in this browser.");
      return;
    }

    setWarningMessage(null);
    setErrorMessage(null);

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = getLangCode(language);

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript("");
      };

      recognition.onresult = (event: any) => {
        let finalText = "";
        let interimText = "";
        let latestConfidence: number | null = null;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript + " ";
            latestConfidence = event.results[i][0].confidence;
          } else {
            interimText += event.results[i][0].transcript;
            if (latestConfidence === null) {
              latestConfidence = event.results[i][0].confidence;
            }
          }
        }

        if (latestConfidence !== null) {
          setConfidenceScore(latestConfidence);
        }

        if (finalText) {
          setTranscript((prev) => {
            const trimmedPrev = prev.trim();
            const trimmedNew = finalText.trim();
            return trimmedPrev ? `${trimmedPrev} ${trimmedNew}` : trimmedNew;
          });
        }
        setInterimTranscript(interimText);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === "not-allowed") {
          setErrorMessage(
            "Microphone permission was denied. Please allow microphone access in your browser settings to speak your answers.",
          );
        } else if (event.error === "no-speech") {
          // Standard no-speech silent block
        } else {
          setErrorMessage(
            `Microphone error: ${event.error}. Please try reloading the app.`,
          );
        }
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Could not start voice scribe: ${err.message || err}`);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error(err);
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript("");
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Submit spoken answer to the format API
  const handleFormatAnswer = async () => {
    if (isListening) {
      stopListening();
    }

    if (!transcript.trim()) {
      setWarningMessage(
        "Please speak your answer first so it can be structured.",
      );
      return;
    }

    setWarningMessage(null);
    setErrorMessage(null);
    setIsFormatting(true);

    try {
      const response = await fetch("/api/format", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: transcript,
          subject: subject,
          language: language,
          targetLanguage: targetLanguage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to format text using AI.");
      }

      setFormattedAnswer(data.formattedText);
      setProviderUsed(data.provider || "Gemini Scribe Service");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message ||
          "An error occurred while connecting to the primary format API.",
      );
    } finally {
      setIsFormatting(false);
    }
  };

  // Triggers chemical or standard PDF download via html2pdf dynamically or Markdown download
  const handleDownloadFile = async () => {
    if (!transcript.trim() && !formattedAnswer.trim()) {
      setWarningMessage("Cannot download an empty document sheet.");
      return;
    }

    setWarningMessage(null);
    setErrorMessage(null);
    setIsDownloading(true);
    setPdfProgress(10);

    const safeName = studentName.trim()
      ? studentName.trim().replace(/\s+/g, "_")
      : "Candidate";

    if (exportFormat === "Markdown") {
      try {
        const content = formattedAnswer || transcript;
        const blob = new Blob([content], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ExamSheet_${safeName}_${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setPdfProgress(100);
        setTimeout(() => {
          setScreen("PDF_SUCCESS");
          setPdfProgress(0);
        }, 500);
      } catch (err: any) {
        setErrorMessage(`Markdown generation failed: ${err.message}`);
        setPdfProgress(0);
      } finally {
        setIsDownloading(false);
      }
      return;
    }

    try {
      // Dynamic load of html2pdf to make it extremely bulletproof and bypass Vite static build problems
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;
      setPdfProgress(30);

      const pdfContent = document.getElementById("pdf-render-target");
      if (!pdfContent) {
        throw new Error("Could not locate sheet preview target for render.");
      }

      const paperSize = sheetSize === "A4" ? "a4" : "letter";
      const isLandscape = sheetOrientation === "Landscape";

      const opt = {
        margin: 0.35,
        filename: `ExamSheet_${safeName}_${Date.now()}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: {
          unit: "in" as const,
          format: paperSize,
          orientation: (isLandscape ? "landscape" : "portrait") as
            "landscape" | "portrait",
        },
      };

      setPdfProgress(50);
      const pdfWorker = (html2pdf as any)().set(opt).from(pdfContent);

      const progressInterval = setInterval(() => {
        setPdfProgress((p) => (p < 95 ? p + 5 : p));
      }, 300);

      await pdfWorker.save();
      clearInterval(progressInterval);
      setPdfProgress(100);

      setTimeout(() => {
        setScreen("PDF_SUCCESS");
        setPdfProgress(0);
      }, 500);
    } catch (err: any) {
      console.error("PDF generation failure:", err);
      setErrorMessage(
        `PDF rendering failed: ${err.message || err}. Please try downloading again.`,
      );
      setPdfProgress(0);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleStartProject = () => {
    // Validate that names are supplied, or assign helpful placeholders
    setWarningMessage(null);
    setScreen("WORKSPACE_VIEW");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m") {
        e.preventDefault();
        const toggleBtn = document.getElementById("mic-toggle-btn");
        if (toggleBtn) toggleBtn.click();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        const formatBtn = document.getElementById("format-text-btn");
        if (formatBtn) formatBtn.click();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const resetAll = () => {
    setTranscript("");
    setInterimTranscript("");
    setFormattedAnswer("");
    setStudentName("");
    setExaminerName("");
    setScreen("SETUP_VIEW");
    setSubject("General");
    setLanguage("English");
    setTargetLanguage("English");
    setSheetSize("A4");
    setSheetOrientation("Portrait");
    setWarningMessage(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#111827] flex flex-col justify-between text-[#2D2926] dark:text-[#F3F4F6] antialiased font-sans transition-colors duration-300">
      {/* HIGH-CONTRAST HEADER INFO BANNER */}
      <div className="w-full bg-[#FEF3C7] dark:bg-[#78350f] text-[#92400E] dark:text-amber-100 text-center py-2.5 px-6 text-sm font-semibold tracking-wide flex items-center justify-center gap-2 border-b border-[#E7E5E4]/60 dark:border-transparent shadow-xs leading-relaxed transition-colors duration-300">
        <Info className="w-4 h-4 flex-shrink-0 text-[#B45309]" />
        <span>
          For students who cannot write — speak your exam answer clearly.
          Supports real-time layout rendering.
        </span>
      </div>

      {/* TOP HEADER */}
      <header className="w-full bg-white dark:bg-[#1f2937] border-b border-[#E7E5E4] dark:border-[#374151] py-4.5 px-6 md:px-10 shadow-xs transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#2563EB] p-2.5 rounded-xl text-white shadow-md shadow-blue-100 dark:shadow-none">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#1C1917] dark:text-white leading-none">
                VoiceScript
              </h1>
              <p className="text-[10px] text-[#78716C] dark:text-gray-400 uppercase tracking-widest font-extrabold mt-1">
                AI Academic Scribe & Page Layout Renderer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 transition-colors cursor-pointer mr-2"
              title="Toggle Theme"
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setScreen("DOCUMENTS_VIEW")}
                  className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded cursor-pointer transition-colors"
                >
                  My Documents
                </button>
                <span className="text-xs font-semibold text-stone-600 hidden sm:inline-block">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded cursor-pointer transition-colors"
                >
                  Log out
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="text-xs font-bold uppercase tracking-widest text-white bg-[#2563EB] hover:bg-blue-700 px-4 py-1.5 rounded cursor-pointer transition-colors shadow-sm"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex-grow flex flex-col">
        {/* Errors / Warnings overlay */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-950 flex items-start gap-3 shadow-md border border-red-100"
              role="alert"
            >
              <TriangleAlert className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-base text-red-900">
                  Scribe Service Notification
                </h3>
                <p className="text-sm mt-1">{errorMessage}</p>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="mt-2 text-xs font-bold text-red-700 hover:text-red-950 underline uppercase tracking-wider cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}

          {warningMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-[#FEF3C7] border-l-4 border-amber-500 rounded-xl text-amber-950 flex items-start gap-3 shadow-sm border border-amber-200"
            >
              <TriangleAlert className="w-5 h-5 flex-shrink-0 text-amber-700 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{warningMessage}</p>
                <button
                  onClick={() => setWarningMessage(null)}
                  className="mt-1.5 text-xs font-bold text-amber-850 hover:text-amber-950 underline uppercase tracking-wider cursor-pointer"
                >
                  Close Warning
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* ========================================================== */}
          {/* 1. SETUP VIEW (NEW PROJECT SHEET FORM CONFIG)              */}
          {/* ========================================================== */}
          {screen === "SETUP_VIEW" && (
            <motion.div
              key="setup-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="max-w-4xl mx-auto w-full flex flex-col gap-8"
            >
              <div className="text-center max-w-xl mx-auto">
                <span className="text-xs font-black uppercase tracking-widest text-[#2563EB] dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3.5 py-1.5 rounded-full border border-blue-100 dark:border-blue-800">
                  Step 1: Sheet & Document Setup
                </span>
                <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight mt-4">
                  Create Academic Scriptorium Sheet
                </h2>
                <p className="text-stone-500 dark:text-stone-400 text-sm mt-2 leading-relaxed">
                  Configure the target sheet layout properties, exam subjects,
                  and student particulars. VoiceScript will dynamically render
                  and preview your page in real-time.
                </p>
              </div>

              {/* Layout Form Grid */}
              <div className="bg-[#FAF9F6] dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] rounded-3xl p-6 md:p-8 space-y-8 shadow-xs transition-colors duration-300">
                {/* PART 1: CHOOSE SHEET SIZE & ORIENTATION */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#A8A29E] dark:text-gray-400 mb-4 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
                    1. Paper Sheet Format & Dimensions
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sheet Size Select */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-700 dark:text-stone-300 block">
                        Sheet Dimensions
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSheetSize("A4")}
                          className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                            sheetSize === "A4"
                              ? "bg-white dark:bg-stone-800 border-[#2563EB] ring-2 ring-blue-50 dark:ring-blue-900/50 text-stone-950 dark:text-white"
                              : "bg-[#F5F5F4] dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400"
                          }`}
                        >
                          <span className="font-extrabold text-base block">
                            ISO A4 Sheet
                          </span>
                          <span className="text-[11px] opacity-80 block">
                            210 mm × 297 mm
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSheetSize("Normal Exam Paper")}
                          className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                            sheetSize === "Normal Exam Paper"
                              ? "bg-white dark:bg-stone-800 border-[#2563EB] ring-2 ring-blue-50 dark:ring-blue-900/50 text-stone-950 dark:text-white"
                              : "bg-[#F5F5F4] dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400"
                          }`}
                        >
                          <span className="font-extrabold text-base block">
                            Normal Exam Paper
                          </span>
                          <span className="text-[11px] opacity-80 block">
                            8.5 in × 11 in (Letter)
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Sheet Orientation Select */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-700 dark:text-stone-300 block">
                        Sheet Orientation
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSheetOrientation("Portrait")}
                          className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                            sheetOrientation === "Portrait"
                              ? "bg-white dark:bg-stone-800 border-[#2563EB] ring-2 ring-blue-50 dark:ring-blue-900/50 text-stone-950 dark:text-white"
                              : "bg-[#F5F5F4] dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400"
                          }`}
                        >
                          <span className="font-extrabold text-base block">
                            Portrait
                          </span>
                          <span className="text-[11px] opacity-80 block">
                            Vertical alignment
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSheetOrientation("Landscape")}
                          className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                            sheetOrientation === "Landscape"
                              ? "bg-white dark:bg-stone-800 border-[#2563EB] ring-2 ring-blue-50 dark:ring-blue-900/50 text-stone-950 dark:text-white"
                              : "bg-[#F5F5F4] dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400"
                          }`}
                        >
                          <span className="font-extrabold text-base block">
                            Landscape
                          </span>
                          <span className="text-[11px] opacity-80 block">
                            Horizontal alignment
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PART 2: LANGUAGE & TRANSLATION ENGINE */}
                <div className="border-t border-[#E7E5E4] pt-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#A8A29E] mb-4 flex items-center gap-1.5">
                    <Languages className="w-4 h-4 text-emerald-600" />
                    2. Language Transcription & Translation Engine
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Spoken Language */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="setup-language"
                        className="text-xs font-bold text-stone-600 dark:text-stone-400"
                      >
                        Spoken/Dictated Language
                      </label>
                      <select
                        id="setup-language"
                        value={language}
                        onChange={(e) => {
                          const val = e.target.value as Language;
                          setLanguage(val);
                          setTargetLanguage(val); // default match
                        }}
                        className="h-11 w-full bg-[#FAF9F6] dark:bg-stone-800 border border-[#E7E5E4] dark:border-stone-700 rounded-xl px-3 font-semibold text-stone-800 dark:text-stone-300 cursor-not-allowed"
                        disabled
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.name} value={l.name}>
                            {l.localName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Target Translation Output */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="setup-target-language"
                        className="text-xs font-bold text-stone-600 dark:text-stone-400"
                      >
                        Target Translation Output
                      </label>
                      <select
                        id="setup-target-language"
                        value={targetLanguage}
                        onChange={(e) =>
                          setTargetLanguage(e.target.value as Language)
                        }
                        className="h-11 w-full bg-[#FAF9F6] dark:bg-stone-800 border border-[#E7E5E4] dark:border-stone-700 rounded-xl px-3 font-semibold text-stone-800 dark:text-stone-300 cursor-not-allowed"
                        disabled
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.name} value={l.name}>
                            Translate to {l.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subject Selection */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="setup-subject"
                        className="text-xs font-bold text-stone-600 dark:text-stone-400"
                      >
                        Exam Subject
                      </label>
                      <select
                        id="setup-subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value as Subject)}
                        className="h-11 w-full bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-stone-700 rounded-xl px-3 font-semibold text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-[#2563EB] cursor-pointer"
                      >
                        {SUBJECTS.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* PART 3: PARTICIPANT LOGS & NAMES */}
                <div className="border-t border-[#E7E5E4] dark:border-stone-700 pt-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#A8A29E] dark:text-gray-400 mb-4 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                    3. Candidate & Invigilator Credentials
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="setup-student-name"
                        className="text-xs font-bold text-stone-600 dark:text-stone-400"
                      >
                        Student Candidate Name
                      </label>
                      <input
                        id="setup-student-name"
                        type="text"
                        placeholder="E.g., Vishnu M. Nair"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="h-11 w-full bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-stone-700 rounded-xl px-4 font-semibold text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="setup-examiner-name"
                        className="text-xs font-bold text-stone-600 dark:text-stone-400"
                      >
                        Authorized Room Invigilator / Scribe Witness
                      </label>
                      <input
                        id="setup-examiner-name"
                        type="text"
                        placeholder="E.g., Prof. K. Raghavan"
                        value={examinerName}
                        onChange={(e) => setExaminerName(e.target.value)}
                        className="h-11 w-full bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-stone-700 rounded-xl px-4 font-semibold text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action trigger footer */}
              <button
                onClick={handleStartProject}
                style={{ minHeight: "64px" }}
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white font-bold text-lg rounded-2xl shadow-xl shadow-blue-100/60 dark:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Create Scribe Document & Open Workspace</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>

              <div className="text-center">
                <p className="text-xs text-[#A8A29E] font-medium">
                  VoiceScript Academic Scribe System v2.1 • Approved by Academic
                  Accessibility Board
                </p>
              </div>
            </motion.div>
          )}

          {/* ========================================================== */}
          {/* 2. THE DOCUMENT WORKSPACE (SPLIT VIEW SCRIBE PREVIEW)     */}
          {/* ========================================================== */}
          {screen === "WORKSPACE_VIEW" && (
            <motion.div
              key="workspace-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-6"
            >
              {/* Back to Configuration */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] p-4 rounded-2xl shadow-xs transition-colors duration-300">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setScreen("SETUP_VIEW")}
                    className="p-2 bg-[#FAF9F6] dark:bg-stone-800 hover:bg-[#E7E5E4] dark:hover:bg-stone-700 rounded-lg border border-[#E7E5E4] dark:border-stone-700 transition-all cursor-pointer text-stone-700 dark:text-stone-300"
                    aria-label="Back to config setup screen"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-extrabold text-stone-900 dark:text-white text-lg leading-none">
                        Workspace Project
                      </h2>
                      <span className="text-[10px] font-black uppercase bg-[#2563EB] text-white px-2 py-0.5 rounded-md leading-none">
                        {sheetSize} - {sheetOrientation}
                      </span>
                    </div>
                    <p className="text-stone-500 dark:text-stone-400 text-xs mt-1">
                      Subject:{" "}
                      <span className="font-bold text-stone-700 dark:text-stone-300">
                        {subject}
                      </span>{" "}
                      • Translating spoken{" "}
                      <span className="font-bold text-stone-700 dark:text-stone-300">
                        {language}
                      </span>{" "}
                      to{" "}
                      <span className="font-bold text-[#2563EB] dark:text-blue-400">
                        {targetLanguage}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-2 bg-[#FAF9F6] dark:bg-stone-800 border border-[#E7E5E4] dark:border-stone-700 px-3 py-1.5 rounded-lg transition-colors duration-300">
                    <label
                      htmlFor="font-size-slider"
                      className="text-xs font-bold text-stone-600 dark:text-stone-300"
                    >
                      Aa
                    </label>
                    <input
                      id="font-size-slider"
                      type="range"
                      min="10"
                      max="24"
                      value={previewFontSize}
                      onChange={(e) =>
                        setPreviewFontSize(Number(e.target.value))
                      }
                      className="w-20 sm:w-28 accent-[#2563EB] cursor-pointer"
                      title="Adjust document font size"
                    />
                    <span className="text-xs font-bold text-stone-500 w-6 text-right">
                      {previewFontSize}
                    </span>
                  </div>

                  <button
                    onClick={() => setShowShortcutsModal(true)}
                    className="text-xs font-bold text-stone-600 bg-[#FAF9F6] hover:bg-[#E7E5E4] border border-[#E7E5E4] py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700 transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" />
                    Shortcuts
                  </button>
                  <button
                    onClick={() => setScreen("SETUP_VIEW")}
                    className="text-xs font-bold text-stone-600 bg-[#FAF9F6] hover:bg-[#E7E5E4] border border-[#E7E5E4] py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Edit Configuration
                  </button>
                </div>
              </div>

              {/* The Interactive Workspace Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* LEFT CONTROL PANEL: dictating, editing and formatting (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* Micro controller box */}
                  <div className="bg-[#FAF9F6] dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-xs transition-colors duration-300">
                    <h3 className="text-sm font-black uppercase tracking-wider text-stone-800 dark:text-stone-100">
                      Scribe Microphone Controller
                    </h3>
                    <p className="text-stone-500 dark:text-stone-400 text-xs mt-1 max-w-xs leading-normal">
                      Speak your exam answer now. We automatically convert and
                      stream it into the preview sheet.
                    </p>

                    {/* Microphone Pulse ring */}
                    <div className="relative flex items-center justify-center my-6">
                      {isListening && (
                        <div className="voice-pulse absolute w-28 h-28 rounded-full" />
                      )}

                      <button
                        id="mic-toggle-btn"
                        onClick={toggleListening}
                        type="button"
                        style={{ minHeight: "96px", minWidth: "96px" }}
                        aria-label={
                          isListening
                            ? "Stop listening for dictation"
                            : "Start speaking dictation"
                        }
                        className={`relative z-10 p-6 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-hidden ${
                          isListening
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-[#EF4444] hover:bg-[#DC2626] text-white"
                        }`}
                      >
                        {isListening ? (
                          <Mic className="w-10 h-10" />
                        ) : (
                          <MicOff className="w-10 h-10" />
                        )}
                      </button>

                      {/* Real-time Audio Visualizer */}
                      <AudioVisualizer isListening={isListening} />
                    </div>

                    <p
                      className={`font-bold text-xs tracking-wide uppercase flex items-center gap-2 ${
                        isListening
                          ? "text-emerald-600 animate-pulse"
                          : "text-[#78716C] dark:text-gray-400"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${isListening ? "bg-emerald-500 animate-ping" : "bg-stone-300 dark:bg-stone-600"}`}
                      />
                      {isListening
                        ? "Recording Spoken Input..."
                        : "Microphone Offline"}
                    </p>
                  </div>

                  {/* Editable transcription window */}
                  <div className="bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] rounded-2xl p-6 flex flex-col shadow-xs transition-colors duration-300">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3">
                        <label
                          htmlFor="workspace-transcript-box"
                          className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] dark:text-gray-400 flex items-center gap-1.5"
                        >
                          <FileText className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
                          Spoken Transcription
                        </label>
                        {confidenceScore !== null && isListening && (
                          <div
                            className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-sm"
                            style={{
                              backgroundColor:
                                confidenceScore > 0.8
                                  ? "#d1fae5"
                                  : confidenceScore > 0.5
                                    ? "#fef3c7"
                                    : "#fee2e2",
                              color:
                                confidenceScore > 0.8
                                  ? "#065f46"
                                  : confidenceScore > 0.5
                                    ? "#92400e"
                                    : "#991b1b",
                            }}
                            title="Browser Speech Recognition Confidence"
                          >
                            <span>
                              Accuracy: {Math.round(confidenceScore * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold font-mono text-[#A8A29E] dark:text-gray-400 bg-[#F5F5F4] dark:bg-stone-800 py-0.5 px-2 rounded-sm">
                        Chr: {transcript.length}
                      </span>
                    </div>

                    <textarea
                      id="workspace-transcript-box"
                      placeholder="Your spoken words will appear here in real-time... Feel free to edit or type directly here anytime."
                      value={
                        isListening
                          ? `${transcript}${interimTranscript}`
                          : transcript
                      }
                      onChange={(e) => {
                        setTranscript(e.target.value);
                      }}
                      disabled={isListening}
                      className="w-full min-h-[160px] p-4 bg-[#FBFBFA] dark:bg-stone-800 rounded-xl border border-[#E7E5E4] dark:border-stone-700 text-base leading-relaxed text-[#44403C] dark:text-stone-100 focus:ring-2 focus:ring-[#2563EB] focus:outline-hidden resize-y transition-colors disabled:opacity-85"
                    />

                    {isListening && interimTranscript && (
                      <div className="mt-3 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100 text-[#047857] text-xs font-semibold italic flex items-center gap-1.5 animate-pulse">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="truncate">{interimTranscript}</span>
                      </div>
                    )}

                    {/* Format / Clear action buttons */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        id="format-text-btn"
                        onClick={handleFormatAnswer}
                        disabled={
                          isListening || isFormatting || !transcript.trim()
                        }
                        className="py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-[#E7E5E4] dark:disabled:bg-stone-700 disabled:text-stone-400 dark:disabled:text-stone-500 disabled:cursor-not-allowed transition-all"
                      >
                        {isFormatting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                        )}
                        Format Academic text
                      </button>

                      <button
                        onClick={() => {
                          setTranscript("");
                          setFormattedAnswer("");
                        }}
                        disabled={
                          isListening ||
                          isFormatting ||
                          (!transcript.trim() && !formattedAnswer.trim())
                        }
                        className="py-3 bg-white dark:bg-stone-800 hover:bg-[#FAF9F6] dark:hover:bg-stone-700 border border-[#E7E5E4] dark:border-stone-600 text-stone-700 dark:text-stone-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-all"
                      >
                        Reset Sheet
                      </button>
                    </div>
                  </div>

                  {/* Formatted Text Statistics */}
                  {formattedAnswer.trim() && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 p-4 rounded-xl shadow-xs transition-colors duration-300">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-blue-900 dark:text-blue-300 uppercase tracking-widest text-[10px] block mb-1">
                            Document Statistics
                          </span>
                          <div className="flex gap-4 text-xs font-semibold text-blue-800 dark:text-blue-200">
                            <span>
                              Words:{" "}
                              {formattedAnswer.trim().split(/\s+/).length}
                            </span>
                            <span>
                              Est. Read:{" "}
                              {Math.ceil(
                                formattedAnswer.trim().split(/\s+/).length /
                                  200,
                              )}{" "}
                              min
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={handleTextToSpeech}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                            isSpeaking
                              ? "bg-blue-600 text-white border-blue-700 hover:bg-blue-700 shadow-sm"
                              : "bg-white dark:bg-stone-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-stone-700 hover:bg-blue-100 dark:hover:bg-stone-700"
                          }`}
                          title={
                            isSpeaking
                              ? "Stop reading aloud"
                              : "Read aloud (Web Speech API)"
                          }
                        >
                          {isSpeaking ? (
                            <VolumeX className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Highlight rules guide */}
                  <div className="bg-[#FAF9F6] dark:bg-stone-800/50 p-4.5 rounded-xl border border-[#E7E5E4] dark:border-stone-700 text-xs text-stone-600 dark:text-stone-400 transition-colors duration-300">
                    <span className="font-bold text-stone-800 dark:text-stone-300 uppercase tracking-widest text-[10px] block mb-1">
                      Scribe Guideline: {subject}
                    </span>
                    <p className="leading-relaxed">{SUBJECT_HELPER[subject]}</p>
                  </div>

                  {/* Approve and Download Block */}
                  <div className="bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] p-5 rounded-2xl space-y-3 shadow-xs transition-colors duration-300">
                    <h4 className="text-xs font-bold text-stone-800 dark:text-stone-100 uppercase tracking-wider">
                      Export Finished Answer Document
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-normal mb-2">
                      Choose your preferred format, then download or save your
                      document to the cloud.
                    </p>

                    <div className="flex flex-col gap-1.5 mb-3">
                      <label
                        htmlFor="export-format"
                        className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider"
                      >
                        File Format
                      </label>
                      <select
                        id="export-format"
                        value={exportFormat}
                        onChange={(e) =>
                          setExportFormat(e.target.value as "PDF" | "Markdown")
                        }
                        className="h-10 w-full bg-[#FAF9F6] dark:bg-stone-800 border border-[#E7E5E4] dark:border-stone-700 rounded-xl px-3 text-sm font-semibold text-stone-800 dark:text-stone-300 focus:ring-2 focus:ring-[#2563EB] cursor-pointer transition-colors"
                      >
                        <option value="PDF">PDF Document (.pdf)</option>
                        <option value="Markdown">
                          Plain Text Markdown (.md)
                        </option>
                      </select>
                    </div>

                    <button
                      onClick={handleDownloadFile}
                      disabled={
                        isDownloading ||
                        (!transcript.trim() && !formattedAnswer.trim())
                      }
                      style={{ minHeight: "52px" }}
                      className="relative w-full bg-[#047857] hover:bg-[#065f46] text-white font-bold rounded-xl shadow-lg shadow-emerald-50 dark:shadow-none transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:bg-[#E7E5E4] dark:disabled:bg-stone-700 disabled:shadow-none disabled:text-stone-400 dark:disabled:text-stone-500 disabled:cursor-not-allowed mb-2 overflow-hidden"
                    >
                      {isDownloading && (
                        <div
                          className="absolute left-0 top-0 h-full bg-[#059669] transition-all duration-300 ease-out"
                          style={{ width: `${pdfProgress}%` }}
                        />
                      )}
                      <div className="relative z-10 flex items-center justify-center gap-2.5">
                        {isDownloading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>
                              Exporting {exportFormat} ({pdfProgress}%)...
                            </span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 text-emerald-200" />
                            <span>Approve & Download {exportFormat}</span>
                          </>
                        )}
                      </div>
                    </button>

                    <button
                      onClick={handleSaveToFirebase}
                      disabled={!transcript.trim() && !formattedAnswer.trim()}
                      style={{ minHeight: "52px" }}
                      className="w-full bg-white dark:bg-stone-800 hover:bg-[#FAF9F6] dark:hover:bg-stone-700 border border-[#E7E5E4] dark:border-stone-600 text-[#2563EB] dark:text-blue-400 font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Save Document to Cloud</span>
                    </button>
                  </div>
                </div>

                {/* RIGHT SHEET PREVIEW PANEL: accurate sheet ratios, margins & live update (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="flex justify-between items-center px-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
                      Document Sheet Live Preview
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 bg-[#FAF9F6] dark:bg-stone-800 border border-[#E7E5E4] dark:border-stone-700 py-1 px-2.5 rounded-lg flex items-center gap-1 transition-colors duration-300">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                        Live Updates
                      </span>
                    </div>
                  </div>

                  {/* PREVIEW CONTAINER STYLED PRECISELY BASED ON SIZE AND ORIENTATION */}
                  <div className="bg-[#E7E5E4]/40 dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] rounded-3xl p-4 md:p-6 flex justify-center items-center overflow-x-auto shadow-inner min-h-[450px] transition-colors duration-300">
                    {/* The exact representation of the physical sheet */}
                    <div
                      id="pdf-render-target"
                      className={`relative p-8 md:p-11 flex flex-col justify-between font-sans transition-all duration-300 select-text ${
                        sheetOrientation === "Landscape"
                          ? "w-full max-w-[840px] aspect-[1.414/1]"
                          : "w-full max-w-[620px] aspect-[1/1.414]"
                      }`}
                      style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #D6D3D1",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                        color: "#44403c",
                        fontSize: `${previewFontSize}px`,
                        lineHeight: "1.6",
                        minHeight:
                          sheetOrientation === "Portrait" ? "780px" : "550px",
                      }}
                    >
                      {/* Top blue accent binder bar */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1.5"
                        style={{ backgroundColor: "#2563EB" }}
                      />

                      {/* Header Segment */}
                      <div
                        style={{
                          borderBottom: "2px solid #e7e5e4",
                          paddingBottom: "20px",
                          marginBottom: "24px",
                        }}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span
                              style={{
                                backgroundColor: "#eff6ff",
                                border: "1px solid #dbeafe",
                                color: "#2563EB",
                                padding: "2px 10px",
                                borderRadius: "9999px",
                                display: "inline-block",
                                fontSize: "9px",
                                fontWeight: 900,
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                              }}
                            >
                              BOARD ACCESSIBILITY DOCUMENT
                            </span>
                            <h2
                              style={{
                                color: "#1c1917",
                                fontSize: "20px",
                                fontWeight: 900,
                                marginTop: "10px",
                                letterSpacing: "-0.025em",
                              }}
                            >
                              Academic Written Examination Answer Sheet
                            </h2>
                            <p
                              style={{
                                color: "#78716c",
                                fontSize: "10px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                marginTop: "4px",
                              }}
                            >
                              Scribed via VoiceScript Web Client
                            </p>
                          </div>

                          <div
                            style={{
                              textAlign: "right",
                              fontSize: "10px",
                              color: "#78716c",
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                              fontWeight: 600,
                            }}
                          >
                            <div>
                              Format:{" "}
                              <span
                                style={{ color: "#1c1917", fontWeight: "bold" }}
                              >
                                {sheetSize} ({sheetOrientation})
                              </span>
                            </div>
                            <div>
                              Subject:{" "}
                              <span
                                style={{ color: "#1c1917", fontWeight: "bold" }}
                              >
                                {subject}
                              </span>
                            </div>
                            <div>
                              Language:{" "}
                              <span style={{ color: "#1c1917" }}>
                                {language}
                              </span>
                            </div>
                            {language !== targetLanguage && (
                              <div>
                                Target:{" "}
                                <span
                                  style={{
                                    color: "#2563eb",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {targetLanguage}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Candidate Credential Table Block */}
                        <div
                          className="grid grid-cols-2 gap-4 mt-5"
                          style={{
                            backgroundColor: "#faf9f6",
                            border: "1px solid #e7e5e4",
                            borderRadius: "12px",
                            padding: "14px",
                            fontSize: "12px",
                          }}
                        >
                          <div>
                            <span
                              style={{
                                color: "#a8a29e",
                                fontSize: "9px",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                                display: "block",
                                marginBottom: "2px",
                              }}
                            >
                              Student Candidate
                            </span>
                            <span
                              style={{
                                color: "#1c1917",
                                fontWeight: 900,
                                fontSize: "14px",
                              }}
                            >
                              {studentName.trim() || "Scribe Student Candidate"}
                            </span>
                          </div>
                          <div>
                            <span
                              style={{
                                color: "#a8a29e",
                                fontSize: "9px",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                                display: "block",
                                marginBottom: "2px",
                              }}
                            >
                              Witness Scribe / Room Evaluator
                            </span>
                            <span
                              style={{
                                color: "#1c1917",
                                fontWeight: 600,
                                fontSize: "14px",
                              }}
                            >
                              {examinerName.trim() ||
                                "Assigned Room Invigilator"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Content Body Segment */}
                      <div className="flex-grow flex flex-col justify-start">
                        {/* Determine what to show in the preview sheet */}
                        {formattedAnswer ? (
                          <div className="space-y-4">
                            <KaTeXText text={formattedAnswer} />
                          </div>
                        ) : transcript ? (
                          <div className="space-y-4 animate-fadeIn">
                            {/* Draft transcript live preview */}
                            <div
                              style={{
                                backgroundColor: "rgba(254, 243, 199, 0.4)",
                                border: "1px solid rgba(252, 211, 77, 0.6)",
                                borderRadius: "12px",
                                padding: "16px",
                                marginBottom: "16px",
                              }}
                            >
                              <span
                                style={{
                                  backgroundColor: "#fef3c7",
                                  color: "#b45309",
                                  fontSize: "9px",
                                  fontWeight: 900,
                                  textTransform: "uppercase",
                                  padding: "2px 8px",
                                  borderRadius: "9999px",
                                  display: "inline-block",
                                  marginBottom: "6px",
                                }}
                              >
                                Spoken Draft (Real-Time Rendering)
                              </span>
                              <p
                                style={{
                                  color: "#44403c",
                                  fontStyle: "italic",
                                  lineHeight: "1.6",
                                  fontSize: "15px",
                                }}
                              >
                                {isListening
                                  ? `${transcript} ${interimTranscript}`
                                  : transcript}
                              </p>
                            </div>
                            <p
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#b45309",
                                fontStyle: "italic",
                              }}
                            >
                              * Click "Format Academic text" on the left panel
                              to translate spoken Malayalam to standard English
                              formatting, resolve LaTeX symbols, balance
                              chemical elements, or construct CS code blocks.
                            </p>
                          </div>
                        ) : (
                          <div
                            className="flex-grow flex flex-col items-center justify-center py-10"
                            style={{ color: "#d6d3d1" }}
                          >
                            <FileCheck className="w-16 h-16 opacity-30 stroke-1" />
                            <p className="text-xs font-semibold uppercase tracking-widest mt-3">
                              Candidate response will render here live...
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Footer Segment */}
                      <div
                        style={{
                          borderTop: "1px solid #e7e5e4",
                          paddingTop: "20px",
                          marginTop: "24px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-end",
                          fontSize: "9px",
                          color: "#a8a29e",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          <div>
                            Certified Indian Academic Scribe replacement
                          </div>
                          <div>
                            Verification:{" "}
                            {formattedAnswer ? providerUsed : "Draft mode"}
                          </div>
                        </div>

                        {/* Custom signature box */}
                        <div
                          style={{
                            borderTop: "1px solid #d6d3d1",
                            width: "144px",
                            paddingTop: "6px",
                            textAlign: "center",
                          }}
                        >
                          Candidate/Scribe Signature
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================== */}
          {/* 3. SUCCESS VIEW SCREEN                                     */}
          {/* ========================================================== */}
          {screen === "PDF_SUCCESS" && (
            <motion.div
              key="pdf-success-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] rounded-3xl p-8 md:p-12 text-center shadow-lg flex flex-col items-center max-w-lg mx-auto transition-colors duration-300"
            >
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full mb-6 ring-8 ring-emerald-50/40 dark:ring-emerald-900/20">
                <CheckCircle className="w-16 h-16 animate-pulse" />
              </div>

              <h1 className="text-3xl font-black text-[#1C1917] dark:text-white tracking-tight">
                Document Exported Successfully!
              </h1>
              <p className="text-stone-500 dark:text-stone-400 text-base mt-3 leading-relaxed">
                The high-fidelity academic exam sheet has been structured and
                exported as a digital {exportFormat} copy directly to your
                downloads.
              </p>

              {/* Meta logs card */}
              <div className="w-full bg-[#FAF9F6] dark:bg-stone-800 rounded-2xl p-5 border border-[#E7E5E4] dark:border-stone-700 my-6 text-left space-y-2.5 text-xs font-semibold transition-colors duration-300">
                <div className="flex justify-between border-b border-[#E7E5E4]/60 dark:border-stone-700/60 pb-2">
                  <span className="text-[#A8A29E] dark:text-stone-400 font-bold uppercase tracking-wider text-[9px]">
                    Sheet Details
                  </span>
                  <span className="text-stone-800 dark:text-stone-200">
                    {sheetSize} Paper — {sheetOrientation} Format
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#E7E5E4]/60 dark:border-stone-700/60 pb-2">
                  <span className="text-[#A8A29E] dark:text-stone-400 font-bold uppercase tracking-wider text-[9px]">
                    Exam Subject
                  </span>
                  <span className="text-stone-800 dark:text-stone-200">
                    {subject}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#E7E5E4]/60 dark:border-stone-700/60 pb-2">
                  <span className="text-[#A8A29E] dark:text-stone-400 font-bold uppercase tracking-wider text-[9px]">
                    Candidate Identity
                  </span>
                  <span className="text-[#2563EB] dark:text-blue-400 font-black">
                    {studentName || "Scribe Candidate"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={resetAll}
                  style={{ minHeight: "56px" }}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  New Document
                </button>

                <button
                  onClick={() => setScreen("WORKSPACE_VIEW")}
                  style={{ minHeight: "56px" }}
                  className="bg-white dark:bg-stone-800 hover:bg-[#FAF9F6] dark:hover:bg-stone-700 border border-[#E7E5E4] dark:border-stone-600 text-stone-700 dark:text-stone-300 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  Return to Workspace
                </button>
              </div>
            </motion.div>
          )}
          {/* ========================================================== */}
          {/* 4. DOCUMENTS VIEW                                          */}
          {/* ========================================================== */}
          {screen === "DOCUMENTS_VIEW" && (
            <DocumentsView user={user} onBack={() => setScreen("SETUP_VIEW")} />
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER ACCESSIBILITY */}
      <footer className="w-full border-t border-[#E7E5E4] dark:border-[#374151] bg-white dark:bg-[#1f2937] py-5 px-6 md:px-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center text-[#A8A29E] dark:text-stone-500 text-xs font-semibold uppercase tracking-wider gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>Scribe Core Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span>Real-Time Layout Engine Configured</span>
            </div>
          </div>
          <span>ACCESSIBILITY REGISTRATION ID: 2026-VS-IND</span>
        </div>
      </footer>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcutsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
            onClick={() => setShowShortcutsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl transition-colors duration-300"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
                  <Command className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Keyboard Shortcuts
                </h3>
                <button
                  onClick={() => setShowShortcutsModal(false)}
                  className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-stone-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#FAF9F6] dark:bg-stone-800/50 rounded-xl border border-[#E7E5E4] dark:border-stone-700">
                  <div>
                    <span className="text-sm font-bold text-stone-800 dark:text-stone-200 block">
                      Toggle Microphone
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      Start or stop dictation recording
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs font-black text-stone-600 dark:text-stone-300">
                    <kbd className="px-2 py-1.5 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded shadow-xs">
                      Ctrl
                    </kbd>
                    <span>+</span>
                    <kbd className="px-2 py-1.5 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded shadow-xs">
                      M
                    </kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#FAF9F6] dark:bg-stone-800/50 rounded-xl border border-[#E7E5E4] dark:border-stone-700">
                  <div>
                    <span className="text-sm font-bold text-stone-800 dark:text-stone-200 block">
                      Format Academic Text
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      Process and render your answer
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs font-black text-stone-600 dark:text-stone-300">
                    <kbd className="px-2 py-1.5 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded shadow-xs">
                      Ctrl
                    </kbd>
                    <span>+</span>
                    <kbd className="px-2 py-1.5 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded shadow-xs">
                      Enter
                    </kbd>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowShortcutsModal(false)}
                className="mt-6 w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close Help
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
