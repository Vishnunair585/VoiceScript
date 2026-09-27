import React, { useState } from "react";
import {
  ExamCandidate,
  ExamPaper,
  CandidateAccommodations,
  AccommodationExtraTime,
} from "../../types";
import { SAMPLE_EXAM_PAPERS } from "../../lib/sampleQuestions";
import {
  ShieldCheck,
  Clock,
  Volume2,
  Eye,
  Type,
  CheckCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  UserCheck,
} from "lucide-react";

interface ExamLoginProps {
  onLoginSuccess: (candidate: ExamCandidate, paper: ExamPaper) => void;
  onSwitchToScribe: () => void;
  onBackToPreviousPage?: () => void;
}

export function ExamLogin({ onLoginSuccess, onSwitchToScribe, onBackToPreviousPage }: ExamLoginProps) {
  const [candidateName, setCandidateName] = useState("Alex Rivera");
  const [candidateId, setCandidateId] = useState("CAND-8942");
  const [selectedPaperId, setSelectedPaperId] = useState<string>(SAMPLE_EXAM_PAPERS[0].id);

  // Accommodations
  const [extraTime, setExtraTime] = useState<AccommodationExtraTime>("1.5x");
  const [highContrast, setHighContrast] = useState(false);
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "x-large">("large");
  const [voiceFeedback, setVoiceFeedback] = useState(true);
  const [autoReadQuestions, setAutoReadQuestions] = useState(true);

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleStartLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!candidateName.trim() || !candidateId.trim()) {
      setValidationError("Please enter your Candidate Name and Examination ID.");
      return;
    }

    const paper = SAMPLE_EXAM_PAPERS.find((p) => p.id === selectedPaperId) || SAMPLE_EXAM_PAPERS[0];

    const accommodations: CandidateAccommodations = {
      extraTime,
      highContrast,
      dyslexiaFont,
      fontSize,
      speechRate: 1.0,
      voiceFeedback,
      autoReadQuestions,
      soundEffects: true,
    };

    const candidate: ExamCandidate = {
      candidateId: candidateId.trim().toUpperCase(),
      candidateName: candidateName.trim(),
      examPin: "EXAM-SECURE",
      seatNumber: "A-14",
      accommodations,
    };

    onLoginSuccess(candidate, paper);
  };

  const loadPreset = (preset: "adhd" | "low_vision" | "standard") => {
    if (preset === "adhd") {
      setExtraTime("1.5x");
      setDyslexiaFont(true);
      setFontSize("large");
      setVoiceFeedback(true);
      setAutoReadQuestions(true);
      setHighContrast(false);
    } else if (preset === "low_vision") {
      setExtraTime("2x");
      setFontSize("x-large");
      setHighContrast(true);
      setVoiceFeedback(true);
      setAutoReadQuestions(true);
    } else {
      setExtraTime("none");
      setDyslexiaFont(false);
      setFontSize("normal");
      setHighContrast(false);
      setVoiceFeedback(false);
      setAutoReadQuestions(false);
    }
  };

  return (
    <div className={`min-h-screen ${highContrast ? "bg-black text-amber-300 font-bold" : "bg-[#fbf9f5] dark:bg-[#121e1d] text-[#192726] dark:text-[#edf5f4]"} flex flex-col py-6 px-3 sm:px-6 lg:px-8 transition-colors`}>
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col gap-6">
        {/* Top navigation & Universal Back button */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#1a2b29] p-3.5 rounded-2xl border border-[#d8e2e1] dark:border-[#2d4341] shadow-xs">
          <button
            type="button"
            onClick={onBackToPreviousPage || onSwitchToScribe}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border ${
              highContrast
                ? "border-amber-400 bg-black text-amber-300 hover:bg-amber-950/40"
                : "border-[#d8e2e1] dark:border-[#2d4341] bg-[#fbf9f5] dark:bg-[#253b3a] text-[#192726] dark:text-stone-200 hover:bg-[#e8f1f0] dark:hover:bg-[#2e4745]"
            } font-bold text-xs transition-colors cursor-pointer shadow-2xs`}
            title="Navigate to Previous Page (Alt + Left Arrow)"
            aria-label="Previous Page"
          >
            <ArrowLeft className={`w-4 h-4 ${highContrast ? "text-amber-400" : "text-[#3d5b59] dark:text-[#a5cfcc]"}`} />
            <span>Previous Page</span>
          </button>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${
              highContrast ? "bg-amber-950 border border-amber-400 text-amber-300" : "bg-[#e8f1f0] dark:bg-[#253b3a] text-[#3d5b59] dark:text-[#a5cfcc] border border-[#3d5b59]/20"
            } text-xs font-bold tracking-wide uppercase`}>
              <ShieldCheck className="w-3.5 h-3.5 text-[#e07a5f]" />
              Secure Examination Portal
            </span>
          </div>
        </div>

        {/* Hero Banner across Full Width */}
        <div className={`w-full rounded-3xl p-6 sm:p-7 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          highContrast
            ? "bg-black border-2 border-amber-400 text-amber-300"
            : "bg-[#3d5b59] text-white shadow-[#3d5b59]/15"
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-md ${
                highContrast ? "bg-amber-400 text-black" : "bg-[#e07a5f] text-white"
              }`}>
                Official Candidate Portal
              </span>
              <span className="text-[10px] font-mono font-bold uppercase opacity-90">
                Universal Accessibility Enabled
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              VoiceScript Accessible Examination Entry
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-teal-100/90 dark:text-stone-300 max-w-3xl leading-relaxed">
              Designed specifically for candidates with physical motor impairments, dyslexia, or low vision. Complete the identification and choose your personalized accommodations below.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onSwitchToScribe}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors border border-white/20"
            >
              Free-Form Scribe Mode
            </button>
          </div>
        </div>

        {validationError && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm font-semibold flex items-center justify-between shadow-xs">
            <span>{validationError}</span>
            <button
              onClick={() => setValidationError(null)}
              className="text-red-600 hover:text-red-800 font-bold ml-2 underline text-xs uppercase"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 2-Column Responsive Dashboard Layout Spread Across Full Window */}
        <form onSubmit={handleStartLogin} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMN 1 (6 cols): Candidate Details & Examination Paper Selection */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            {/* Candidate Details Card */}
            <div className={`rounded-3xl p-5 sm:p-6 shadow-xs border transition-colors ${
              highContrast
                ? "bg-black border-2 border-amber-400"
                : "bg-white dark:bg-[#1a2b29] border-[#d8e2e1] dark:border-[#2d4341]"
            }`}>
              <div className="pb-3 border-b border-[#d8e2e1] dark:border-[#2d4341] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#e07a5f]" />
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#3d5b59] dark:text-[#a5cfcc]">
                    1. Candidate Identification
                  </h2>
                </div>
                <span className="text-[10px] font-mono font-bold bg-[#e8f1f0] dark:bg-[#253b3a] text-[#3d5b59] dark:text-[#a5cfcc] px-2 py-0.5 rounded-md">
                  Identity
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-[#192726] dark:text-stone-300">
                    Candidate Full Name <span className="text-[#e07a5f] font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                      highContrast
                        ? "border-amber-400 bg-black text-amber-300 placeholder-amber-600"
                        : "border-[#d8e2e1] dark:border-[#2d4341] bg-[#fbf9f5] dark:bg-[#203331] text-[#192726] dark:text-white"
                    } focus:ring-2 focus:ring-[#3d5b59] focus:outline-hidden`}
                    placeholder="e.g. Vishnu M. Nair"
                  />
                  <p className="text-[10px] text-[#5e7775] mt-1">
                    Official candidate name as registered on your examination hall ticket.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-[#192726] dark:text-stone-300">
                    Candidate Exam ID <span className="text-[#e07a5f] font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={candidateId}
                    onChange={(e) => setCandidateId(e.target.value)}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs font-bold uppercase ${
                      highContrast
                        ? "border-amber-400 bg-black text-amber-300 placeholder-amber-600"
                        : "border-[#d8e2e1] dark:border-[#2d4341] bg-[#fbf9f5] dark:bg-[#203331] text-[#192726] dark:text-white"
                    } focus:ring-2 focus:ring-[#3d5b59] focus:outline-hidden`}
                    placeholder="CAND-0000"
                  />
                  <p className="text-[10px] text-[#5e7775] mt-1">
                    Unique candidate roll number or session registration identifier.
                  </p>
                </div>
              </div>
            </div>

            {/* Exam Paper Selection Card */}
            <div className={`rounded-3xl p-5 sm:p-6 shadow-xs border transition-colors ${
              highContrast
                ? "bg-black border-2 border-amber-400"
                : "bg-white dark:bg-[#1a2b29] border-[#d8e2e1] dark:border-[#2d4341]"
            }`}>
              <div className="pb-3 border-b border-[#d8e2e1] dark:border-[#2d4341] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#e07a5f]" />
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#3d5b59] dark:text-[#a5cfcc]">
                    2. Select Examination Paper
                  </h2>
                </div>
                <span className="text-[10px] font-mono font-bold bg-[#e8f1f0] dark:bg-[#253b3a] text-[#3d5b59] dark:text-[#a5cfcc] px-2 py-0.5 rounded-md">
                  Curriculum
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                {SAMPLE_EXAM_PAPERS.map((paper) => {
                  const isSelected = selectedPaperId === paper.id;
                  return (
                    <button
                      key={paper.id}
                      type="button"
                      onClick={() => setSelectedPaperId(paper.id)}
                      className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        highContrast
                          ? isSelected
                            ? "border-2 border-amber-300 bg-amber-950/60 ring-2 ring-amber-400"
                            : "border border-amber-600 bg-black text-amber-200 hover:border-amber-400"
                          : isSelected
                          ? "border-[#3d5b59] bg-[#e8f1f0] dark:bg-[#253b3a] ring-2 ring-[#3d5b59]/30 shadow-xs"
                          : "border-[#d8e2e1] dark:border-[#2d4341] hover:border-[#3d5b59]/40 bg-[#fbf9f5] dark:bg-[#203331]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-mono text-xs font-extrabold ${highContrast ? "text-amber-300" : "text-[#3d5b59] dark:text-[#a5cfcc]"}`}>
                          {paper.code}
                        </span>
                        <span className={`text-[11px] ${highContrast ? "text-amber-400" : "text-[#5e7775]"} flex items-center gap-1 font-semibold`}>
                          <Clock className="w-3 h-3 text-[#e07a5f]" />
                          {paper.totalMinutes}m
                        </span>
                      </div>
                      <div className="font-extrabold text-xs line-clamp-2 text-[#192726] dark:text-white">
                        {paper.title}
                      </div>
                      <div className="mt-2 text-[10px] text-[#5e7775]">
                        {paper.questions.length} questions • {paper.totalMarks} marks
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* COLUMN 2 (6 cols): Accommodations Suite & Submit */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <div className={`rounded-3xl p-5 sm:p-6 shadow-xs border transition-colors ${
              highContrast
                ? "bg-black border-2 border-amber-400"
                : "bg-white dark:bg-[#1a2b29] border-[#d8e2e1] dark:border-[#2d4341]"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#d8e2e1] dark:border-[#2d4341] gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#e07a5f]" />
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#3d5b59] dark:text-[#a5cfcc]">
                    3. Accessibility Accommodations
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[#5e7775] font-semibold text-[11px]">Presets:</span>
                  <button
                    type="button"
                    onClick={() => loadPreset("adhd")}
                    className="px-2 py-1 rounded-lg bg-[#e8f1f0] dark:bg-[#253b3a] hover:bg-[#d8e8e6] text-[#3d5b59] dark:text-[#a5cfcc] text-[11px] font-bold cursor-pointer"
                    title="Quick preset for Dyslexia, ADHD, or focus support"
                  >
                    Dyslexia/ADHD
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset("low_vision")}
                    className="px-2 py-1 rounded-lg bg-[#fbeee9] dark:bg-[#382320] hover:bg-[#f7dfd6] text-[#e07a5f] text-[11px] font-bold cursor-pointer"
                    title="Quick preset with High Contrast and Extra Large text for Low Vision"
                  >
                    Low Vision
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset("standard")}
                    className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-[#203331] text-[#5e7775] text-[11px] font-bold cursor-pointer"
                    title="Standard examination settings without modifications"
                  >
                    Standard
                  </button>
                </div>
              </div>

              {/* Time extension & font scaling */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {/* Extra Time */}
                <div className="p-3.5 rounded-2xl border border-[#d8e2e1] dark:border-[#2d4341] bg-[#fbf9f5] dark:bg-[#203331]">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 text-[#192726] dark:text-stone-200">
                    <Clock className="w-3.5 h-3.5 text-[#e07a5f]" />
                    Time Extension
                  </label>
                  <p className="text-[10px] text-[#5e7775] mb-2 leading-relaxed">
                    Compensatory examination pacing for voice dictation & review.
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["none", "1.25x", "1.5x", "2x"] as AccommodationExtraTime[]).map((val) => (
                      <button
                        key={`time-ext-${val}`}
                        type="button"
                        onClick={() => setExtraTime(val)}
                        className={`py-1.5 text-xs font-extrabold rounded-xl border transition-colors cursor-pointer ${
                          extraTime === val
                            ? "bg-[#3d5b59] text-white border-[#3d5b59] shadow-2xs"
                            : "bg-white dark:bg-[#1a2b29] text-[#5e7775] border-[#d8e2e1] dark:border-[#2d4341] hover:border-[#3d5b59]/40"
                        }`}
                      >
                        {val === "none" ? "1.0x" : val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Typography Size */}
                <div className="p-3.5 rounded-2xl border border-[#d8e2e1] dark:border-[#2d4341] bg-[#fbf9f5] dark:bg-[#203331]">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 text-[#192726] dark:text-stone-200">
                    <Type className="w-3.5 h-3.5 text-[#e07a5f]" />
                    Text Scaling
                  </label>
                  <p className="text-[10px] text-[#5e7775] mb-2 leading-relaxed">
                    Adjusts font magnification across questions and transcripts.
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["normal", "large", "x-large"] as const).map((val) => (
                      <button
                        key={`font-size-${val}`}
                        type="button"
                        onClick={() => setFontSize(val)}
                        className={`py-1.5 text-xs font-extrabold rounded-xl border transition-colors capitalize cursor-pointer ${
                          fontSize === val
                            ? "bg-[#3d5b59] text-white border-[#3d5b59] shadow-2xs"
                            : "bg-white dark:bg-[#1a2b29] text-[#5e7775] border-[#d8e2e1] dark:border-[#2d4341] hover:border-[#3d5b59]/40"
                        }`}
                      >
                        {val.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <label className="flex items-start gap-3 p-3 rounded-2xl border border-[#d8e2e1] dark:border-[#2d4341] bg-[#fbf9f5] dark:bg-[#203331] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-[#3d5b59] cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#192726] dark:text-stone-200 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-[#e07a5f]" /> High-Contrast Mode
                    </span>
                    <span className="text-[10px] text-[#5e7775] block mt-0.5">
                      Stark contrast palette with amber highlights for low-vision candidates.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-2xl border border-[#d8e2e1] dark:border-[#2d4341] bg-[#fbf9f5] dark:bg-[#203331] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dyslexiaFont}
                    onChange={(e) => setDyslexiaFont(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-[#3d5b59] cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#192726] dark:text-stone-200">
                      Dyslexia-Friendly Typography
                    </span>
                    <span className="text-[10px] text-[#5e7775] block mt-0.5">
                      Enhanced letter tracking & spacing to prevent visual crowding.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-2xl border border-[#d8e2e1] dark:border-[#2d4341] bg-[#fbf9f5] dark:bg-[#203331] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voiceFeedback}
                    onChange={(e) => setVoiceFeedback(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-[#3d5b59] cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#192726] dark:text-stone-200 flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-[#e07a5f]" /> Auditory Feedback
                    </span>
                    <span className="text-[10px] text-[#5e7775] block mt-0.5">
                      Immediate earcon chimes and spoken voice confirmation on commands.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-2xl border border-[#d8e2e1] dark:border-[#2d4341] bg-[#fbf9f5] dark:bg-[#203331] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoReadQuestions}
                    onChange={(e) => setAutoReadQuestions(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-[#3d5b59] cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#192726] dark:text-stone-200">
                      Auto-Read Prompts Aloud
                    </span>
                    <span className="text-[10px] text-[#5e7775] block mt-0.5">
                      TTS speaks questions whenever navigating to a new question.
                    </span>
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-5 border-t border-[#d8e2e1] dark:border-[#2d4341] mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={onSwitchToScribe}
                  className="text-xs font-bold text-[#5e7775] hover:text-[#3d5b59] dark:hover:text-stone-200 underline underline-offset-4 cursor-pointer"
                >
                  Return to Document Scribe
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#e07a5f] hover:bg-[#cc674e] active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#e07a5f]/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Continue to System Check</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
