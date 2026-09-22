export type ScreenState =
  "SETUP_VIEW" | "WORKSPACE_VIEW" | "PDF_SUCCESS" | "DOCUMENTS_VIEW";

export type Subject =
  | "Mathematics"
  | "Chemistry"
  | "Physics"
  | "Biology"
  | "English"
  | "History"
  | "General"
  | "Computer Science";

export type Language = "English";

export type SheetSize = "A4" | "Normal Exam Paper";
export type SheetOrientation = "Portrait" | "Landscape";

export interface AnswerData {
  rawTranscript: string;
  formattedText: string;
  subject: Subject;
  language: Language;
  targetLanguage: Language;
  studentName: string;
  examinerName: string;
  timestamp: string;
  sheetSize: SheetSize;
  sheetOrientation: SheetOrientation;
}

/* ============================================================================
 * EXAM MODE TYPES  (NEW — VoiceScript Secure Examination Platform)
 * These types back the hands-free, voice-controlled examination system that
 * sits alongside the original free-form Scribe workspace above.
 * ========================================================================= */

// The five screens that make up the secure exam flow.
export type ExamScreen =
  | "LOGIN" // Secure candidate login / access-code check
  | "INSTRUCTIONS" // Exam rules + full-screen + "begin exam"
  | "ACTIVE" // The live, timed exam with voice navigation & answering
  | "REVIEW" // Final review of every answer before submission
  | "SUBMITTED"; // Post-submission confirmation with tamper-evident receipt

// A single exam question pulled from the (sample) question bank.
export interface ExamQuestion {
  id: number;
  subject: Subject;
  prompt: string;
  marks: number;
}

// The kinds of simple shapes a candidate can draw purely by voice.
export type DiagramShapeType =
  | "rectangle"
  | "triangle"
  | "circle"
  | "arrow"
  | "line"
  | "axis"
  | "label";

// One shape inside a voice-drawn diagram (positioned on a 0-400 x 0-260 canvas).
export interface DiagramShape {
  id: string;
  type: DiagramShapeType;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  w?: number;
  h?: number;
  text?: string;
}

// A single voice-created diagram (a named collection of shapes) attached to an answer.
export interface ExamDiagram {
  id: string;
  title: string;
  shapes: DiagramShape[];
}

// Per-question answer state, including undo/redo history and diagrams.
export interface ExamAnswer {
  questionId: number;
  formatted: string; // Structured answer text (markdown + LaTeX + [[DIAGRAM:id]] markers)
  markedForReview: boolean;
  visited: boolean;
  diagrams: ExamDiagram[];
  history: string[]; // Undo stack of previous "formatted" states
  redo: string[]; // Redo stack
  lastSavedAt: number | null; // epoch ms of last successful autosave
}

// One tamper-evident audit trail entry (login, navigation, edits, submission…).
export interface AuditEvent {
  time: string; // ISO-8601 timestamp
  type: string; // e.g. "LOGIN", "NAV", "EDIT", "MATH", "DIAGRAM", "SUBMIT"
  detail: string;
}

// Accessibility preferences for the exam UI.
export interface AccessibilitySettings {
  largeText: boolean;
  highContrast: boolean;
  noiseSuppression: boolean;
  sttLanguage: string; // BCP-47 code used for SpeechRecognition
}

// The final, hashed, tamper-evident submission bundle.
export interface ExamSubmissionRecord {
  studentName: string;
  rollNumber: string;
  subject: Subject;
  startedAt: string;
  submittedAt: string;
  answers: { questionId: number; prompt: string; marks: number; answer: string }[];
  auditLog: AuditEvent[];
  sha256: string;
}

// Everything persisted to localStorage for autosave / crash-recovery.
export interface PersistedExamSession {
  studentName: string;
  rollNumber: string;
  subject: Subject;
  screen: ExamScreen;
  currentIndex: number;
  remainingSeconds: number;
  startedAt: string | null;
  answers: Record<number, ExamAnswer>;
  auditLog: AuditEvent[];
  accessibility: AccessibilitySettings;
  savedAt: number;
}