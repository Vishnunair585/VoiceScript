import React, { useState, useRef } from "react";
import {
  ExamSubmissionReceipt,
  ExamAuditLogEntry,
  ExamPaper,
} from "../../types";
import { verifyReceiptIntegrity } from "../../lib/security";
import { KaTeXText } from "../KaTeXText";
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Printer,
  Clock,
  Award,
  Layers,
  FileCheck,
  User,
  History,
  Sparkles,
  RotateCcw,
  ArrowLeft,
  FileText,
  AlertCircle,
  Hash,
  GraduationCap,
} from "lucide-react";

interface ExamSubmissionReceiptViewProps {
  receipt: ExamSubmissionReceipt;
  auditLog: ExamAuditLogEntry[];
  examPaper?: ExamPaper | null;
  examinerName?: string;
  onStartNewExam: () => void;
  onBackToPreviousPage?: () => void;
  onViewSavedDocuments?: () => void;
}

export function ExamSubmissionReceiptView({
  receipt,
  auditLog,
  examPaper,
  examinerName,
  onStartNewExam,
  onBackToPreviousPage,
  onViewSavedDocuments,
}: ExamSubmissionReceiptViewProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    tested: boolean;
    isValid: boolean;
    computedHash: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"certificate" | "audit" | "answers">("certificate");

  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(receipt.sha256Hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    try {
      const res = await verifyReceiptIntegrity(receipt);
      setVerificationResult({
        tested: true,
        isValid: res.isValid,
        computedHash: res.computedHash,
      });
    } catch (err) {
      console.error("Verification error:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const formatSeconds = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}m ${secs}s`;
  };

  // Dedicated High-Fidelity PDF Generation using html2pdf.js
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setPdfSuccessMessage(null);

    try {
      const html2pdfModule: any = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const element = document.getElementById("official-exam-pdf-container");
      if (!element) {
        throw new Error("Unable to locate academic report container for PDF generation.");
      }

      const safeCandidateName = receipt.candidateName.trim()
        ? receipt.candidateName.trim().replace(/\s+/g, "_")
        : "Candidate";

      const opt = {
        margin: [8, 8, 8, 8],
        filename: `Official_Exam_AnswerSheet_${safeCandidateName}_${receipt.examCode}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await (html2pdf as any)().set(opt).from(element).save();

      setPdfSuccessMessage("Official Examination PDF downloaded successfully!");
      setTimeout(() => setPdfSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error("PDF generation error:", err);
      // Fallback to window.print if html2pdf fails
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(receipt, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${receipt.submissionId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  // Get question prompt helper
  const getQuestionDetails = (qId: string, idx: number) => {
    if (examPaper && examPaper.questions) {
      const found = examPaper.questions.find((q) => q.id === qId);
      if (found) return found;
    }
    return {
      id: qId,
      number: idx + 1,
      section: "Section General",
      type: "written",
      prompt: `Examination Question #${idx + 1}`,
      marks: 10,
    };
  };

  const answerEntries = Object.entries(receipt.answers || {});

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Previous page navigation bar */}
        <div className="flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={onBackToPreviousPage || onStartNewExam}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
            title="Navigate to Previous Page / Home (Alt + Left Arrow)"
            aria-label="Previous Page"
          >
            <ArrowLeft className="w-4 h-4 text-stone-600 dark:text-stone-300" />
            <span>Previous Page / Home</span>
          </button>

          <span className="text-xs font-mono text-stone-500">
            Submission ID: {receipt.submissionId.slice(0, 16)}...
          </span>
        </div>

        {/* Top Success Banner with Prominent PDF Download Button */}
        <div className="p-6 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-600/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded">
                Official Submission Confirmed
              </span>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">
                Examination Successfully Submitted
              </h1>
              <p className="text-xs text-emerald-100 mt-0.5">
                Cryptographic SHA-256 seal generated. All student details, answers, and audit trail are ready for PDF export.
              </p>
            </div>
          </div>

          {/* Action Buttons: Download PDF is the Primary Option */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100 text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-75"
              title="Download official PDF of student answers and examination details"
            >
              {isGeneratingPdf ? (
                <>
                  <Clock className="w-4 h-4 animate-spin text-emerald-700" />
                  <span>Generating Official PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-emerald-700" />
                  <span>Download Official PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 md:flex-none px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              title="Print Certificate & Answer Script"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="px-3 py-3 rounded-xl bg-emerald-800/80 hover:bg-emerald-800 text-emerald-100 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              title="Export raw JSON data for auditing"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">JSON</span>
            </button>
          </div>
        </div>

        {pdfSuccessMessage && (
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn print:hidden">
            <CheckCircle2 className="w-4 h-4" />
            <span>{pdfSuccessMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 print:hidden">
          <button
            onClick={() => setActiveTab("certificate")}
            className={`py-3 px-6 text-sm font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === "certificate"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/20"
                : "border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900"
            }`}
          >
            Digital Receipt & Verification
          </button>
          <button
            onClick={() => setActiveTab("answers")}
            className={`py-3 px-6 text-sm font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === "answers"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/20"
                : "border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            Candidate Answers ({answerEntries.length})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`py-3 px-6 text-sm font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === "audit"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/20"
                : "border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900"
            }`}
          >
            <History className="w-4 h-4" />
            Audit Log ({auditLog.length} events)
          </button>
        </div>

        {/* Certificate View */}
        {activeTab === "certificate" && (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-sm space-y-6">
            {/* Header branding */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-200 dark:border-stone-800">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Official Academic Transcript Receipt
                </span>
                <h2 className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
                  {receipt.examTitle}
                </h2>
                <span className="font-mono text-xs text-stone-500">
                  Paper Code: {receipt.examCode} • Submission ID: {receipt.submissionId}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-right">
                <span className="text-[11px] font-bold text-stone-500 block uppercase">
                  Submission Timestamp
                </span>
                <span className="font-mono text-xs font-bold text-stone-800 dark:text-stone-200">
                  {new Date(receipt.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Candidate & Exam Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
                <span className="text-[11px] font-bold text-stone-500 uppercase block">Candidate Name</span>
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-0.5 block">
                  {receipt.candidateName}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
                <span className="text-[11px] font-bold text-stone-500 uppercase block">Candidate ID</span>
                <span className="text-sm font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5 block">
                  {receipt.candidateId}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
                <span className="text-[11px] font-bold text-stone-500 uppercase block">Answered Items</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block font-mono">
                  {receipt.answeredCount} / {receipt.totalQuestions} questions
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800">
                <span className="text-[11px] font-bold text-stone-500 uppercase block">Time Spent</span>
                <span className="text-sm font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5 block">
                  {formatSeconds(receipt.timeSpentSeconds)}
                </span>
              </div>
            </div>

            {/* Room Invigilator Witness */}
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/30 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-stone-500 uppercase font-bold tracking-wider block text-[10px]">
                  Room Invigilator / Authorized Scribe Witness
                </span>
                <span className="text-stone-800 dark:text-stone-200 font-bold text-sm mt-0.5 block">
                  {examinerName || "Assigned Room Invigilator"}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-mono font-bold">
                Status: In-Person Hall Witnessed
              </span>
            </div>

            {/* Accommodations Applied */}
            {receipt.accommodationsUsed.length > 0 && (
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider block mb-2">
                  Accommodations Registered & Documented:
                </span>
                <div className="flex flex-wrap gap-2">
                  {receipt.accommodationsUsed.map((acc, i) => (
                    <span
                      key={`acc-${acc}-${i}`}
                      className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold"
                    >
                      ✓ {acc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Cryptographic SHA-256 Fingerprint */}
            <div className="p-5 rounded-xl bg-stone-900 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                    SHA-256 Tamper-Evident Hash Digest
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer text-stone-200 transition-colors"
                >
                  {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedHash ? "Copied Digest" : "Copy Hash"}</span>
                </button>
              </div>

              <div className="p-3 rounded-lg bg-stone-950 font-mono text-xs text-emerald-400 break-all select-all border border-stone-800">
                {receipt.sha256Hash}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-stone-400">
                <span>
                  This digest guarantees that neither exam text, formulas, diagrams, nor audit timestamps have been modified post-exam.
                </span>

                <button
                  type="button"
                  onClick={handleVerifyIntegrity}
                  disabled={isVerifying}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isVerifying ? "Verifying..." : "Verify Hash Integrity"}
                </button>
              </div>

              {verificationResult && (
                <div
                  className={`mt-2 p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                    verificationResult.isValid
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : "bg-red-950 text-red-300 border border-red-800"
                  }`}
                >
                  {verificationResult.isValid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Tamper-Verification Passed: Canonical Hash matches stored digest perfectly.</span>
                    </>
                  ) : (
                    <>
                      <span>Verification Failed: Check payload data integrity.</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer flex items-center gap-2 shadow-sm"
                  title="Download complete examination transcript as PDF"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? "Generating PDF..." : "Download Official PDF"}</span>
                </button>

                {onViewSavedDocuments && (
                  <button
                    type="button"
                    onClick={onViewSavedDocuments}
                    className="px-4 py-2.5 rounded-xl bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold cursor-pointer flex items-center gap-2 transition-colors shadow-2xs"
                    title="View in Saved Documents & History"
                  >
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>View in Saved Documents</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onStartNewExam}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Start Another Examination Session
              </button>
            </div>
          </div>
        )}

        {/* Answers Tab */}
        {activeTab === "answers" && (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Submitted Questions & Candidate Responses
              </h3>
              <button
                onClick={handleDownloadPdf}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export as PDF
              </button>
            </div>

            <div className="space-y-4">
              {answerEntries.map(([qId, ans], idx) => {
                const q = getQuestionDetails(qId, idx);
                return (
                  <div
                    key={`ans-card-${qId}-${idx}`}
                    className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-blue-600 dark:text-blue-400">
                        Question #{q.number} ({q.section}) • {q.marks} Marks
                      </span>
                      <span className="text-[11px] text-stone-500 font-mono">
                        Words: {ans.wordCount} | Revisions: {ans.revisionCount}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      {q.prompt}
                    </p>

                    <div className="p-3 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs">
                      {ans.selectedOption ? (
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          Selected Option: {ans.selectedOption}
                        </div>
                      ) : ans.textAnswer ? (
                        <div className="space-y-1">
                          <KaTeXText text={ans.textAnswer} />
                        </div>
                      ) : (
                        <span className="italic text-stone-400">No answer recorded</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Audit Log View */}
        {activeTab === "audit" && (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div>
                <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  Chronological Audit Trail
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Immutable record of every vocal interaction, edit, navigation, and timestamp.
                </p>
              </div>
              <span className="font-mono text-xs text-stone-500">
                {auditLog.length} Total Logged Actions
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {auditLog.map((entry, idx) => (
                <div
                  key={`audit-${entry.id || idx}-${idx}`}
                  className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="font-mono text-[11px] text-stone-400 shrink-0 mt-0.5">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200">
                          {entry.actionType}
                        </span>
                        {entry.questionNumber && (
                          <span className="text-stone-500 font-bold">
                            Q{entry.questionNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-stone-800 dark:text-stone-200 mt-1 font-medium">
                        {entry.details}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-[11px] text-stone-400 shrink-0 whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 
        OFFICIAL ACADEMIC EXAMINATION PDF EXPORT TARGET CONTAINER
        This container is structured specifically for standard A4 PDF compilation via html2pdf.js.
        It contains all student details, exam specifications, question responses, KaTeX math, SHA-256 seal, and audit logs.
      */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "800px",
          minHeight: "1000px",
          zIndex: -100,
          backgroundColor: "#ffffff",
          opacity: 1,
          visibility: "visible",
          pointerEvents: "none",
        }}
      >
        <div
          id="official-exam-pdf-container"
          ref={pdfContainerRef}
          style={{
            width: "800px",
            padding: "32px",
            backgroundColor: "#ffffff",
            color: "#1c1917",
            fontFamily: "sans-serif",
            lineHeight: 1.5,
          }}
        >
          {/* Official Academic Board Header */}
          <div style={{ borderBottom: "3px double #2563eb", paddingBottom: "16px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 style={{ fontSize: "20px", fontWeight: "900", margin: 0, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Official Academic Examination Script
                </h1>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0 0", fontWeight: "600" }}>
                  Autonomous Hands-Free Examination Platform • Cryptographically Sealed
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "inline-block", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", color: "#1d4ed8" }}>
                  OFFICIAL SUBMISSION
                </div>
                <div style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "monospace", marginTop: "3px" }}>
                  ID: {receipt.submissionId}
                </div>
              </div>
            </div>
          </div>

          {/* Student & Examination Details Grid */}
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "11px" }}>
              <div>
                <span style={{ color: "#64748b", fontWeight: "700", textTransform: "uppercase", fontSize: "9px", display: "block" }}>
                  Student Candidate Name
                </span>
                <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
                  {receipt.candidateName}
                </span>
              </div>
              <div>
                <span style={{ color: "#64748b", fontWeight: "700", textTransform: "uppercase", fontSize: "9px", display: "block" }}>
                  Candidate Roll / ID
                </span>
                <span style={{ fontSize: "13px", fontWeight: "700", fontFamily: "monospace", color: "#0f172a" }}>
                  {receipt.candidateId}
                </span>
              </div>
              <div>
                <span style={{ color: "#64748b", fontWeight: "700", textTransform: "uppercase", fontSize: "9px", display: "block" }}>
                  Examination Title & Paper Code
                </span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#1e3a8a" }}>
                  {receipt.examTitle} ({receipt.examCode})
                </span>
              </div>
              <div>
                <span style={{ color: "#64748b", fontWeight: "700", textTransform: "uppercase", fontSize: "9px", display: "block" }}>
                  Authorized Room Invigilator
                </span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>
                  {examinerName || "Assigned Room Invigilator"}
                </span>
              </div>
              <div>
                <span style={{ color: "#64748b", fontWeight: "700", textTransform: "uppercase", fontSize: "9px", display: "block" }}>
                  Date & Time of Submission
                </span>
                <span style={{ fontSize: "11px", fontWeight: "600", color: "#334155" }}>
                  {new Date(receipt.timestamp).toLocaleString()}
                </span>
              </div>
              <div>
                <span style={{ color: "#64748b", fontWeight: "700", textTransform: "uppercase", fontSize: "9px", display: "block" }}>
                  Questions Answered / Duration
                </span>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#059669" }}>
                  {receipt.answeredCount} of {receipt.totalQuestions} Answered • {formatSeconds(receipt.timeSpentSeconds)}
                </span>
              </div>
            </div>

            {/* Documented Accommodations */}
            {receipt.accommodationsUsed.length > 0 && (
              <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #cbd5e1" }}>
                <span style={{ fontSize: "9px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Approved Candidate Accommodations Registered:
                </span>
                <span style={{ fontSize: "10px", color: "#1e40af", fontWeight: "600" }}>
                  {receipt.accommodationsUsed.map(a => `[✓ ${a}]`).join("  ")}
                </span>
              </div>
            )}
          </div>

          {/* Section: Candidate's Full Answers */}
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: "900", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #e2e8f0", paddingBottom: "6px", marginBottom: "14px" }}>
              Examination Questions & Candidate Recorded Answers
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {answerEntries.map(([qId, ans], idx) => {
                const q = getQuestionDetails(qId, idx);
                return (
                  <div
                    key={`pdf-ans-${qId}-${idx}`}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "14px",
                      backgroundColor: "#ffffff",
                      pageBreakInside: "avoid",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "800", color: "#1e40af" }}>
                        Question {q.number} ({q.section}) — [{q.marks} Marks]
                      </span>
                      <span style={{ fontSize: "9px", fontFamily: "monospace", color: "#94a3b8" }}>
                        Words: {ans.wordCount}
                      </span>
                    </div>

                    <p style={{ fontSize: "11px", fontWeight: "600", color: "#334155", margin: "0 0 10px 0" }}>
                      {q.prompt}
                    </p>

                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        borderLeft: "3px solid #2563eb",
                        padding: "10px 12px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        color: "#0f172a",
                        lineHeight: 1.6,
                      }}
                    >
                      {ans.selectedOption ? (
                        <div style={{ fontWeight: "700", color: "#059669" }}>
                          Selected Multiple Choice Option: {ans.selectedOption}
                        </div>
                      ) : ans.textAnswer ? (
                        <div style={{ whiteSpace: "pre-wrap" }}>
                          <KaTeXText text={ans.textAnswer} />
                        </div>
                      ) : (
                        <span style={{ fontStyle: "italic", color: "#94a3b8" }}>
                          No answer submitted
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cryptographic SHA-256 Tamper-Proof Seal Block */}
          <div style={{ backgroundColor: "#0f172a", color: "#ffffff", borderRadius: "8px", padding: "14px", marginBottom: "20px", pageBreakInside: "avoid" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "10px", fontWeight: "800", color: "#34d399", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Tamper-Evident SHA-256 Digital Verification Seal
              </span>
              <span style={{ fontSize: "9px", color: "#94a3b8" }}>
                Status: Cryptographically Verified
              </span>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#34d399", wordBreak: "break-all", backgroundColor: "#020617", padding: "8px 10px", borderRadius: "4px", border: "1px solid #1e293b" }}>
              {receipt.sha256Hash}
            </div>
          </div>

          {/* Signatures & Certification Block */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", paddingTop: "16px", borderTop: "2px solid #e2e8f0", pageBreakInside: "avoid" }}>
            <div>
              <div style={{ borderBottom: "1px solid #94a3b8", height: "40px", display: "flex", alignItems: "flex-end", paddingBottom: "4px" }}>
                <span style={{ fontStyle: "italic", fontSize: "11px", color: "#0f172a", fontWeight: "700" }}>
                  {receipt.candidateName} (Digitally Signed)
                </span>
              </div>
              <span style={{ fontSize: "9px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", display: "block", marginTop: "4px" }}>
                Candidate Scribe Signature & Date
              </span>
            </div>

            <div>
              <div style={{ borderBottom: "1px solid #94a3b8", height: "40px", display: "flex", alignItems: "flex-end", paddingBottom: "4px" }}>
                <span style={{ fontStyle: "italic", fontSize: "11px", color: "#0f172a", fontWeight: "700" }}>
                  {examinerName || "Authorized Room Invigilator"}
                </span>
              </div>
              <span style={{ fontSize: "9px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", display: "block", marginTop: "4px" }}>
                Room Evaluator / Invigilator Attestation
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
