export type ScreenState =
  | "SETUP_VIEW"
  | "WORKSPACE_VIEW"
  | "PDF_SUCCESS"
  | "DOCUMENTS_VIEW"
  | "EXAM_LOGIN"
  | "EXAM_INSTRUCTIONS"
  | "EXAM_WORKSPACE"
  | "EXAM_REVIEW"
  | "EXAM_SUBMITTED";

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

export interface DocumentPage {
  id: string;
  pageNumber: number;
  title?: string;
  transcript: string;
  formattedAnswer: string;
  diagramShapes?: DiagramShape[];
}

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
  pages?: DocumentPage[];
  totalPages?: number;
}

// ---------------------------------------------------------------------------
// ACCESSIBLE HANDS-FREE EXAM PLATFORM TYPES
// ---------------------------------------------------------------------------

export type AccommodationExtraTime = "none" | "1.25x" | "1.5x" | "2x";

export interface CandidateAccommodations {
  extraTime: AccommodationExtraTime;
  highContrast: boolean;
  dyslexiaFont: boolean;
  fontSize: "normal" | "large" | "x-large";
  speechRate: number; // 0.7 to 1.5
  voiceFeedback: boolean; // speaks out actions
  autoReadQuestions: boolean; // speaks question upon navigation
  soundEffects: boolean; // subtle audio cues on record/save/flag
}

export interface ExamCandidate {
  candidateId: string;
  candidateName: string;
  examPin: string;
  seatNumber?: string;
  accommodations: CandidateAccommodations;
}

export type QuestionType =
  | "mcq"
  | "short_answer"
  | "long_answer"
  | "math"
  | "diagram";

export interface QuestionOption {
  key: string;
  text: string;
}

export interface ExamQuestion {
  id: string;
  number: number;
  section: string;
  type: QuestionType;
  prompt: string;
  marks: number;
  wordLimit?: number;
  options?: QuestionOption[];
  mathTemplate?: string;
  diagramInitialPrompt?: string;
  hint?: string;
}

export interface DiagramShape {
  id: string;
  type: "circle" | "rect" | "line" | "triangle" | "arrow" | "text" | "ellipse";
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  x2?: number;
  y2?: number;
  stroke: string;
  fill: string;
  strokeWidth: number;
  text?: string;
  label?: string;
}

export interface CandidateAnswer {
  questionId: string;
  textAnswer: string;
  rawTranscript: string;
  latexMath?: string;
  diagramShapes?: DiagramShape[];
  selectedOption?: string;
  wordCount: number;
  isFlaggedForReview: boolean;
  lastModified: number;
  revisionCount: number;
}

export interface ExamPaper {
  id: string;
  code: string;
  title: string;
  subject: Subject;
  totalMinutes: number;
  totalMarks: number;
  instructions: string[];
  questions: ExamQuestion[];
}

export type AuditActionType =
  | "LOGIN"
  | "EXAM_START"
  | "NAVIGATE"
  | "VOICE_INPUT"
  | "VOICE_EDIT"
  | "MATH_CONVERT"
  | "DIAGRAM_DRAW"
  | "FLAG_QUESTION"
  | "AUTOSAVE"
  | "TIME_QUERY"
  | "TTS_READ"
  | "REVIEW_START"
  | "SUBMISSION"
  | "SYSTEM_RECOVERY"
  | "ASSIST";

export interface ExamAuditLogEntry {
  id: string;
  timestamp: number;
  isoTime: string;
  actionType: AuditActionType;
  details: string;
  questionId?: string;
  questionNumber?: number;
}

export interface ExamSubmissionReceipt {
  submissionId: string;
  candidateId: string;
  candidateName: string;
  examCode: string;
  examTitle: string;
  timestamp: string;
  timeSpentSeconds: number;
  totalQuestions: number;
  answeredCount: number;
  flaggedCount: number;
  answers: Record<string, CandidateAnswer>;
  sha256Hash: string;
  accommodationsUsed: string[];
  auditSummary: {
    totalEvents: number;
    firstActionIso: string;
    lastActionIso: string;
  };
}

export interface ExamSessionState {
  candidate: ExamCandidate | null;
  examPaper: ExamPaper | null;
  currentQuestionIndex: number;
  answers: Record<string, CandidateAnswer>;
  remainingSeconds: number;
  initialTotalSeconds: number;
  isExamActive: boolean;
  isPaused: boolean;
  auditLog: ExamAuditLogEntry[];
  lastAutosavedAt: number | null;
}

