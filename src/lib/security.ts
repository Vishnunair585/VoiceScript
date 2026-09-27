import {
  AuditActionType,
  CandidateAnswer,
  ExamAuditLogEntry,
  ExamCandidate,
  ExamPaper,
  ExamSubmissionReceipt,
} from "../types";

/**
 * Computes a standard SHA-256 hexadecimal hash string for any text data.
 */
export async function computeSha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

/**
 * Creates an immutable audit log entry.
 */
export function createAuditEntry(
  actionType: AuditActionType,
  details: string,
  questionId?: string,
  questionNumber?: number
): ExamAuditLogEntry {
  const now = Date.now();
  return {
    id: `audit_${now}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    isoTime: new Date(now).toISOString(),
    actionType,
    details,
    questionId,
    questionNumber,
  };
}

/**
 * Generates the canonical string for a submission before hashing.
 * Ensures consistent serialization for tamper verification.
 */
export function generateCanonicalSubmissionString(payload: {
  candidateId: string;
  candidateName: string;
  examCode: string;
  timestamp: string;
  answers: Record<string, CandidateAnswer>;
  auditLogSummary: { totalEvents: number; firstActionIso: string; lastActionIso: string };
}): string {
  // Sort answers by question ID for deterministic hashing
  const sortedQuestionIds = Object.keys(payload.answers).sort();
  const normalizedAnswers = sortedQuestionIds.map((qid) => {
    const a = payload.answers[qid];
    return {
      qid,
      text: (a.textAnswer || "").trim(),
      option: a.selectedOption || "",
      latex: a.latexMath || "",
      shapesCount: a.diagramShapes?.length || 0,
      modified: a.lastModified,
    };
  });

  return JSON.stringify({
    candidateId: payload.candidateId,
    candidateName: payload.candidateName,
    examCode: payload.examCode,
    timestamp: payload.timestamp,
    answers: normalizedAnswers,
    audit: payload.auditLogSummary,
  });
}

/**
 * Constructs a sealed, tamper-evident submission receipt with SHA-256 digest.
 */
export async function createSubmissionReceipt(
  candidate: ExamCandidate,
  paper: ExamPaper,
  answers: Record<string, CandidateAnswer>,
  auditLog: ExamAuditLogEntry[],
  timeSpentSeconds: number
): Promise<ExamSubmissionReceipt> {
  const nowIso = new Date().toISOString();
  const submissionId = `SUB-${paper.code}-${candidate.candidateId}-${Date.now().toString(36).toUpperCase()}`;

  const answeredCount = Object.values(answers).filter(
    (a) => (a.textAnswer && a.textAnswer.trim().length > 0) || a.selectedOption || (a.diagramShapes && a.diagramShapes.length > 0)
  ).length;

  const flaggedCount = Object.values(answers).filter((a) => a.isFlaggedForReview).length;

  const auditSummary = {
    totalEvents: auditLog.length,
    firstActionIso: auditLog[0]?.isoTime || nowIso,
    lastActionIso: auditLog[auditLog.length - 1]?.isoTime || nowIso,
  };

  const canonicalString = generateCanonicalSubmissionString({
    candidateId: candidate.candidateId,
    candidateName: candidate.candidateName,
    examCode: paper.code,
    timestamp: nowIso,
    answers,
    auditLogSummary: auditSummary,
  });

  const sha256Hash = await computeSha256(canonicalString);

  const accommodationsUsed: string[] = [];
  if (candidate.accommodations.extraTime !== "none") {
    accommodationsUsed.push(`Extra Time: ${candidate.accommodations.extraTime}`);
  }
  if (candidate.accommodations.highContrast) accommodationsUsed.push("High Contrast Theme");
  if (candidate.accommodations.dyslexiaFont) accommodationsUsed.push("Dyslexia-friendly Font");
  if (candidate.accommodations.voiceFeedback) accommodationsUsed.push("Voice Guidance Audio Feedback");
  if (candidate.accommodations.fontSize !== "normal") {
    accommodationsUsed.push(`Large Typography (${candidate.accommodations.fontSize})`);
  }

  return {
    submissionId,
    candidateId: candidate.candidateId,
    candidateName: candidate.candidateName,
    examCode: paper.code,
    examTitle: paper.title,
    timestamp: nowIso,
    timeSpentSeconds,
    totalQuestions: paper.questions.length,
    answeredCount,
    flaggedCount,
    answers,
    sha256Hash,
    accommodationsUsed,
    auditSummary,
  };
}

export const createExamSubmissionReceipt = createSubmissionReceipt;

/**
 * Verifies that a submission receipt has not been tampered with.
 */
export async function verifyReceiptIntegrity(receipt: ExamSubmissionReceipt): Promise<{
  isValid: boolean;
  computedHash: string;
  expectedHash: string;
}> {
  const canonical = generateCanonicalSubmissionString({
    candidateId: receipt.candidateId,
    candidateName: receipt.candidateName,
    examCode: receipt.examCode,
    timestamp: receipt.timestamp,
    answers: receipt.answers,
    auditLogSummary: receipt.auditSummary,
  });

  const computedHash = await computeSha256(canonical);
  const isValid = computedHash === receipt.sha256Hash;

  return {
    isValid,
    computedHash,
    expectedHash: receipt.sha256Hash,
  };
}
