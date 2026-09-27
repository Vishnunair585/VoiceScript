import React, { useState, useEffect } from "react";
import {
  ExamCandidate,
  ExamPaper,
  CandidateAnswer,
  ExamQuestion,
} from "../../types";
import { KaTeXText } from "../KaTeXText";
import { generateSvgMarkup } from "../../lib/diagramVoice";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Flag,
  ArrowLeft,
  Volume2,
  VolumeX,
  Edit3,
  Send,
  HelpCircle,
  Clock,
  Sparkles,
  Award,
} from "lucide-react";

interface ExamReviewProps {
  candidate: ExamCandidate;
  paper: ExamPaper;
  answers: Record<string, CandidateAnswer>;
  remainingSeconds: number;
  onEditQuestion: (index: number) => void;
  onConfirmFinalSubmit: () => void;
  onBackToWorkspace: () => void;
  onAutoFillUnanswered?: () => void;
}

export function ExamReview({
  candidate,
  paper,
  answers,
  remainingSeconds,
  onEditQuestion,
  onConfirmFinalSubmit,
  onBackToWorkspace,
  onAutoFillUnanswered,
}: ExamReviewProps) {
  const [filter, setFilter] = useState<"all" | "flagged" | "unanswered" | "answered">("all");
  const [readingQuestionId, setReadingQuestionId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const highContrast = candidate.accommodations.highContrast;

  // Statistics
  const totalQuestions = paper.questions.length;
  const answeredQuestions = paper.questions.filter((q) => {
    const a = answers[q.id];
    return (
      a &&
      ((a.textAnswer && a.textAnswer.trim().length > 0) ||
        a.selectedOption ||
        (a.diagramShapes && a.diagramShapes.length > 0))
    );
  });
  const answeredCount = answeredQuestions.length;
  const flaggedCount = paper.questions.filter((q) => answers[q.id]?.isFlaggedForReview).length;
  const unansweredQuestions = paper.questions.filter((q) => {
    const a = answers[q.id];
    return !(
      a &&
      ((a.textAnswer && a.textAnswer.trim().length > 0) ||
        a.selectedOption ||
        (a.diagramShapes && a.diagramShapes.length > 0))
    );
  });
  const unansweredCount = unansweredQuestions.length;
  const allQuestionsAnswered = unansweredCount === 0;

  // Speech cleanup
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleAttemptSubmit = () => {
    if (!allQuestionsAnswered) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const unansNumbers = unansweredQuestions.map((q) => `Question ${q.number}`).join(", ");
        const utterance = new SpeechSynthesisUtterance(
          `You cannot submit yet. All questions must have an answer. Please answer ${unansNumbers} before submitting.`
        );
        window.speechSynthesis.speak(utterance);
      }
      return;
    }
    setShowConfirmModal(true);
  };

  const speakQuestionAndAnswer = (q: ExamQuestion) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    if (readingQuestionId === q.id) {
      setReadingQuestionId(null);
      return;
    }

    const a = answers[q.id];
    let spokenText = `Question ${q.number}. ${q.prompt}. `;
    if (a?.selectedOption) {
      spokenText += `Your selected option is: ${a.selectedOption}. `;
    } else if (a?.textAnswer && a.textAnswer.trim().length > 0) {
      spokenText += `Your recorded answer is: ${a.textAnswer}. `;
    } else {
      spokenText += `You have not recorded an answer for this question. `;
    }

    if (a?.diagramShapes && a.diagramShapes.length > 0) {
      spokenText += `A diagram with ${a.diagramShapes.length} geometric elements is attached. `;
    }

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = candidate.accommodations.speechRate || 1.0;
    utterance.onend = () => setReadingQuestionId(null);
    utterance.onerror = () => setReadingQuestionId(null);
    setReadingQuestionId(q.id);
    window.speechSynthesis.speak(utterance);
  };

  const filteredQuestions = paper.questions.filter((q) => {
    const a = answers[q.id];
    const isAnswered =
      a &&
      ((a.textAnswer && a.textAnswer.trim().length > 0) ||
        a.selectedOption ||
        (a.diagramShapes && a.diagramShapes.length > 0));
    const isFlagged = a?.isFlaggedForReview;

    if (filter === "flagged") return isFlagged;
    if (filter === "unanswered") return !isAnswered;
    if (filter === "answered") return isAnswered;
    return true;
  });

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    await onConfirmFinalSubmit();
  };

  return (
    <div className={`min-h-screen ${highContrast ? "bg-black text-amber-300 font-medium" : "bg-[#fbf9f5] dark:bg-[#121e1d] text-[#192726] dark:text-[#edf5f4]"} py-6 px-3 sm:px-6 lg:px-8 transition-colors`}>
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#1a2b29] p-3.5 rounded-2xl border border-[#d8e2e1] dark:border-[#2d4341] shadow-xs">
          <button
            type="button"
            onClick={onBackToWorkspace}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border ${
              highContrast
                ? "border-amber-400 bg-black text-amber-300 hover:bg-amber-950/40"
                : "border-[#d8e2e1] dark:border-[#2d4341] bg-[#fbf9f5] dark:bg-[#253b3a] text-[#192726] dark:text-stone-200 hover:bg-[#e8f1f0] dark:hover:bg-[#2e4745]"
            } font-bold text-xs transition-colors cursor-pointer shadow-2xs`}
            title="Navigate to Previous Page (Exam Workspace)"
            aria-label="Previous Page"
          >
            <ArrowLeft className={`w-4 h-4 ${highContrast ? "text-amber-400" : "text-[#3d5b59] dark:text-[#a5cfcc]"}`} />
            <span>Previous Page (Exam Workspace)</span>
          </button>

          <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-full ${
            highContrast ? "bg-amber-950 border border-amber-400 text-amber-300" : "bg-[#e8f1f0] dark:bg-[#253b3a] text-[#3d5b59] dark:text-[#a5cfcc] border border-[#3d5b59]/20"
          }`}>
            {paper.code}: {paper.title}
          </span>
        </div>

        {/* Header card with summary statistics */}
        <div className={`${highContrast ? "bg-black border-2 border-amber-400 text-amber-300" : "bg-white dark:bg-[#1a2b29] border border-[#d8e2e1] dark:border-[#2d4341] text-[#192726] dark:text-[#edf5f4]"} rounded-3xl p-6 shadow-xs`}>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${highContrast ? "border-amber-500" : "border-[#d8e2e1] dark:border-[#2d4341]"}`}>
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-6 h-6 ${highContrast ? "text-amber-400" : "text-[#e07a5f]"}`} />
                <h1 className={`text-2xl font-black ${highContrast ? "text-amber-300" : "text-[#192726] dark:text-white"}`}>
                  Examination Submission Review
                </h1>
              </div>
              <p className={`text-xs ${highContrast ? "text-amber-400" : "text-[#5e7775]"} mt-1`}>
                Candidate: <strong className={highContrast ? "text-amber-200" : "text-[#192726] dark:text-stone-200"}>{candidate.candidateName}</strong> ({candidate.candidateId})
              </p>
            </div>

            <button
              type="button"
              onClick={handleAttemptSubmit}
              disabled={!allQuestionsAnswered}
              className={`px-6 py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !allQuestionsAnswered
                  ? "bg-stone-300 dark:bg-stone-800 text-stone-500 cursor-not-allowed opacity-60"
                  : highContrast
                  ? "bg-amber-400 hover:bg-amber-300 text-black font-black"
                  : "bg-[#e07a5f] hover:bg-[#cc674e] active:scale-95 text-white font-black shadow-lg shadow-[#e07a5f]/25"
              }`}
              title={
                !allQuestionsAnswered
                  ? `All questions must be answered (${unansweredCount} remaining)`
                  : "Finalize & Submit Exam"
              }
            >
              <Send className="w-4 h-4" />
              <span>
                {!allQuestionsAnswered
                  ? `Submit (${unansweredCount} Incomplete)`
                  : "Finalize & Submit Exam"}
              </span>
            </button>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                filter === "all"
                  ? "border-[#3d5b59] bg-[#e8f1f0] dark:bg-[#253b3a] ring-2 ring-[#3d5b59]/30"
                  : "border-[#d8e2e1] dark:border-[#2d4341] hover:bg-[#fbf9f5] dark:hover:bg-[#203331]"
              }`}
            >
              <span className="text-[10px] font-bold text-[#5e7775] block uppercase">Total Questions</span>
              <span className="text-2xl font-black text-[#192726] dark:text-white font-mono">
                {totalQuestions}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("answered")}
              className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                filter === "answered"
                  ? "border-[#3d5b59] bg-[#e8f1f0] dark:bg-[#253b3a] ring-2 ring-[#3d5b59]/30"
                  : "border-[#d8e2e1] dark:border-[#2d4341] hover:bg-[#fbf9f5] dark:hover:bg-[#203331]"
              }`}
            >
              <span className="text-[10px] font-bold text-[#3d5b59] dark:text-[#a5cfcc] block uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3d5b59] dark:text-[#a5cfcc]" /> Answered
              </span>
              <span className="text-2xl font-black text-[#3d5b59] dark:text-[#a5cfcc] font-mono">
                {answeredCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("unanswered")}
              className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                filter === "unanswered"
                  ? "border-[#e07a5f] bg-[#fbeee9] dark:bg-[#382320] ring-2 ring-[#e07a5f]/40"
                  : "border-[#d8e2e1] dark:border-[#2d4341] hover:bg-[#fbf9f5] dark:hover:bg-[#203331]"
              }`}
            >
              <span className="text-[10px] font-bold text-[#e07a5f] block uppercase flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Incomplete
              </span>
              <span className="text-2xl font-black text-[#e07a5f] font-mono">
                {unansweredCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("flagged")}
              className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                filter === "flagged"
                  ? "border-amber-600 bg-amber-50/50 dark:bg-amber-950/40 ring-2 ring-amber-500"
                  : "border-[#d8e2e1] dark:border-[#2d4341] hover:bg-[#fbf9f5] dark:hover:bg-[#203331]"
              }`}
            >
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block uppercase flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 fill-current" /> Flagged
              </span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {flaggedCount}
              </span>
            </button>
          </div>
        </div>

        {/* Incomplete questions mandatory status banner */}
        {!allQuestionsAnswered ? (
          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-sm space-y-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-base">
                  All Questions Must Be Answered Before Final Submission ({unansweredCount} Incomplete)
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  Examination rules require you to record an answer for all {totalQuestions} questions before you can finalize and seal the answer sheet.
                </p>
              </div>
            </div>

            {/* Jump buttons directly to incomplete questions */}
            <div className="pt-2 border-t border-amber-200 dark:border-amber-800/80">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block mb-2">
                Click or speak to answer the remaining {unansweredCount} {unansweredCount === 1 ? "question" : "questions"}:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {unansweredQuestions.map((q) => {
                  const qIdx = paper.questions.findIndex((x) => x.id === q.id);
                  return (
                    <button
                      key={`unans-btn-${q.id}`}
                      type="button"
                      onClick={() => onEditQuestion(qIdx)}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      title={`Jump to Question #${q.number}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Answer Question #{q.number} ({q.section})</span>
                    </button>
                  );
                })}

                {onAutoFillUnanswered && (
                  <button
                    type="button"
                    onClick={onAutoFillUnanswered}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    title="Fill all unanswered questions with verified candidate sample responses for review"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Quick-Fill Sample Answers (Assist Mode)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-sm flex items-center gap-3 shadow-xs">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <h3 className="font-black text-base text-emerald-900 dark:text-emerald-100">
                All {totalQuestions} of {totalQuestions} Questions Successfully Answered!
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                All questions have recorded responses. You are eligible to finalize and seal your examination.
              </p>
            </div>
          </div>
        )}

        {/* Questions Breakdown List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-stone-900 dark:text-stone-100">
              Questions Breakdown ({filteredQuestions.length})
            </h2>
            <span className="text-xs text-stone-500">
              Showing: <strong className="capitalize">{filter}</strong>
            </span>
          </div>

          {filteredQuestions.map((q) => {
            const a = answers[q.id];
            const hasAnswer =
              a &&
              ((a.textAnswer && a.textAnswer.trim().length > 0) ||
                a.selectedOption ||
                (a.diagramShapes && a.diagramShapes.length > 0));
            const isFlagged = a?.isFlaggedForReview;
            const isReading = readingQuestionId === q.id;

            return (
              <div
                key={`rev-card-${q.id}`}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-mono font-black text-xs flex items-center justify-center">
                      {q.number}
                    </span>
                    <span className="text-xs font-bold text-stone-500">{q.section}</span>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      {q.marks} Marks
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isFlagged && (
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-md">
                        <Flag className="w-3.5 h-3.5 fill-current" /> Flagged
                      </span>
                    )}

                    {hasAnswer ? (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Answered
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-md">
                        <AlertTriangle className="w-3.5 h-3.5" /> Not Answered
                      </span>
                    )}

                    {/* Audio read back */}
                    <button
                      type="button"
                      onClick={() => speakQuestionAndAnswer(q)}
                      className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                        isReading
                          ? "bg-blue-600 text-white border-blue-600 animate-pulse"
                          : "border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
                      }`}
                      title="Listen to this question and answer"
                    >
                      {isReading ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => onEditQuestion(q.number - 1)}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 text-stone-700 dark:text-stone-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-stone-200 dark:border-stone-700"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Answer
                    </button>
                  </div>
                </div>

                {/* Question Prompt */}
                <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  {q.prompt}
                </div>

                {/* Candidate's Recorded Answer */}
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 text-xs">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1.5">
                    Your Response:
                  </span>

                  {q.type === "mcq" && a?.selectedOption ? (
                    <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                      Selected Option: {a.selectedOption}
                    </div>
                  ) : a?.textAnswer ? (
                    <div className="space-y-2">
                      <KaTeXText text={a.textAnswer} />
                    </div>
                  ) : (
                    <span className="text-stone-400 italic">No answer recorded yet.</span>
                  )}

                  {/* Diagram thumbnail if shapes exist */}
                  {a?.diagramShapes && a.diagramShapes.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-stone-200 dark:border-stone-700">
                      <span className="text-[11px] font-bold text-stone-500 block mb-1">
                        Attached Diagram ({a.diagramShapes.length} shapes):
                      </span>
                      <div
                        className="max-w-xs border rounded-lg p-1 bg-white dark:bg-stone-900"
                        dangerouslySetInnerHTML={{
                          __html: generateSvgMarkup(a.diagramShapes, 300, 160),
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom submit confirmation trigger */}
        <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToWorkspace}
            className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 text-sm font-bold cursor-pointer"
          >
            ← Back to Questions
          </button>

          <button
            type="button"
            onClick={handleAttemptSubmit}
            disabled={!allQuestionsAnswered}
            className={`px-8 py-3.5 rounded-xl font-black text-base flex items-center gap-2 transition-all ${
              !allQuestionsAnswered
                ? "bg-stone-300 dark:bg-stone-800 text-stone-500 cursor-not-allowed opacity-60"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 cursor-pointer"
            }`}
          >
            <Send className="w-5 h-5" />
            <span>
              {!allQuestionsAnswered
                ? `Answer Remaining ${unansweredCount} Questions to Submit`
                : "Proceed to Final Submission"}
            </span>
          </button>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
                    Confirm Final Submission
                  </h3>
                  <p className="text-xs text-stone-500">
                    Tamper-Evident SHA-256 Digital Sealing
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 text-xs space-y-2 text-stone-700 dark:text-stone-300">
                <p>
                  You are about to submit paper <strong className="font-mono text-stone-900 dark:text-stone-100">{paper.code}</strong>.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200 dark:border-stone-700">
                  <div>
                    Answered: <strong className="text-emerald-600">{answeredCount}/{totalQuestions}</strong>
                  </div>
                  <div>
                    Unanswered: <strong className="text-red-600">{unansweredCount}</strong>
                  </div>
                </div>
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-400">
                Once submitted, a cryptographic SHA-256 hash certificate will seal your answers and audit log. No further edits will be permitted.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 text-xs font-bold cursor-pointer"
                >
                  Keep Reviewing
                </button>

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>Generating SHA-256 Hash...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Seal & Submit Exam
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
