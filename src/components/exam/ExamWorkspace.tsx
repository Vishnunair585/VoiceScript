import React, { useState, useEffect, useRef } from "react";
import {
  ExamCandidate,
  ExamPaper,
  CandidateAnswer,
  ExamAuditLogEntry,
  ExamSessionState,
} from "../../types";
import { ExamTimer } from "./ExamTimer";
import { QuestionNavigator } from "./QuestionNavigator";
import { VoiceAnswerEditor } from "./VoiceAnswerEditor";
import { createAuditEntry } from "../../lib/security";
import { saveExamSession } from "../../lib/storage";
import {
  Shield,
  ArrowLeft,
  ArrowRight,
  Eye,
  Type,
  Flag,
  FileCheck,
  Menu,
  X,
  Volume2,
  Sparkles,
  Command,
} from "lucide-react";

interface ExamWorkspaceProps {
  candidate: ExamCandidate;
  paper: ExamPaper;
  answers: Record<string, CandidateAnswer>;
  onAnswersChange: (answers: Record<string, CandidateAnswer>) => void;
  initialQuestionIndex?: number;
  onQuestionIndexChange?: (index: number) => void;
  remainingSeconds: number;
  onRemainingSecondsChange: (secs: number) => void;
  auditLog: ExamAuditLogEntry[];
  onAddAuditLog: (entry: ExamAuditLogEntry) => void;
  onGoToReview: () => void;
  onTimeExpired: () => void;
}

export function ExamWorkspace({
  candidate,
  paper,
  answers,
  onAnswersChange,
  initialQuestionIndex,
  onQuestionIndexChange,
  remainingSeconds,
  onRemainingSecondsChange,
  auditLog,
  onAddAuditLog,
  onGoToReview,
  onTimeExpired,
}: ExamWorkspaceProps) {
  const [currentIndex, setCurrentIndex] = useState(
    initialQuestionIndex !== undefined &&
      initialQuestionIndex >= 0 &&
      initialQuestionIndex < paper.questions.length
      ? initialQuestionIndex
      : 0
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(candidate.accommodations.highContrast);
  const [dyslexiaFont, setDyslexiaFont] = useState(candidate.accommodations.dyslexiaFont);
  const [fontSize, setFontSize] = useState(candidate.accommodations.fontSize);

  useEffect(() => {
    if (
      initialQuestionIndex !== undefined &&
      initialQuestionIndex >= 0 &&
      initialQuestionIndex < paper.questions.length &&
      initialQuestionIndex !== currentIndex
    ) {
      setCurrentIndex(initialQuestionIndex);
    }
  }, [initialQuestionIndex, paper.questions.length]);

  const currentQuestion = paper.questions[currentIndex];

  // Initialize answer record for question if missing
  const currentAnswer: CandidateAnswer =
    answers[currentQuestion.id] || {
      questionId: currentQuestion.id,
      textAnswer: "",
      rawTranscript: "",
      wordCount: 0,
      isFlaggedForReview: false,
      lastModified: Date.now(),
      revisionCount: 0,
    };

  const answeredCount = paper.questions.filter((q) => {
    const a = answers[q.id];
    return (
      a &&
      ((a.textAnswer && a.textAnswer.trim().length > 0) ||
        a.selectedOption ||
        (a.diagramShapes && a.diagramShapes.length > 0))
    );
  }).length;
  const allAnswered = answeredCount === paper.questions.length;

  // Timer countdown ticker
  useEffect(() => {
    const interval = setInterval(() => {
      onRemainingSecondsChange(Math.max(0, remainingSeconds - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSeconds, onRemainingSecondsChange]);

  // Periodic autosave to local storage
  useEffect(() => {
    const sessionState: ExamSessionState = {
      candidate,
      examPaper: paper,
      currentQuestionIndex: currentIndex,
      answers,
      remainingSeconds,
      initialTotalSeconds: Math.round(
        paper.totalMinutes *
          (candidate.accommodations.extraTime === "2x"
            ? 2
            : candidate.accommodations.extraTime === "1.5x"
            ? 1.5
            : candidate.accommodations.extraTime === "1.25x"
            ? 1.25
            : 1) *
          60
      ),
      isExamActive: true,
      isPaused: false,
      auditLog,
      lastAutosavedAt: Date.now(),
    };
    saveExamSession(sessionState);
  }, [answers, remainingSeconds, currentIndex]);

  // Answer modification handler
  const handleSingleAnswerChange = (newAnswer: CandidateAnswer, auditDetails?: string) => {
    const updated = {
      ...answers,
      [currentQuestion.id]: newAnswer,
    };
    onAnswersChange(updated);

    if (auditDetails) {
      const entry = createAuditEntry(
        "VOICE_EDIT",
        auditDetails,
        currentQuestion.id,
        currentQuestion.number
      );
      onAddAuditLog(entry);
    }
  };

  const handleNavigateQuestion = (index: number) => {
    if (index >= 0 && index < paper.questions.length) {
      setCurrentIndex(index);
      if (onQuestionIndexChange) {
        onQuestionIndexChange(index);
      }
      const targetQ = paper.questions[index];
      const entry = createAuditEntry(
        "NAVIGATE",
        `Navigated to Question ${targetQ.number} (${targetQ.type})`,
        targetQ.id,
        targetQ.number
      );
      onAddAuditLog(entry);
    }
  };

  const handleToggleFlag = () => {
    const newFlag = !currentAnswer.isFlaggedForReview;
    handleSingleAnswerChange(
      { ...currentAnswer, isFlaggedForReview: newFlag },
      `Toggled flag for Q${currentQuestion.number} to ${newFlag ? "FLAGGED" : "UNFLAGGED"}`
    );
  };

  const handleTimeQuery = () => {
    const entry = createAuditEntry(
      "TIME_QUERY",
      `Queried remaining time: ${Math.round(remainingSeconds / 60)} minutes left`
    );
    onAddAuditLog(entry);

    if ("speechSynthesis" in window) {
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      const utterance = new SpeechSynthesisUtterance(
        `You have ${mins} minutes and ${secs} seconds remaining in this exam.`
      );
      window.speechSynthesis.speak(utterance);
    }
  };

  // Keyboard shortcut navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNavigateQuestion(currentIndex + 1);
      } else if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handleNavigateQuestion(currentIndex - 1);
      } else if (e.altKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        handleToggleFlag();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, currentAnswer]);

  const speakExamText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div
      className={`h-screen max-h-screen overflow-hidden flex flex-col select-none ${
        highContrast
          ? "bg-black text-amber-300 font-bold"
          : "bg-[#fbf9f5] dark:bg-[#121e1d] text-[#192726] dark:text-[#edf5f4]"
      }`}
    >
      {/* Top Application Header */}
      <header
        className={`px-3 sm:px-6 py-2.5 border-b flex items-center justify-between gap-3 shrink-0 ${
          highContrast
            ? "border-amber-400 bg-black"
            : "border-[#d8e2e1] dark:border-[#2d4341] bg-white dark:bg-[#1a2b29] shadow-xs"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden p-2 rounded-lg border border-[#d8e2e1] dark:border-[#2d4341] text-[#3d5b59] dark:text-[#a5cfcc]"
            aria-label="Toggle navigation list"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#e8f1f0] dark:bg-[#253b3a] text-[#3d5b59] dark:text-[#a5cfcc] border border-[#3d5b59]/20">
                {paper.code}
              </span>
              <h1 className="font-bold text-sm sm:text-base text-[#192726] dark:text-stone-100 truncate max-w-[200px] sm:max-w-md">
                {paper.title}
              </h1>
            </div>
            <div className="text-[11px] text-[#5e7775] dark:text-stone-400">
              Candidate: <strong className="text-[#192726] dark:text-stone-200">{candidate.candidateName}</strong> ({candidate.candidateId})
            </div>
          </div>
        </div>

        {/* Center Page / Question Navigation bar */}
        <div className="hidden lg:flex items-center gap-1.5 bg-[#f4efe6] dark:bg-[#253b3a] p-1 rounded-xl border border-[#d8e2e1] dark:border-[#2d4341] shadow-2xs">
          <button
            type="button"
            onClick={() => handleNavigateQuestion(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="px-2.5 py-1.5 rounded-lg border border-transparent hover:border-[#3d5b59]/30 dark:hover:border-stone-600 bg-white dark:bg-[#1a2b29] text-[#192726] dark:text-stone-200 text-xs font-bold flex items-center gap-1 disabled:opacity-35 disabled:pointer-events-none cursor-pointer transition-colors shadow-2xs"
            title="Navigate to Previous Page / Question (Alt+P or speak 'Previous page')"
            aria-label="Previous Page"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous Page</span>
          </button>
          <span className="font-mono text-xs font-bold text-[#3d5b59] dark:text-[#a5cfcc] px-2 select-none">
            Page {currentIndex + 1} of {paper.questions.length}
          </span>
          <button
            type="button"
            onClick={() => handleNavigateQuestion(currentIndex + 1)}
            disabled={currentIndex === paper.questions.length - 1}
            className="px-2.5 py-1.5 rounded-lg border border-transparent hover:border-[#3d5b59]/30 dark:hover:border-stone-600 bg-white dark:bg-[#1a2b29] text-[#192726] dark:text-stone-200 text-xs font-bold flex items-center gap-1 disabled:opacity-35 disabled:pointer-events-none cursor-pointer transition-colors shadow-2xs"
            title="Navigate to Next Page / Question (Alt+N or speak 'Next question')"
            aria-label="Next Page"
          >
            <span>Next Page</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Timer Countdown */}
          <ExamTimer
            remainingSeconds={remainingSeconds}
            initialTotalSeconds={
              paper.totalMinutes *
              (candidate.accommodations.extraTime === "2x"
                ? 2
                : candidate.accommodations.extraTime === "1.5x"
                ? 1.5
                : candidate.accommodations.extraTime === "1.25x"
                ? 1.25
                : 1) *
              60
            }
            accommodationsExtraTime={candidate.accommodations.extraTime}
            onTimeExpired={onTimeExpired}
            voiceFeedback={candidate.accommodations.voiceFeedback}
          />

          {/* Accessibility Quick Toggles */}
          <button
            type="button"
            onClick={() => setHighContrast(!highContrast)}
            className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
              highContrast
                ? "bg-amber-400 text-black border-amber-400"
                : "border-[#d8e2e1] dark:border-[#2d4341] hover:bg-[#e8f1f0] dark:hover:bg-[#253b3a] text-[#3d5b59] dark:text-[#a5cfcc]"
            }`}
            title="Toggle High-Contrast Mode"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setFontSize((prev) =>
                prev === "normal" ? "large" : prev === "large" ? "x-large" : "normal"
              );
            }}
            className="p-2 rounded-xl border border-[#d8e2e1] dark:border-[#2d4341] hover:bg-[#e8f1f0] dark:hover:bg-[#253b3a] text-[#3d5b59] dark:text-[#a5cfcc] text-xs font-bold cursor-pointer"
            title="Cycle Font Sizing (Normal -> Large -> XL)"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Answer progress status pill */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
              allAnswered
                ? "bg-[#e8f1f0] dark:bg-[#253b3a] text-[#3d5b59] dark:text-[#a5cfcc] border-[#3d5b59]/30"
                : "bg-[#fbeee9] dark:bg-[#382320] text-[#e07a5f] dark:text-[#f4978e] border-[#e07a5f]/40"
            }`}
            title={
              allAnswered
                ? "All questions answered. Ready to submit."
                : `${paper.questions.length - answeredCount} questions remaining (all must be answered to submit)`
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                allAnswered ? "bg-[#3d5b59]" : "bg-[#e07a5f] animate-pulse"
              }`}
            />
            <span>
              {answeredCount}/{paper.questions.length} Answered
            </span>
          </div>

          {/* Go to Review & Submit */}
          <button
            type="button"
            onClick={onGoToReview}
            className="px-4 py-2 rounded-xl bg-[#e07a5f] hover:bg-[#cc674e] active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <FileCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Review & Submit</span>
          </button>
        </div>
      </header>

      {/* Main Examination Workspace: Left Navigation, Center Input/Output, Right Operations */}
      <div className="flex-1 min-h-0 flex overflow-hidden p-2 sm:p-3 gap-3">
        {/* Left Side Question Navigator (Desktop) */}
        <div className="hidden md:block w-72 lg:w-80 shrink-0 h-full overflow-hidden">
          <QuestionNavigator
            questions={paper.questions}
            currentIndex={currentIndex}
            answers={answers}
            onSelectQuestion={handleNavigateQuestion}
            onNavigatePrev={() => handleNavigateQuestion(currentIndex - 1)}
            onNavigateNext={() => handleNavigateQuestion(currentIndex + 1)}
            onReadQuestion={() => speakExamText(`Question ${currentQuestion.number}. ${currentQuestion.prompt}`)}
            onReadAnswer={() => speakExamText(currentAnswer.textAnswer || "No answer recorded yet.")}
            onCheckTime={handleTimeQuery}
            onToggleFlag={handleToggleFlag}
            highContrast={highContrast}
          />
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex md:hidden p-4">
            <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-xs p-4 shadow-xl flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200 dark:border-stone-800">
                <span className="font-bold text-sm">Exam Navigation</span>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1 rounded-lg text-stone-500 hover:bg-stone-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <QuestionNavigator
                  questions={paper.questions}
                  currentIndex={currentIndex}
                  answers={answers}
                  onSelectQuestion={handleNavigateQuestion}
                  onNavigatePrev={() => handleNavigateQuestion(currentIndex - 1)}
                  onNavigateNext={() => handleNavigateQuestion(currentIndex + 1)}
                  onReadQuestion={() => speakExamText(`Question ${currentQuestion.number}. ${currentQuestion.prompt}`)}
                  onReadAnswer={() => speakExamText(currentAnswer.textAnswer || "No answer recorded yet.")}
                  onCheckTime={handleTimeQuery}
                  onToggleFlag={handleToggleFlag}
                  highContrast={highContrast}
                  onCloseMobile={() => setMobileNavOpen(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Center & Right Question Workspace */}
        <main className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
          <VoiceAnswerEditor
            question={currentQuestion}
            answer={currentAnswer}
            onAnswerChange={handleSingleAnswerChange}
            accommodations={{
              ...candidate.accommodations,
              highContrast,
              dyslexiaFont,
              fontSize,
            }}
            onNavigateNext={() => handleNavigateQuestion(currentIndex + 1)}
            onNavigatePrev={() => handleNavigateQuestion(currentIndex - 1)}
            onTimeQuery={handleTimeQuery}
            onGoToReview={onGoToReview}
            hasPrev={currentIndex > 0}
            hasNext={currentIndex < paper.questions.length - 1}
          />
        </main>
      </div>
    </div>
  );
}
