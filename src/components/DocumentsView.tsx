import React, { useEffect, useState, useRef } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { db } from "../lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Calendar,
  Layout,
  Layers,
  X,
  Eye,
  Download,
  Printer,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { KaTeXText } from "./KaTeXText";
import { ExamSubmissionReceipt } from "../types";

export interface DocumentItem {
  id: string;
  formattedText: string;
  rawTranscript: string;
  subject: string;
  studentName: string;
  examinerName?: string;
  totalPages?: number;
  pages?: { id?: string; pageNumber: number; transcript: string; formattedAnswer: string }[];
  createdAt: { seconds: number; nanoseconds: number } | null | string | number;
  type?: "scribe" | "exam";
  examCode?: string;
  examTitle?: string;
  sha256Hash?: string;
  receipt?: ExamSubmissionReceipt;
}

interface DocumentsViewProps {
  user: FirebaseUser | null;
  onBack: () => void;
}

export function DocumentsView({ user, onBack }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [activeViewPageIndex, setActiveViewPageIndex] = useState<number>(0);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Helper to normalize timestamp
  const getTimestampMs = (createdAt: any): number => {
    if (!createdAt) return 0;
    if (typeof createdAt === "object" && "seconds" in createdAt) {
      return createdAt.seconds * 1000;
    }
    if (typeof createdAt === "number") return createdAt;
    if (typeof createdAt === "string") {
      const parsed = new Date(createdAt).getTime();
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const loadAllDocuments = async () => {
    setLoading(true);
    setError(null);

    // 1. First, retrieve locally cached documents (always fast and reliable)
    let localDocs: DocumentItem[] = [];
    try {
      const stored = localStorage.getItem("voice_saved_documents");
      if (stored) {
        localDocs = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Could not read local documents:", e);
    }

    // 2. If user is logged in, query Firestore and merge
    let firestoreDocs: DocumentItem[] = [];
    if (user) {
      try {
        const docsRef = collection(db, `users/${user.uid}/documents`);
        let snapshot;
        try {
          const q = query(docsRef, orderBy("createdAt", "desc"));
          snapshot = await getDocs(q);
        } catch {
          // Fallback without orderBy if composite index or missing field triggers error
          snapshot = await getDocs(docsRef);
        }

        snapshot.forEach((docSnap) => {
          firestoreDocs.push({ id: docSnap.id, ...docSnap.data() } as DocumentItem);
        });
      } catch (err: any) {
        console.warn("Firestore fetch warning (using local backup):", err);
      }
    }

    // 3. Merge both collections and deduplicate by ID
    const docMap = new Map<string, DocumentItem>();
    localDocs.forEach((d) => docMap.set(d.id, d));
    firestoreDocs.forEach((d) => docMap.set(d.id, d));

    const merged = Array.from(docMap.values());
    merged.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));

    setDocuments(merged);
    setLoading(false);
  };

  useEffect(() => {
    loadAllDocuments();
  }, [user]);

  const handleOpenDoc = (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setActiveViewPageIndex(0);
  };

  const handleDeleteDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = documents.filter((d) => d.id !== id);
    setDocuments(updated);
    try {
      localStorage.setItem("voice_saved_documents", JSON.stringify(updated));
    } catch {}
    if (selectedDoc?.id === id) {
      setSelectedDoc(null);
    }
  };

  const handleSeedSampleDocument = () => {
    const sampleExamDoc: DocumentItem = {
      id: "exam-sample-" + Date.now(),
      studentName: "Aarav Sharma",
      examinerName: "Dr. K. Ramanathan (Invigilator)",
      subject: "Mathematics",
      examCode: "MATH-402",
      examTitle: "Advanced Applied Mathematics & Mechanics",
      type: "exam",
      totalPages: 4,
      pages: [
        {
          id: "q-1",
          pageNumber: 1,
          transcript: "Question 1: Which of the following represents the derivative of f(x) = ln(3x^2 + 1)? Candidate selected Option A.",
          formattedAnswer: "### Question 1: Derivative of Natural Logarithm\n\n$$\\frac{d}{dx}\\ln(3x^2 + 1) = \\frac{1}{3x^2 + 1} \\cdot \\frac{d}{dx}(3x^2 + 1) = \\frac{6x}{3x^2 + 1}$$\n\n**Candidate Selected Option:** **A** (f'(x) = 6x / (3x^2 + 1))",
        },
        {
          id: "q-2",
          pageNumber: 2,
          transcript: "Question 2: Evaluate the definite integral of 3x^2 - 4x + 7 from 0 to 3. Step by step derivation.",
          formattedAnswer: "### Question 2: Definite Integration Evaluation\n\n$$\\int_{0}^{3} (3x^2 - 4x + 7)\\,dx = \\left[ x^3 - 2x^2 + 7x \\right]_{0}^{3}$$\n\nSubstituting limits:\n$$= (3^3 - 2(3^2) + 7(3)) - 0 = (27 - 18 + 21) = 30$$\n\n**Final Evaluated Answer:** **30**",
        },
        {
          id: "q-3",
          pageNumber: 3,
          transcript: "Question 3: Free-body diagram of block on horizontal surface.",
          formattedAnswer: "### Question 3: Free-Body Diagram & Equilibrium Analysis\n\n- Horizontal forces: $F_{\\text{applied}} - F_{\\text{friction}} = m \\cdot a_x$\n- Vertical equilibrium: $N - W = 0 \\implies N = m \\cdot g$\n- Geometric vectors registered in coordinate space.",
        },
        {
          id: "q-4",
          pageNumber: 4,
          transcript: "Question 4: Fundamental Theorem of Calculus explanation.",
          formattedAnswer: "### Question 4: Fundamental Theorem of Calculus\n\n**Introduction:**\nThe Fundamental Theorem of Calculus (FTC) connects differential and integral calculus.\n\n**Part 1 (First Fundamental Theorem):**\nIf $f$ is continuous on $[a, b]$, then $g(x) = \\int_{a}^{x} f(t)\\,dt$ is continuous and differentiable, with $g'(x) = f(x)$.\n\n**Part 2 (Evaluation Theorem):**\n$$\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$$\n\n**Conclusion:**\nProves differentiation and definite integration are reciprocal operations.",
        },
      ],
      rawTranscript: "Full mathematical examination script transcribed autonomously.",
      formattedText: "Official Academic Record for MATH-402",
      createdAt: Date.now(),
      sha256Hash: "8f4e2b1990c8a513d69b3f71c480ae401e0a297bdf7592e35e76a6e297a7407b",
    };

    const updated = [sampleExamDoc, ...documents];
    setDocuments(updated);
    try {
      localStorage.setItem("voice_saved_documents", JSON.stringify(updated));
    } catch {}
  };

  const handleDownloadDocPdf = async () => {
    if (!selectedDoc) return;
    setIsExportingPdf(true);

    try {
      const html2pdfModule: any = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const element = document.getElementById("document-inspect-pdf-container");
      if (!element) {
        window.print();
        return;
      }

      const safeName = (selectedDoc.studentName || "Candidate").replace(/\s+/g, "_");
      const codeStr = selectedDoc.examCode ? `_${selectedDoc.examCode}` : "";
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `${selectedDoc.subject || "Academic_Document"}_${safeName}${codeStr}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await (html2pdf as any)().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF export error:", err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const docPages =
    selectedDoc?.pages && selectedDoc.pages.length > 0
      ? selectedDoc.pages
      : selectedDoc
      ? [
          {
            id: "pg-1",
            pageNumber: 1,
            transcript: selectedDoc.rawTranscript,
            formattedAnswer: selectedDoc.formattedText,
          },
        ]
      : [];

  const currentViewPage = docPages[activeViewPageIndex] || docPages[0];
  const hasPrevViewPage = activeViewPageIndex > 0;
  const hasNextViewPage = activeViewPageIndex < docPages.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-4xl mx-auto w-full flex flex-col gap-6"
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] p-4 rounded-2xl shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 sm:px-3 sm:py-2 bg-[#FAF9F6] dark:bg-stone-800 hover:bg-[#E7E5E4] dark:hover:bg-stone-700 rounded-lg border border-[#E7E5E4] dark:border-stone-700 transition-all cursor-pointer text-stone-700 dark:text-stone-300 flex items-center gap-1.5"
            title="Navigate to Previous Screen"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600 dark:text-stone-300" />
            <span className="text-xs font-bold hidden sm:inline">Previous Screen</span>
          </button>
          <div>
            <h2 className="font-extrabold text-stone-900 dark:text-white text-lg leading-none">
              Saved Documents & Submissions
            </h2>
            <p className="text-stone-500 dark:text-stone-400 text-xs mt-1">
              View, inspect pages, and download official PDFs for your examination records.
            </p>
          </div>
        </div>

        <button
          onClick={loadAllDocuments}
          disabled={loading}
          className="p-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          title="Refresh Documents"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main documents container */}
      <div className="bg-[#FAF9F6] dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm min-h-[400px]">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 text-stone-500 gap-2">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-xs font-bold">Loading your saved documents...</span>
          </div>
        ) : error ? (
          <div className="text-center p-6 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 text-red-700 dark:text-red-300 text-sm">
            <p className="font-bold">{error}</p>
            <button
              onClick={loadAllDocuments}
              className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold"
            >
              Try Again
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center text-stone-500 flex flex-col items-center gap-3 justify-center h-64 flex-grow">
            <div className="w-14 h-14 rounded-2xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-400">
              <Layout className="w-8 h-8" />
            </div>
            <div>
              <p className="font-bold text-stone-700 dark:text-stone-300 text-base">
                No Saved Documents Found
              </p>
              <p className="text-xs text-stone-400 max-w-sm mt-1">
                Completed voice sheets and submitted examination answer scripts will be automatically saved and listed here.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSeedSampleDocument}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample Examination Script</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc, docIdx) => {
              const pageCount = doc.totalPages || doc.pages?.length || 1;
              const isExam = doc.type === "exam";
              const timeMs = getTimestampMs(doc.createdAt);
              const dateStr = timeMs ? new Date(timeMs).toLocaleString() : "Recent";

              return (
                <div
                  key={`doc-${doc.id || docIdx}-${docIdx}`}
                  onClick={() => handleOpenDoc(doc)}
                  className="bg-white dark:bg-stone-800 border border-[#E7E5E4] dark:border-stone-700 p-5 rounded-2xl flex flex-col gap-3 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer group relative"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isExam
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                              : "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
                          }`}
                        >
                          {isExam ? "Exam Submission" : "Scribe Sheet"}
                        </span>
                        {doc.subject && (
                          <span className="text-[11px] font-bold text-stone-500">
                            {doc.subject}
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-stone-900 dark:text-stone-100 text-base mt-1 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {doc.studentName || "Candidate Document"}
                      </h3>
                      {doc.examinerName && (
                        <p className="text-[11px] text-stone-400">
                          Invigilator: {doc.examinerName}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {pageCount} {pageCount === 1 ? "page" : "pages"}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteDoc(doc.id, e)}
                        className="p-1 rounded-lg text-stone-400 hover:text-red-500 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                        title="Delete Document from History"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed">
                    {doc.formattedText || doc.rawTranscript || "Examination script content."}
                  </p>

                  <div className="mt-auto pt-3 flex items-center justify-between border-t border-stone-100 dark:border-stone-700/60 text-xs">
                    <span className="text-[11px] font-mono text-stone-400">
                      {dateStr}
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>View & Export PDF</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Multi-Page Document Inspection Modal with Previous Page Access & PDF Export */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div
            key="doc-inspector-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            onClick={() => setSelectedDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] transition-colors"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start pb-4 border-b border-stone-200 dark:border-stone-700 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-stone-900 dark:text-white">
                      {selectedDoc.studentName || "Candidate Document"}
                    </h3>
                    <span className="text-xs font-mono font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                      {selectedDoc.subject}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Multi-Page Document Inspector • Total Pages: {docPages.length}
                    {selectedDoc.examinerName && ` • Invigilator: ${selectedDoc.examinerName}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadDocPdf}
                    disabled={isExportingPdf}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Export this entire document as a PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isExportingPdf ? "Exporting..." : "Download PDF"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDoc(null)}
                    className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-stone-500 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Multi-Page Navigation Bar */}
              <div className="bg-stone-50 dark:bg-stone-800/60 p-3 rounded-2xl border border-stone-200 dark:border-stone-700 flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveViewPageIndex((idx) => Math.max(0, idx - 1))}
                    disabled={!hasPrevViewPage}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      hasPrevViewPage
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                        : "bg-stone-200 dark:bg-stone-700 text-stone-400 dark:text-stone-500 cursor-not-allowed opacity-50"
                    }`}
                    title="Access Previous Page of this saved document"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Access Previous Page</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveViewPageIndex((idx) => Math.min(docPages.length - 1, idx + 1))
                    }
                    disabled={!hasNextViewPage}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      hasNextViewPage
                        ? "bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-600 shadow-2xs"
                        : "bg-stone-200 dark:bg-stone-700 text-stone-400 dark:text-stone-500 cursor-not-allowed opacity-50"
                    }`}
                    title="Go to Next Page"
                  >
                    <span>Next Page</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-stone-600 dark:text-stone-300">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>
                    Viewing Page {activeViewPageIndex + 1} of {docPages.length}
                  </span>
                </div>
              </div>

              {/* Page Content Display */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {currentViewPage && (
                  <div className="bg-stone-50 dark:bg-stone-800/40 p-5 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-700">
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase">
                        Page #{currentViewPage.pageNumber || activeViewPageIndex + 1}
                      </span>
                    </div>

                    <div className="text-stone-800 dark:text-stone-200 text-sm leading-relaxed font-sans">
                      <KaTeXText
                        text={
                          currentViewPage.formattedAnswer ||
                          currentViewPage.transcript ||
                          "No transcribed content for this page."
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-stone-200 dark:border-stone-700 mt-4 flex items-center justify-between text-xs text-stone-500">
                <span>VoiceScript Examination Record</span>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-2 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Close Viewer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offscreen printable target container for PDF download */}
      {selectedDoc && (
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
            id="document-inspect-pdf-container"
            style={{
              width: "800px",
              padding: "32px",
              backgroundColor: "#ffffff",
              color: "#1c1917",
              fontFamily: "sans-serif",
              lineHeight: 1.5,
            }}
          >
            <div style={{ borderBottom: "3px double #2563eb", paddingBottom: "16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h1 style={{ fontSize: "20px", fontWeight: "900", color: "#1e3a8a", margin: 0, textTransform: "uppercase" }}>
                    {selectedDoc.type === "exam" ? "Official Examination Script" : "Academic Scribe Record"}
                  </h1>
                  <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0 0" }}>
                    Autonomous Hands-Free Examination Platform • Certified Candidate Record
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase" }}>
                    {selectedDoc.type === "exam" ? "Official Exam Record" : "Standard Scribing"}
                  </div>
                  <div style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "monospace", marginTop: "2px" }}>
                    ID: {selectedDoc.id}
                  </div>
                </div>
              </div>
            </div>

            {/* Student & Examination Details Grid */}
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", marginBottom: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "11px" }}>
                <div>
                  <span style={{ color: "#64748b", fontWeight: "700", textTransform: "uppercase", fontSize: "9px", display: "block" }}>
                    Student Candidate Name
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>
                    {selectedDoc.studentName || "Candidate"}
                  </span>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontWeight: "700", textTransform: "uppercase", fontSize: "9px", display: "block" }}>
                    Authorized Scribe / Invigilator
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                    {selectedDoc.examinerName || "Assigned Room Invigilator"}
                  </span>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontWeight: "700", textTransform: "uppercase", fontSize: "9px", display: "block" }}>
                    Subject / Paper Specification
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#1e40af" }}>
                    {selectedDoc.subject} {selectedDoc.examCode ? `(${selectedDoc.examCode})` : ""}
                  </span>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontWeight: "700", textTransform: "uppercase", fontSize: "9px", display: "block" }}>
                    Total Pages / Date Created
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: "#334155" }}>
                    {docPages.length} Pages • {new Date(getTimestampMs(selectedDoc.createdAt)).toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedDoc.sha256Hash && (
                <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed #cbd5e1", fontSize: "10px" }}>
                  <span style={{ color: "#64748b", fontWeight: "700", textTransform: "uppercase", fontSize: "8px", display: "block" }}>
                    Cryptographic SHA-256 Seal:
                  </span>
                  <span style={{ fontFamily: "monospace", color: "#059669", fontWeight: "700", wordBreak: "break-all" }}>
                    {selectedDoc.sha256Hash}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {docPages.map((pg, idx) => (
                <div
                  key={`doc-pg-${pg.pageNumber || idx}-${idx}`}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "16px",
                    pageBreakInside: "avoid",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#1e40af", marginBottom: "8px" }}>
                    {selectedDoc.type === "exam" ? `QUESTION RESPONSE #${pg.pageNumber || idx + 1}` : `DOCUMENT PAGE ${pg.pageNumber || idx + 1}`}
                  </div>
                  <div style={{ fontSize: "12px", color: "#0f172a", whiteSpace: "pre-wrap" }}>
                    <KaTeXText text={pg.formattedAnswer || pg.transcript || ""} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
