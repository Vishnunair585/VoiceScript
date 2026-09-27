import React from "react";
import { ExamQuestion, CandidateAnswer } from "../../types";
import {
  Flag,
  CheckCircle2,
  Circle,
  Layers,
  ArrowLeft,
  ArrowRight,
  Navigation,
  Volume2,
  Clock,
  Mic,
} from "lucide-react";

interface QuestionNavigatorProps {
  questions: ExamQuestion[];
  currentIndex: number;
  answers: Record<string, CandidateAnswer>;
  onSelectQuestion: (index: number) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  onReadQuestion?: () => void;
  onReadAnswer?: () => void;
  onCheckTime?: () => void;
  onToggleFlag?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  highContrast?: boolean;
}

export function QuestionNavigator({
  questions,
  currentIndex,
  answers,
  onSelectQuestion,
  onNavigatePrev,
  onNavigateNext,
  onReadQuestion,
  onReadAnswer,
  onCheckTime,
  onToggleFlag,
  isOpenMobile,
  onCloseMobile,
  highContrast = false,
}: QuestionNavigatorProps) {
  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    if (!a) return false;
    return (
      (a.textAnswer && a.textAnswer.trim().length > 0) ||
      a.selectedOption ||
      (a.diagramShapes && a.diagramShapes.length > 0)
    );
  }).length;

  const flaggedCount = questions.filter((q) => answers[q.id]?.isFlaggedForReview).length;

  const handlePrev = () => {
    if (currentIndex > 0) {
      if (onNavigatePrev) onNavigatePrev();
      else onSelectQuestion(currentIndex - 1);
      if (onCloseMobile) onCloseMobile();
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      if (onNavigateNext) onNavigateNext();
      else onSelectQuestion(currentIndex + 1);
      if (onCloseMobile) onCloseMobile();
    }
  };

  return (
    <aside
      aria-label="Page and Question Navigation Panel"
      className={`rounded-2xl p-3 sm:p-3.5 flex flex-col h-full overflow-hidden shadow-xs border ${
        highContrast
          ? "bg-black border-2 border-yellow-400 text-yellow-300"
          : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800"
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between pb-2.5 border-b mb-2 shrink-0 ${
        highContrast ? "border-yellow-500" : "border-stone-200 dark:border-stone-800"
      }`}>
        <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-stone-900 dark:text-stone-100">
          <Navigation className={`w-4 h-4 ${highContrast ? "text-yellow-400" : "text-blue-600"}`} />
          <span>Page Navigation</span>
        </div>
        <div className={`text-[11px] font-mono font-bold ${highContrast ? "text-yellow-300" : "text-stone-500 dark:text-stone-400"}`}>
          {currentIndex + 1}/{questions.length} (Pg {currentIndex + 1})
        </div>
      </div>

      {/* Primary Page Navigation Controls (Left side of text box) */}
      <div className="flex items-center gap-1.5 mb-2.5 shrink-0">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
            highContrast
              ? "border-yellow-400 bg-yellow-400 text-black hover:bg-yellow-300"
              : "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-xs active:scale-95"
          }`}
          title="Previous Page / Question (Alt+P or say 'previous page')"
          aria-label="Previous Page"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous Page</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentIndex === questions.length - 1}
          className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
            highContrast
              ? "border-yellow-400 bg-yellow-400 text-black hover:bg-yellow-300"
              : "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-xs active:scale-95"
          }`}
          title="Next Page / Question (Alt+N or say 'next page')"
          aria-label="Next Page"
        >
          <span>Next Page</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress Pills */}
      <div className="grid grid-cols-2 gap-1.5 mb-2 shrink-0 text-[10px] font-bold">
        <div className={`p-1.5 rounded-lg border flex items-center gap-1.5 ${
          highContrast
            ? "bg-yellow-950/40 border-yellow-500 text-yellow-300"
            : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300"
        }`}>
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>{answeredCount}/{questions.length} Answered</span>
        </div>
        <div className={`p-1.5 rounded-lg border flex items-center gap-1.5 ${
          highContrast
            ? "bg-yellow-950/40 border-yellow-500 text-yellow-300"
            : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300"
        }`}>
          <Flag className="w-3 h-3 text-amber-500 fill-current" />
          <span>{flaggedCount} Flagged</span>
        </div>
      </div>

      {/* Question List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 min-h-0">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const ans = answers[q.id];
          const hasAnswer =
            ans &&
            ((ans.textAnswer && ans.textAnswer.trim().length > 0) ||
              ans.selectedOption ||
              (ans.diagramShapes && ans.diagramShapes.length > 0));
          const isFlagged = ans?.isFlaggedForReview;

          return (
            <button
              key={q.id}
              onClick={() => {
                onSelectQuestion(idx);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full text-left p-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                isCurrent
                  ? highContrast
                    ? "border-2 border-yellow-400 bg-yellow-950/60 text-yellow-300 font-bold shadow-xs"
                    : "border-blue-600 bg-blue-50/70 dark:bg-blue-950/50 ring-1 ring-blue-500/40 shadow-xs"
                  : highContrast
                  ? "border-yellow-600/50 hover:border-yellow-400 bg-black text-yellow-200"
                  : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-stone-50/40 dark:bg-stone-800/30"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-5 h-5 rounded-md text-[11px] font-mono font-black flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? highContrast
                        ? "bg-yellow-400 text-black font-black"
                        : "bg-blue-600 text-white"
                      : hasAnswer
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                      : "bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  {q.number}
                </span>

                <div className="truncate">
                  <div className={`text-[11px] font-bold truncate ${
                    highContrast ? "text-yellow-200" : "text-stone-900 dark:text-stone-100"
                  }`}>
                    {q.section.split(":")[0] || `Q${q.number}`}
                  </div>
                  <div className={`text-[10px] capitalize truncate ${
                    highContrast ? "text-yellow-400/80" : "text-stone-500"
                  }`}>
                    {q.type.replace("_", " ")} • {q.marks}m
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-1">
                {isFlagged && (
                  <Flag className="w-3 h-3 text-amber-500 fill-amber-500" />
                )}
                {hasAnswer ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Circle className="w-3 h-3 text-stone-300 dark:text-stone-600" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation Voice Commands Cheatsheet (Left side of text box) */}
      <div className={`mt-2 pt-2 border-t shrink-0 ${
        highContrast ? "border-yellow-500" : "border-stone-200 dark:border-stone-800"
      }`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
            highContrast ? "text-yellow-400" : "text-stone-600 dark:text-stone-400"
          }`}>
            <Mic className="w-3 h-3 text-blue-500" />
            Page Navigation Commands
          </span>
          <span className="text-[9px] font-mono text-stone-400">Left Side</span>
        </div>

        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`p-1 rounded-md border text-left cursor-pointer transition-colors disabled:opacity-40 ${
              highContrast
                ? "border-yellow-500/70 bg-black hover:border-yellow-400 text-yellow-300"
                : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 hover:bg-blue-50 dark:hover:bg-blue-950 text-stone-700 dark:text-stone-300"
            }`}
            title="Voice trigger: 'previous page' (Alt+P)"
          >
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block truncate">"previous page"</span>
            <span className="text-[9px] text-stone-500 block truncate">Alt+P</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === questions.length - 1}
            className={`p-1 rounded-md border text-left cursor-pointer transition-colors disabled:opacity-40 ${
              highContrast
                ? "border-yellow-500/70 bg-black hover:border-yellow-400 text-yellow-300"
                : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 hover:bg-blue-50 dark:hover:bg-blue-950 text-stone-700 dark:text-stone-300"
            }`}
            title="Voice trigger: 'next page' (Alt+N)"
          >
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block truncate">"next page"</span>
            <span className="text-[9px] text-stone-500 block truncate">Alt+N</span>
          </button>

          {onReadQuestion && (
            <button
              type="button"
              onClick={onReadQuestion}
              className={`p-1 rounded-md border text-left cursor-pointer transition-colors ${
                highContrast
                  ? "border-yellow-500/70 bg-black hover:border-yellow-400 text-yellow-300"
                  : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 hover:bg-blue-50 dark:hover:bg-blue-950 text-stone-700 dark:text-stone-300"
              }`}
              title="Voice trigger: 'read question aloud'"
            >
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block truncate">"read question"</span>
              <span className="text-[9px] text-stone-500 block truncate">Speak prompt</span>
            </button>
          )}

          {onReadAnswer && (
            <button
              type="button"
              onClick={onReadAnswer}
              className={`p-1 rounded-md border text-left cursor-pointer transition-colors ${
                highContrast
                  ? "border-yellow-500/70 bg-black hover:border-yellow-400 text-yellow-300"
                  : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 hover:bg-blue-50 dark:hover:bg-blue-950 text-stone-700 dark:text-stone-300"
              }`}
              title="Voice trigger: 'read answer'"
            >
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block truncate">"read answer"</span>
              <span className="text-[9px] text-stone-500 block truncate">Hear answer</span>
            </button>
          )}

          {onCheckTime && (
            <button
              type="button"
              onClick={onCheckTime}
              className={`p-1 rounded-md border text-left cursor-pointer transition-colors ${
                highContrast
                  ? "border-yellow-500/70 bg-black hover:border-yellow-400 text-yellow-300"
                  : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 hover:bg-blue-50 dark:hover:bg-blue-950 text-stone-700 dark:text-stone-300"
              }`}
              title="Voice trigger: 'check time'"
            >
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block truncate">"check time"</span>
              <span className="text-[9px] text-stone-500 block truncate">Time left</span>
            </button>
          )}

          {onToggleFlag && (
            <button
              type="button"
              onClick={onToggleFlag}
              className={`p-1 rounded-md border text-left cursor-pointer transition-colors ${
                highContrast
                  ? "border-yellow-500/70 bg-black hover:border-yellow-400 text-yellow-300"
                  : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 hover:bg-blue-50 dark:hover:bg-blue-950 text-stone-700 dark:text-stone-300"
              }`}
              title="Voice trigger: 'flag question' (Alt+F)"
            >
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block truncate">"flag question"</span>
              <span className="text-[9px] text-stone-500 block truncate">Alt+F</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
