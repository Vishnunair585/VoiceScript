import { ExamSessionState, ExamSubmissionReceipt } from "../types";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const SESSION_STORAGE_KEY = "voicescript_active_exam_session";
const RECEIPTS_STORAGE_KEY = "voicescript_submission_receipts";

/**
 * Persists current in-progress exam session to localStorage.
 */
export function saveExamSession(state: ExamSessionState): void {
  try {
    const payload = {
      ...state,
      lastAutosavedAt: Date.now(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error("Failed to autosave exam session to local storage:", err);
  }
}

/**
 * Checks whether an active, unfinished session exists in storage.
 */
export function hasRecoverableSession(): boolean {
  try {
    const item = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!item) return false;
    const parsed = JSON.parse(item);
    return Boolean(parsed && parsed.isExamActive && parsed.candidate);
  } catch {
    return false;
  }
}

/**
 * Retrieves the stored session for recovery.
 */
export function loadExamSession(): ExamSessionState | null {
  try {
    const item = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!item) return null;
    return JSON.parse(item) as ExamSessionState;
  } catch (err) {
    console.error("Failed to load stored exam session:", err);
    return null;
  }
}

/**
 * Purges the in-progress session upon successful final submission.
 */
export function clearExamSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear exam session:", err);
  }
}

/**
 * Saves a completed submission receipt to local archive.
 */
export function saveReceiptToLocalStorage(receipt: ExamSubmissionReceipt): void {
  try {
    const existing = loadReceipts();
    const updated = [receipt, ...existing.filter((r) => r.submissionId !== receipt.submissionId)];
    localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save receipt locally:", err);
  }
}

/**
 * Loads all submission receipts from local archive.
 */
export function loadReceipts(): ExamSubmissionReceipt[] {
  try {
    const item = localStorage.getItem(RECEIPTS_STORAGE_KEY);
    if (!item) return [];
    return JSON.parse(item) as ExamSubmissionReceipt[];
  } catch {
    return [];
  }
}

/**
 * Persists the tamper-evident receipt and audit log to Firebase Firestore if online.
 */
export async function saveReceiptToFirestore(
  receipt: ExamSubmissionReceipt,
  userId?: string
): Promise<string | null> {
  try {
    const collectionPath = userId ? `users/${userId}/exam_submissions` : "public_exam_submissions";
    const docRef = await addDoc(collection(db, collectionPath), {
      ...receipt,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.warn("Firestore sync unavailable or permission denied, retained local receipt:", err);
    return null;
  }
}
