/**
 * voiceCommands.ts (NEW MODULE)
 * -----------------------------------------------------------------------
 * Central "grammar" for every voice command supported by VoiceScript's
 * Exam Mode: navigation, mark-for-review, editing, long-answer structuring,
 * review-by-voice and math/diagram triggers.
 *
 * Every finalized chunk of speech coming out of the Web Speech API is run
 * through `parseSpokenCommand()`. If it matches a known command pattern the
 * caller executes that command instead of inserting the words into the
 * answer. If nothing matches, the text is treated as normal dictation and
 * is passed through `applyPunctuation()` before being appended.
 * -----------------------------------------------------------------------
 */

export type CommandType =
  | "NEXT_QUESTION"
  | "PREV_QUESTION"
  | "GOTO_QUESTION"
  | "MARK_REVIEW"
  | "UNMARK_REVIEW"
  | "REVIEW_MARKED"
  | "READ_QUESTION"
  | "REPEAT_QUESTION"
  | "STOP_READING"
  | "DELETE_LAST_SENTENCE"
  | "DELETE_LAST_WORD"
  | "REPLACE_TEXT"
  | "INSERT_AFTER_SENTENCE"
  | "INSERT_AFTER_PARAGRAPH"
  | "UNDO"
  | "REDO"
  | "NEW_PARAGRAPH"
  | "NEW_LINE"
  | "HEADING"
  | "BULLET"
  | "NUMBERED"
  | "INDENT"
  | "OUTDENT"
  | "READ_ANSWER"
  | "READ_PARAGRAPH"
  | "JUMP_SENTENCE"
  | "INSERT_MATH"
  | "INSERT_DIAGRAM"
  | "CLEAR_DIAGRAM"
  | "SUBMIT_EXAM"
  | "CONFIRM_SUBMIT"
  | "CANCEL_SUBMIT"
  | "NONE";

export interface ParsedCommand {
  type: CommandType;
  args?: Record<string, string | number>;
  /** The exact text that was recognised as a command (for the on-screen toast). */
  matchedPhrase?: string;
}

// Small helper: word-to-number map so "go to question five" works as well as "go to question 5".
const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
};

function toNumber(token: string): number | null {
  const cleaned = token.trim().toLowerCase();
  if (/^\d+$/.test(cleaned)) return parseInt(cleaned, 10);
  if (cleaned in WORD_NUMBERS) return WORD_NUMBERS[cleaned];
  return null;
}

// Ordered list of {regex, build} matchers. Order matters: more specific
// patterns must come before more general ones (e.g. "replace X with Y"
// must be checked before a generic dictation fallback).
type Matcher = { re: RegExp; build: (m: RegExpMatchArray) => ParsedCommand };

const NUM = "(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)";

const MATCHERS: Matcher[] = [
  // ---------- Navigation ----------
  { re: /^(?:go to |move to )?next question$/i, build: (m) => ({ type: "NEXT_QUESTION", matchedPhrase: m[0] }) },
  { re: /^(?:go to |move to )?previous question$/i, build: (m) => ({ type: "PREV_QUESTION", matchedPhrase: m[0] }) },
  { re: new RegExp(`^go to question ${NUM}$`, "i"), build: (m) => ({ type: "GOTO_QUESTION", args: { index: toNumber(m[1])! }, matchedPhrase: m[0] }) },
  { re: new RegExp(`^(?:open|jump to) question ${NUM}$`, "i"), build: (m) => ({ type: "GOTO_QUESTION", args: { index: toNumber(m[1])! }, matchedPhrase: m[0] }) },

  // ---------- Mark for review ----------
  { re: /^mark (?:this )?(?:question )?for review$/i, build: (m) => ({ type: "MARK_REVIEW", matchedPhrase: m[0] }) },
  { re: /^unmark (?:this )?(?:question )?(?:for review)?$/i, build: (m) => ({ type: "UNMARK_REVIEW", matchedPhrase: m[0] }) },
  { re: /^review marked questions$/i, build: (m) => ({ type: "REVIEW_MARKED", matchedPhrase: m[0] }) },

  // ---------- Question reader (TTS) ----------
  { re: /^repeat (?:the )?question$/i, build: (m) => ({ type: "REPEAT_QUESTION", matchedPhrase: m[0] }) },
  { re: /^read (?:the )?question$/i, build: (m) => ({ type: "READ_QUESTION", matchedPhrase: m[0] }) },
  { re: new RegExp(`^read (?:only )?question ${NUM}$`, "i"), build: (m) => ({ type: "READ_QUESTION", args: { index: toNumber(m[1])! }, matchedPhrase: m[0] }) },
  { re: /^stop reading$/i, build: (m) => ({ type: "STOP_READING", matchedPhrase: m[0] }) },

  // ---------- Editing ----------
  { re: /^delete (?:the )?last sentence$/i, build: (m) => ({ type: "DELETE_LAST_SENTENCE", matchedPhrase: m[0] }) },
  { re: /^delete (?:the )?last word$/i, build: (m) => ({ type: "DELETE_LAST_WORD", matchedPhrase: m[0] }) },
  { re: /^replace (.+?) with (.+)$/i, build: (m) => ({ type: "REPLACE_TEXT", args: { find: m[1].trim(), replaceWith: m[2].trim() }, matchedPhrase: m[0] }) },
  { re: new RegExp(`^insert after sentence ${NUM} (.+)$`, "i"), build: (m) => ({ type: "INSERT_AFTER_SENTENCE", args: { index: toNumber(m[1])!, text: m[2].trim() }, matchedPhrase: m[0] }) },
  { re: new RegExp(`^insert after paragraph ${NUM} (.+)$`, "i"), build: (m) => ({ type: "INSERT_AFTER_PARAGRAPH", args: { index: toNumber(m[1])!, text: m[2].trim() }, matchedPhrase: m[0] }) },
  { re: /^undo(?: (?:that|last edit))?$/i, build: (m) => ({ type: "UNDO", matchedPhrase: m[0] }) },
  { re: /^redo(?: (?:that|last edit))?$/i, build: (m) => ({ type: "REDO", matchedPhrase: m[0] }) },

  // ---------- Long-answer structuring ----------
  { re: /^new paragraph$/i, build: (m) => ({ type: "NEW_PARAGRAPH", matchedPhrase: m[0] }) },
  { re: /^new line$/i, build: (m) => ({ type: "NEW_LINE", matchedPhrase: m[0] }) },
  { re: /^(?:add |insert )?heading (.+)$/i, build: (m) => ({ type: "HEADING", args: { text: m[1].trim() }, matchedPhrase: m[0] }) },
  { re: /^(?:add |insert )?bullet(?: point)? (.+)$/i, build: (m) => ({ type: "BULLET", args: { text: m[1].trim() }, matchedPhrase: m[0] }) },
  { re: /^(?:add |insert )?numbered (?:point |item )?(.+)$/i, build: (m) => ({ type: "NUMBERED", args: { text: m[1].trim() }, matchedPhrase: m[0] }) },
  { re: /^indent$/i, build: (m) => ({ type: "INDENT", matchedPhrase: m[0] }) },
  { re: /^outdent$/i, build: (m) => ({ type: "OUTDENT", matchedPhrase: m[0] }) },

  // ---------- Review by voice ----------
  { re: /^read (?:my|the) (?:complete |full )?answer$/i, build: (m) => ({ type: "READ_ANSWER", matchedPhrase: m[0] }) },
  { re: new RegExp(`^read paragraph ${NUM}$`, "i"), build: (m) => ({ type: "READ_PARAGRAPH", args: { index: toNumber(m[1])! }, matchedPhrase: m[0] }) },
  { re: new RegExp(`^(?:go to|jump to) sentence ${NUM}$`, "i"), build: (m) => ({ type: "JUMP_SENTENCE", args: { index: toNumber(m[1])! }, matchedPhrase: m[0] }) },

  // ---------- Math & diagrams ----------
  { re: /^(?:insert|write|add) math (.+)$/i, build: (m) => ({ type: "INSERT_MATH", args: { phrase: m[1].trim() }, matchedPhrase: m[0] }) },
  { re: /^draw (.+)$/i, build: (m) => ({ type: "INSERT_DIAGRAM", args: { phrase: m[0].trim() }, matchedPhrase: m[0] }) },
  { re: /^(?:add|insert) (?:a |an )?(?:label|arrow) .+$/i, build: (m) => ({ type: "INSERT_DIAGRAM", args: { phrase: m[0].trim() }, matchedPhrase: m[0] }) },
  { re: /^clear (?:the )?diagram$/i, build: (m) => ({ type: "CLEAR_DIAGRAM", matchedPhrase: m[0] }) },

  // ---------- Submission ----------
  { re: /^submit (?:the )?exam$/i, build: (m) => ({ type: "SUBMIT_EXAM", matchedPhrase: m[0] }) },
  { re: /^(?:yes,? )?(?:i confirm|confirm submission|confirm submit)$/i, build: (m) => ({ type: "CONFIRM_SUBMIT", matchedPhrase: m[0] }) },
  { re: /^(?:no,? )?(?:cancel submission|cancel submit|do not submit)$/i, build: (m) => ({ type: "CANCEL_SUBMIT", matchedPhrase: m[0] }) },
];

/**
 * Attempts to interpret a finalized speech chunk as a voice command.
 * Returns { type: "NONE" } when the phrase should instead be dictated
 * into the answer as plain text.
 */
export function parseSpokenCommand(rawUtterance: string): ParsedCommand {
  const cleaned = rawUtterance.trim().replace(/\s+/g, " ").replace(/[.!?]+$/g, "");
  if (!cleaned) return { type: "NONE" };

  for (const matcher of MATCHERS) {
    const m = cleaned.match(matcher.re);
    if (m) return matcher.build(m);
  }
  return { type: "NONE" };
}

/**
 * Converts spoken punctuation words and simple dictation conventions into
 * real punctuation/formatting, and applies basic sentence capitalization.
 * This runs on any utterance that was NOT recognised as a command.
 */
export function applyPunctuation(text: string): string {
  let out = ` ${text} `;

  const replacements: [RegExp, string][] = [
    [/\s+comma\s+/gi, ", "],
    [/\s+full stop\s+/gi, ". "],
    [/\s+period\s+/gi, ". "],
    [/\s+question mark\s+/gi, "? "],
    [/\s+exclamation mark\s+/gi, "! "],
    [/\s+exclamation point\s+/gi, "! "],
    [/\s+colon\s+/gi, ": "],
    [/\s+semicolon\s+/gi, "; "],
    [/\s+open bracket\s+/gi, " ("],
    [/\s+close bracket\s+/gi, ") "],
    [/\s+open parenthesis\s+/gi, " ("],
    [/\s+close parenthesis\s+/gi, ") "],
    [/\s+open quote\s+/gi, ' "'],
    [/\s+close quote\s+/gi, '" '],
    [/\s+hyphen\s+/gi, "-"],
    [/\s+dash\s+/gi, " - "],
    [/\s+percent\s+/gi, "% "],
    [/\s+at the rate\s+/gi, "@"],
  ];

  for (const [re, replacement] of replacements) {
    out = out.replace(re, replacement);
  }

  out = out.replace(/\s{2,}/g, " ").trim();

  // Capitalize the first letter of each sentence.
  out = out.replace(/(^\s*\w|[.!?]\s+\w)/g, (s) => s.toUpperCase());

  // Tidy spacing before closing punctuation left over from replacements.
  out = out.replace(/\s+([,.!?;:])/g, "$1");

  return out;
}

/** Splits formatted answer text into sentences (used for jump/read-by-sentence). */
export function splitIntoSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Splits formatted answer text into paragraphs (blank-line separated). */
export function splitIntoParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}