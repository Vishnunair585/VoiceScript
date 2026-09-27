// Speech command grammar and parser for hands-free examination
import { isLikelyMathExpression } from "./mathVoice";
import { isLikelyDiagramCommand } from "./diagramVoice";

export type VoiceCommandAction =
  | { type: "NAVIGATE_NEXT" }
  | { type: "NAVIGATE_PREV" }
  | { type: "NAVIGATE_TO"; questionNumber: number }
  | { type: "TOGGLE_FLAG" }
  | { type: "TOGGLE_CHEATSHEET" }
  | { type: "TOGGLE_DIAGRAM"; show: boolean }
  | { type: "READ_QUESTION" }
  | { type: "READ_ANSWER" }
  | { type: "CHECK_TIME" }
  | { type: "GO_TO_REVIEW" }
  | { type: "SUBMIT_EXAM" }
  | { type: "DELETE_LAST_SENTENCE" }
  | { type: "DELETE_LAST_WORD" }
  | { type: "CLEAR_ANSWER" }
  | { type: "REPLACE_TEXT"; target: string; replacement: string }
  | { type: "NEW_PARAGRAPH" }
  | { type: "NEW_LINE" }
  | { type: "INSERT_HEADING"; headingText: string }
  | { type: "ADD_BULLET"; bulletText: string }
  | { type: "ADD_NUMBERED"; pointText: string }
  | { type: "INSERT_INTRO" }
  | { type: "INSERT_CONCLUSION" }
  | { type: "SELECT_OPTION"; optionKey: string }
  | { type: "MATH_MODE"; mathSpeech: string }
  | { type: "DIAGRAM_COMMAND"; diagramSpeech: string }
  | { type: "DICTATION"; rawText: string };

export interface CommandParseResult {
  isCommand: boolean;
  action: VoiceCommandAction;
  feedbackMessage: string;
}

// Convert spoken word numbers to digits
const WORD_TO_NUMBER: Record<string, number> = {
  one: 1,
  first: 1,
  two: 2,
  second: 2,
  three: 3,
  third: 3,
  four: 4,
  fourth: 4,
  five: 5,
  fifth: 5,
  six: 6,
  sixth: 6,
  seven: 7,
  seventh: 7,
  eight: 8,
  eighth: 8,
  nine: 9,
  ninth: 9,
  ten: 10,
  tenth: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

function parseSpokenNumber(str: string): number | null {
  const clean = str.trim().toLowerCase();
  if (/^\d+$/.test(clean)) {
    return parseInt(clean, 10);
  }
  if (WORD_TO_NUMBER[clean]) {
    return WORD_TO_NUMBER[clean];
  }
  return null;
}

/**
 * Parse an utterance to determine if it is a command or dictation text.
 * High-accuracy intent recognition with phonetic and conversational tolerance.
 */
export function parseVoiceCommand(spokenText: string): CommandParseResult {
  const trimmed = spokenText.trim();
  
  // Normalize: lower-case, strip punctuation and common polite conversational prefixes/suffixes
  let cleaned = trimmed
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Strip polite conversational prefixes like "please", "can you", "could you", "would you", "hey", "just"
  cleaned = cleaned
    .replace(/^(?:please|can you|could you|would you|hey|now|just|okay|ok|voice script)\s+/i, "")
    .replace(/\s+(?:please|thank you|thanks)$/i, "")
    .trim();

  // 1. Navigation Commands: Next Page / Question
  if (
    /^(?:move\s+to\s+|go\s+to\s+|go\s+|move\s+|advance\s+to\s+|turn\s+to\s+|jump\s+to\s+)?next(?:\s+(?:page|question|sheet|screen|one|item))?$/i.test(
      cleaned
    ) ||
    /^(?:forward(?:\s+(?:page|question))?|advance\s+page|next\s+page|next\s+question|move\s+next|go\s+next|next\s+one|next|move\s+ahead|turn\s+page)$/i.test(
      cleaned
    ) ||
    cleaned === "move to next page" ||
    cleaned === "move to next question" ||
    cleaned === "go to next page" ||
    cleaned === "go to next question" ||
    cleaned === "next page" ||
    cleaned === "next question" ||
    cleaned === "next" ||
    cleaned === "next one" ||
    cleaned === "move ahead"
  ) {
    return {
      isCommand: true,
      action: { type: "NAVIGATE_NEXT" },
      feedbackMessage: "Moving to next page/question",
    };
  }

  // Navigation Commands: Previous Page / Question
  if (
    /^(?:move\s+to\s+|go\s+to\s+|go\s+|move\s+|back\s+to\s+)?(?:previous|prior|last|back)(?:\s+(?:page|question|sheet|screen|one|item))?$/i.test(
      cleaned
    ) ||
    /^(?:page\s+back|back\s+page|previous\s+page|previous\s+question|prior\s+page|prior\s+question|go\s+back|move\s+back|previous\s+one|previous|back)$/i.test(
      cleaned
    ) ||
    cleaned === "move to previous page" ||
    cleaned === "move to previous question" ||
    cleaned === "go to previous page" ||
    cleaned === "go to previous question" ||
    cleaned === "previous page" ||
    cleaned === "previous question" ||
    cleaned === "go back" ||
    cleaned === "previous" ||
    cleaned === "back" ||
    cleaned === "previous one"
  ) {
    return {
      isCommand: true,
      action: { type: "NAVIGATE_PREV" },
      feedbackMessage: "Navigating to previous page/question",
    };
  }

  const goToMatch = cleaned.match(/^(?:go to|jump to|open|show|question number|question)\s+([a-z0-9]+)$/i);
  if (goToMatch) {
    const num = parseSpokenNumber(goToMatch[1]);
    if (num !== null && num > 0) {
      return {
        isCommand: true,
        action: { type: "NAVIGATE_TO", questionNumber: num },
        feedbackMessage: `Navigating to question ${num}`,
      };
    }
  }

  // 2. TTS & Question Prompt Reading: "repeat this question again", "repeat question", "read question"
  if (
    /^(?:repeat|read|say|listen(?:\s+to)?|speak)\s+(?:this\s+|the\s+|current\s+)?(?:question|prompt|item)(?:\s+(?:again|aloud|out\s+loud|once\s+more|to\s+me))?$/i.test(
      cleaned
    ) ||
    /^(?:repeat\s+this\s+question\s+again|repeat\s+question\s+again|repeat\s+the\s+question\s+again|repeat\s+this\s+question|repeat\s+question|repeat\s+the\s+question|repeat\s+again|repeat\s+that\s+again|repeat\s+that|repeat\s+it\s+again|repeat\s+it|repeat|read\s+this\s+question\s+again|read\s+question\s+again|read\s+the\s+question\s+again|read\s+this\s+question|read\s+question|read\s+the\s+question|read\s+prompt\s+again|read\s+prompt|listen\s+to\s+question|listen\s+question|say\s+question\s+again|say\s+the\s+question|say\s+again|speak\s+question|what\s+is\s+the\s+question|what\s+is\s+this\s+question)$/i.test(
      cleaned
    ) ||
    cleaned === "repeat this question again" ||
    cleaned === "repeat question again" ||
    cleaned === "repeat the question again" ||
    cleaned === "repeat this question" ||
    cleaned === "repeat question" ||
    cleaned === "repeat the question" ||
    cleaned === "repeat" ||
    cleaned === "repeat again" ||
    cleaned === "repeat that again" ||
    cleaned === "repeat that" ||
    cleaned === "repeat it" ||
    cleaned === "say again" ||
    cleaned === "read this question again" ||
    cleaned === "read question again" ||
    cleaned === "read the question again" ||
    cleaned === "read this question" ||
    cleaned === "read question" ||
    cleaned === "read prompt again" ||
    cleaned === "read prompt"
  ) {
    return {
      isCommand: true,
      action: { type: "READ_QUESTION" },
      feedbackMessage: "Repeating question prompt",
    };
  }

  if (
    /^(?:read|listen(?:\s+to)?|repeat|read\s+back)\s+(?:my\s+|the\s+)?answer(?:\s+again|\s+aloud)?$/i.test(
      cleaned
    ) ||
    cleaned === "read answer" ||
    cleaned === "read my answer" ||
    cleaned === "listen to my answer" ||
    cleaned === "read back my answer"
  ) {
    return {
      isCommand: true,
      action: { type: "READ_ANSWER" },
      feedbackMessage: "Reading your recorded answer",
    };
  }

  // 3. Flagging & Review
  if (
    /^(?:flag\s+question|unflag\s+question|flag\s+this|toggle\s+flag|mark\s+for\s+review|mark\s+question|flag)$/i.test(
      cleaned
    )
  ) {
    return {
      isCommand: true,
      action: { type: "TOGGLE_FLAG" },
      feedbackMessage: "Toggled question review flag",
    };
  }

  if (
    /^(?:go\s+to\s+review|review\s+answers|review\s+exam|open\s+review|finish\s+and\s+review|proceed\s+to\s+review)$/i.test(
      cleaned
    )
  ) {
    return {
      isCommand: true,
      action: { type: "GO_TO_REVIEW" },
      feedbackMessage: "Opening exam review summary",
    };
  }

  if (
    /^(?:submit\s+exam|confirm\s+submission|finalize\s+exam|hand\s+in\s+exam)$/i.test(
      cleaned
    )
  ) {
    return {
      isCommand: true,
      action: { type: "SUBMIT_EXAM" },
      feedbackMessage: "Prompting final exam submission",
    };
  }

  if (
    /^(?:cheat\s*sheet|voice\s+commands|show\s+commands|show\s+cheatsheet|help\s+commands|open\s+cheatsheet|view\s+commands)$/i.test(
      cleaned
    )
  ) {
    return {
      isCommand: true,
      action: { type: "TOGGLE_CHEATSHEET" },
      feedbackMessage: "Toggled voice command cheatsheet",
    };
  }

  if (
    /^(?:time\s+remaining|how\s+much\s+time\s+left|check\s+time|time\s+left|what\s+is\s+the\s+time|remaining\s+time)$/i.test(
      cleaned
    )
  ) {
    return {
      isCommand: true,
      action: { type: "CHECK_TIME" },
      feedbackMessage: "Checking remaining time",
    };
  }

  // 4. Multiple Choice Option Selection
  const optionMatch = cleaned.match(
    /^(?:select|choose|pick|option|answer\s+is|mark)\s+([a-d]|alpha|bravo|charlie|delta)$/i
  );
  if (optionMatch) {
    let key = optionMatch[1].toUpperCase();
    if (key === "ALPHA") key = "A";
    if (key === "BRAVO") key = "B";
    if (key === "CHARLIE") key = "C";
    if (key === "DELTA") key = "D";
    return {
      isCommand: true,
      action: { type: "SELECT_OPTION", optionKey: key },
      feedbackMessage: `Selected option ${key}`,
    };
  }

  // 5. Editing & Text Manipulation
  if (
    /^(?:delete\s+last\s+sentence|remove\s+last\s+sentence|erase\s+last\s+sentence)$/i.test(
      cleaned
    )
  ) {
    return {
      isCommand: true,
      action: { type: "DELETE_LAST_SENTENCE" },
      feedbackMessage: "Deleted last sentence",
    };
  }

  if (
    /^(?:scratch\s+that|delete\s+last\s+word|undo|remove\s+last\s+word|erase\s+last\s+word)$/i.test(
      cleaned
    )
  ) {
    return {
      isCommand: true,
      action: { type: "DELETE_LAST_WORD" },
      feedbackMessage: "Removed last word / undo",
    };
  }

  if (
    /^(?:clear\s+answer|delete\s+all|erase\s+answer|reset\s+answer|clear\s+text|erase\s+all)$/i.test(
      cleaned
    )
  ) {
    return {
      isCommand: true,
      action: { type: "CLEAR_ANSWER" },
      feedbackMessage: "Cleared answer buffer",
    };
  }

  const replaceMatch = cleaned.match(/^replace\s+(.+?)\s+with\s+(.+)$/i);
  if (replaceMatch) {
    return {
      isCommand: true,
      action: {
        type: "REPLACE_TEXT",
        target: replaceMatch[1].trim(),
        replacement: replaceMatch[2].trim(),
      },
      feedbackMessage: `Replaced "${replaceMatch[1]}" with "${replaceMatch[2]}"`,
    };
  }

  if (/^(?:new\s+paragraph|start\s+new\s+paragraph|next\s+paragraph)$/i.test(cleaned)) {
    return {
      isCommand: true,
      action: { type: "NEW_PARAGRAPH" },
      feedbackMessage: "Started new paragraph",
    };
  }

  if (/^(?:new\s+line|next\s+line|line\s+break)$/i.test(cleaned)) {
    return {
      isCommand: true,
      action: { type: "NEW_LINE" },
      feedbackMessage: "Added line break",
    };
  }

  // 6. Essay & Long-Answer Structuring
  const headingMatch = trimmed.match(/^(?:insert heading|add heading|heading)\s+(.+)$/i);
  if (headingMatch) {
    return {
      isCommand: true,
      action: { type: "INSERT_HEADING", headingText: headingMatch[1].trim() },
      feedbackMessage: `Inserted heading: "${headingMatch[1].trim()}"`,
    };
  }

  const bulletMatch = trimmed.match(/^(?:add bullet point|bullet point|insert bullet|add bullet|bullet)\s+(.+)$/i);
  if (bulletMatch) {
    return {
      isCommand: true,
      action: { type: "ADD_BULLET", bulletText: bulletMatch[1].trim() },
      feedbackMessage: `Added bullet point`,
    };
  }

  const numberedMatch = trimmed.match(/^(?:add numbered point|numbered point|step)\s+(.+)$/i);
  if (numberedMatch) {
    return {
      isCommand: true,
      action: { type: "ADD_NUMBERED", pointText: numberedMatch[1].trim() },
      feedbackMessage: `Added numbered item`,
    };
  }

  if (/^(insert introduction|start introduction|section introduction|introduction)$/i.test(cleaned)) {
    return {
      isCommand: true,
      action: { type: "INSERT_INTRO" },
      feedbackMessage: "Inserted Introduction header",
    };
  }

  if (/^(insert conclusion|in conclusion|section conclusion|conclusion)$/i.test(cleaned)) {
    return {
      isCommand: true,
      action: { type: "INSERT_CONCLUSION" },
      feedbackMessage: "Inserted Conclusion header",
    };
  }

  // 7. Diagram Canvas Open / Close / Toggle commands
  if (
    /^(?:show\s+diagram|open\s+diagram|view\s+diagram|open\s+canvas|show\s+canvas|toggle\s+diagram|canvas\s+mode|diagram\s+mode)$/i.test(cleaned)
  ) {
    return {
      isCommand: true,
      action: { type: "TOGGLE_DIAGRAM", show: true },
      feedbackMessage: "Opened diagram drawing canvas",
    };
  }
  if (
    /^(?:hide\s+diagram|close\s+diagram|close\s+canvas|hide\s+canvas)$/i.test(cleaned)
  ) {
    return {
      isCommand: true,
      action: { type: "TOGGLE_DIAGRAM", show: false },
      feedbackMessage: "Closed diagram canvas",
    };
  }

  // 8. Math & Diagram Mode triggers
  // A. Explicit or implicit Diagram commands
  if (isLikelyDiagramCommand(trimmed) || isLikelyDiagramCommand(cleaned)) {
    return {
      isCommand: true,
      action: { type: "DIAGRAM_COMMAND", diagramSpeech: trimmed },
      feedbackMessage: `Executing diagram command: "${trimmed}"`,
    };
  }
  const diagramMatch = trimmed.match(/^(?:draw|diagram|sketch|shape|plot)\s+(.+)$/i);
  if (diagramMatch) {
    return {
      isCommand: true,
      action: { type: "DIAGRAM_COMMAND", diagramSpeech: trimmed },
      feedbackMessage: `Drawing diagram shape`,
    };
  }

  // B. Math Mode Triggers
  // Standalone mode trigger without immediate expression
  if (/^(?:math\s+mode|equation\s+mode|formula\s+mode)$/i.test(cleaned)) {
    return {
      isCommand: true,
      action: { type: "MATH_MODE", mathSpeech: "" },
      feedbackMessage: "Math equation mode ready. Dictate formula e.g. 'x squared plus y squared equals r squared'",
    };
  }

  // Explicit Math expressions with mode prefixes
  const mathMatch = trimmed.match(
    /^(?:math\s+mode|equation\s+mode|formula\s+mode|insert\s+equation|insert\s+math|insert\s+formula|equation|formula)\s*(?::\s*)?(.+)$/i
  );
  if (mathMatch) {
    return {
      isCommand: true,
      action: { type: "MATH_MODE", mathSpeech: mathMatch[1].trim() },
      feedbackMessage: "Formatted mathematical formula",
    };
  }

  // Natural spoken math expressions without explicit "math mode" keyword
  if (isLikelyMathExpression(trimmed) || isLikelyMathExpression(cleaned)) {
    const cleanMath = trimmed
      .replace(/^(?:math\s+mode|equation\s+mode|formula\s+mode|insert\s+equation|insert\s+math|insert\s+formula|equation|formula)\s*(?::\s*)?/i, "")
      .trim();
    return {
      isCommand: true,
      action: { type: "MATH_MODE", mathSpeech: cleanMath || trimmed },
      feedbackMessage: "Formatted mathematical formula",
    };
  }

  // Default: Pure dictation
  return {
    isCommand: false,
    action: { type: "DICTATION", rawText: trimmed },
    feedbackMessage: "",
  };
}

/**
 * Apply text editing actions onto the current answer text string.
 */
export function applyEditingAction(currentText: string, action: VoiceCommandAction): string {
  switch (action.type) {
    case "DELETE_LAST_WORD": {
      const trimmed = currentText.trimEnd();
      const lastSpaceIndex = trimmed.lastIndexOf(" ");
      if (lastSpaceIndex === -1) return "";
      return trimmed.slice(0, lastSpaceIndex);
    }

    case "DELETE_LAST_SENTENCE": {
      const trimmed = currentText.trimEnd();
      // Match sentence endings like . ! ? \n
      const matches = [...trimmed.matchAll(/[.!?\n]+/g)];
      if (matches.length <= 1) return "";
      const lastPunctuation = matches[matches.length - 2];
      const endPos = (lastPunctuation.index ?? 0) + lastPunctuation[0].length;
      return trimmed.slice(0, endPos).trim();
    }

    case "CLEAR_ANSWER":
      return "";

    case "REPLACE_TEXT": {
      if (!action.target) return currentText;
      const regex = new RegExp(escapeRegex(action.target), "gi");
      return currentText.replace(regex, action.replacement);
    }

    case "NEW_PARAGRAPH": {
      if (!currentText.trim()) return "";
      return currentText.trimEnd() + "\n\n";
    }

    case "NEW_LINE": {
      if (!currentText.trim()) return "";
      return currentText.trimEnd() + "\n";
    }

    case "INSERT_HEADING": {
      const heading = `\n\n### ${action.headingText}\n`;
      return (currentText ? currentText.trimEnd() + heading : `### ${action.headingText}\n`);
    }

    case "ADD_BULLET": {
      const bullet = `\n- ${action.bulletText}`;
      return currentText ? currentText.trimEnd() + bullet : `- ${action.bulletText}`;
    }

    case "ADD_NUMBERED": {
      const count = (currentText.match(/^\d+\.\s/gm) || []).length + 1;
      const item = `\n${count}. ${action.pointText}`;
      return currentText ? currentText.trimEnd() + item : `${count}. ${action.pointText}`;
    }

    case "INSERT_INTRO": {
      const header = `\n\n### 1. Introduction\n`;
      return currentText ? currentText.trimEnd() + header : `### 1. Introduction\n`;
    }

    case "INSERT_CONCLUSION": {
      const header = `\n\n### Conclusion\nIn conclusion, `;
      return currentText ? currentText.trimEnd() + header : `### Conclusion\nIn conclusion, `;
    }

    case "DICTATION": {
      if (!action.rawText) return currentText;
      const needsSpace = currentText.length > 0 && !/[\s\n]$/.test(currentText);
      return currentText + (needsSpace ? " " : "") + action.rawText;
    }

    default:
      return currentText;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
