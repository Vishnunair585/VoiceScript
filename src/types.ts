export type ScreenState = "SETUP_VIEW" | "WORKSPACE_VIEW" | "PDF_SUCCESS";

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
