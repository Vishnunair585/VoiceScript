import React, { useState } from "react";
import {
  Mic,
  Navigation,
  Edit3,
  Calculator,
  Layers,
  Compass,
} from "lucide-react";
import { KaTeXText } from "./KaTeXText";

export interface VoiceCommandItem {
  phrase: string;
  alternatives?: string[];
  action: string;
  category: "navigation" | "editing" | "structuring" | "math" | "tools";
  exampleSpeech: string;
  shortcut?: string;
  latexExample?: string;
}

export interface MathFormulaExample {
  title: string;
  spokenPhrase: string;
  latex: string;
  category: "algebra" | "calculus" | "symbols" | "chemistry" | "physics";
}

export interface DiagramCommandExample {
  title: string;
  spokenPhrase: string;
  description: string;
  exampleSpeech: string;
  category: "templates" | "shapes" | "vectors" | "controls";
}

const MATH_FORMULA_SHEET: MathFormulaExample[] = [
  {
    title: "Fractions & Quotients",
    spokenPhrase: '"fraction a over b" or "fraction 1 over 2"',
    latex: "\\frac{a}{b} \\quad \\text{or} \\quad \\frac{1}{2}",
    category: "algebra",
  },
  {
    title: "Powers & Exponents",
    spokenPhrase: '"x squared", "y cubed", "10 to the power minus 3"',
    latex: "x^2, \\quad y^3, \\quad 10^{-3}",
    category: "algebra",
  },
  {
    title: "Square Roots & Radicals",
    spokenPhrase: '"square root of x" or "cube root of 27"',
    latex: "\\sqrt{x} \\quad \\text{or} \\quad \\sqrt[3]{27}",
    category: "algebra",
  },
  {
    title: "Quadratic Equations",
    spokenPhrase: '"x squared plus 2x plus 1 equals 0"',
    latex: "x^2 + 2x + 1 = 0",
    category: "algebra",
  },
  {
    title: "Calculus Integrals",
    spokenPhrase: '"integral of x dx" or "integral from 0 to 1 of x squared dx"',
    latex: "\\int x\\,dx \\quad \\text{or} \\quad \\int_{0}^{1} x^2\\,dx",
    category: "calculus",
  },
  {
    title: "Limits & Approximations",
    spokenPhrase: '"limit as x approaches 0 of sine x over x"',
    latex: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1",
    category: "calculus",
  },
  {
    title: "Summations (Sigma)",
    spokenPhrase: '"sum from i equals 1 to n of i squared"',
    latex: "\\sum_{i=1}^{n} i^2",
    category: "calculus",
  },
  {
    title: "Greek Mathematical Symbols",
    spokenPhrase: '"alpha, beta, gamma, theta, pi, lambda, omega, delta"',
    latex: "\\alpha, \\; \\beta, \\; \\gamma, \\; \\theta, \\; \\pi, \\; \\lambda, \\; \\Omega, \\; \\Delta",
    category: "symbols",
  },
  {
    title: "Inequalities & Logic",
    spokenPhrase: '"plus minus", "not equal to", "greater than or equal to", "infinity"',
    latex: "\\pm, \\; \\neq, \\; \\ge, \\; \\le, \\; \\infty, \\; \\approx",
    category: "symbols",
  },
  {
    title: "Chemical Compounds",
    spokenPhrase: '"H2O", "CO2", "H2SO4", "NaCl", "C6H12O6"',
    latex: "\\text{H}_2\\text{O}, \\; \\text{CO}_2, \\; \\text{H}_2\\text{SO}_4, \\; \\text{NaCl}",
    category: "chemistry",
  },
  {
    title: "Chemical Reaction Equations",
    spokenPhrase: '"2 H2 plus O2 gives 2 H2O"',
    latex: "2\\text{H}_2 + \\text{O}_2 \\longrightarrow 2\\text{H}_2\\text{O}",
    category: "chemistry",
  },
  {
    title: "Physics Formulas & Units",
    spokenPhrase: '"E equals m c squared" or "meters per second squared"',
    latex: "E = mc^2 \\quad \\text{or} \\quad \\text{m/s}^2, \\; \\text{kg}, \\; \\text{N}, \\; \\text{J}, \\; \\Omega",
    category: "physics",
  },
];

const DIAGRAM_COMMAND_SHEET: DiagramCommandExample[] = [
  {
    title: "Cartesian Coordinate Axes",
    spokenPhrase: '"draw coordinate axes" or "draw axes"',
    description: "Draws perpendicular Cartesian X and Y coordinate axes with directional arrows and labels",
    exampleSpeech: "draw coordinate axes",
    category: "templates",
  },
  {
    title: "Free-Body Diagram (Block & Forces)",
    spokenPhrase: '"draw free body diagram"',
    description: "Generates block subjected to applied force, friction, normal force, and gravity vectors",
    exampleSpeech: "draw free body diagram",
    category: "templates",
  },
  {
    title: "Binary Tree Structure",
    spokenPhrase: '"draw binary tree"',
    description: "Generates tree with Root node and child nodes Left (L) and Right (R) with connecting branches",
    exampleSpeech: "draw binary tree",
    category: "templates",
  },
  {
    title: "Circle / Disc",
    spokenPhrase: '"draw circle radius 60 at center" or "circle labeled Root"',
    description: "Draws a circle with customizable radius, center position, and optional label",
    exampleSpeech: "draw circle radius 60 at center",
    category: "shapes",
  },
  {
    title: "Rectangle / Box",
    spokenPhrase: '"draw rectangle width 120 height 80"',
    description: "Draws rectangular shape with specified width and height",
    exampleSpeech: "draw rectangle width 120 height 80",
    category: "shapes",
  },
  {
    title: "Square",
    spokenPhrase: '"draw square size 100"',
    description: "Draws equilateral square shape",
    exampleSpeech: "draw square size 100",
    category: "shapes",
  },
  {
    title: "Triangle",
    spokenPhrase: '"draw triangle"',
    description: "Draws geometric triangle at center",
    exampleSpeech: "draw triangle",
    category: "shapes",
  },
  {
    title: "Directed Vector (Horizontal)",
    spokenPhrase: '"draw arrow from left to right" or "arrow right"',
    description: "Draws directed arrow vector pointing rightward",
    exampleSpeech: "draw arrow from left to right",
    category: "vectors",
  },
  {
    title: "Directed Vector (Vertical)",
    spokenPhrase: '"draw arrow pointing down" or "draw arrow pointing up"',
    description: "Draws vertical directed arrow vector",
    exampleSpeech: "draw arrow pointing down",
    category: "vectors",
  },
  {
    title: "Straight Line / Divider",
    spokenPhrase: '"draw line" or "draw vertical line"',
    description: "Draws straight line divider",
    exampleSpeech: "draw line",
    category: "shapes",
  },
  {
    title: "Text Label Annotation",
    spokenPhrase: '"label diagram Applied Force"',
    description: "Places text annotation or label on the diagram canvas",
    exampleSpeech: "label diagram Applied Force",
    category: "controls",
  },
  {
    title: "Undo Last Shape",
    spokenPhrase: '"undo shape" or "undo diagram"',
    description: "Removes the last shape from the canvas",
    exampleSpeech: "undo shape",
    category: "controls",
  },
  {
    title: "Clear Canvas",
    spokenPhrase: '"clear canvas" or "clear diagram"',
    description: "Clears all shapes and resets diagram canvas",
    exampleSpeech: "clear canvas",
    category: "controls",
  },
];

const SCRIBING_COMMANDS: VoiceCommandItem[] = [
  {
    phrase: "previous page",
    alternatives: ["back page", "go to previous page", "prior page", "previous sheet"],
    action: "Access previous page in the multi-page exam sheet",
    category: "navigation",
    exampleSpeech: "previous page",
    shortcut: "PageUp / Alt+[",
  },
  {
    phrase: "next page",
    alternatives: ["go to next page", "next sheet", "forward page"],
    action: "Advance to the next page in the exam sheet",
    category: "navigation",
    exampleSpeech: "next page",
    shortcut: "PageDown / Alt+]",
  },
  {
    phrase: "new page",
    alternatives: ["add page", "add sheet", "create page"],
    action: "Append a fresh blank sheet page to the document",
    category: "navigation",
    exampleSpeech: "add page",
  },
  {
    phrase: "back to setup",
    alternatives: ["go back", "navigate to previous page"],
    action: "Return to the previous screen or setup page",
    category: "navigation",
    exampleSpeech: "go back",
    shortcut: "Alt+←",
  },
  {
    phrase: "scratch that",
    alternatives: ["undo", "delete last word"],
    action: "Erase the most recently spoken word or phrase",
    category: "editing",
    exampleSpeech: "scratch that",
  },
  {
    phrase: "delete last sentence",
    alternatives: ["remove last sentence", "erase sentence"],
    action: "Delete the entire preceding sentence",
    category: "editing",
    exampleSpeech: "delete last sentence",
  },
  {
    phrase: "clear text",
    alternatives: ["clear transcript", "erase text"],
    action: "Clear all spoken transcript on the active page",
    category: "editing",
    exampleSpeech: "clear text",
  },
  {
    phrase: "new paragraph",
    alternatives: ["next paragraph"],
    action: "Insert a double line break into spoken answer",
    category: "editing",
    exampleSpeech: "new paragraph",
  },
  {
    phrase: "new line",
    alternatives: ["next line", "line break"],
    action: "Insert a single line break in transcript",
    category: "editing",
    exampleSpeech: "new line",
  },
  {
    phrase: "format answer",
    alternatives: ["format text", "clean up", "structure answer"],
    action: "Trigger AI Academic Formatting with KaTeX & LaTeX formulas",
    category: "tools",
    exampleSpeech: "format answer",
  },
  {
    phrase: "download pdf",
    alternatives: ["export pdf", "save document", "download file"],
    action: "Generate and download multi-page examination sheet PDF",
    category: "tools",
    exampleSpeech: "download pdf",
  },
  {
    phrase: "stop listening",
    alternatives: ["stop microphone", "stop scribe"],
    action: "Pause speech recognition and microphone",
    category: "tools",
    exampleSpeech: "stop listening",
    shortcut: "Alt+M",
  },
];

const ANSWERING_COMMANDS: VoiceCommandItem[] = [
  {
    phrase: "move to next page",
    alternatives: ["next page", "next question", "move to next question", "go to next page"],
    action: "Advance immediately to the next examination question / page",
    category: "navigation",
    exampleSpeech: "move to next page",
    shortcut: "Alt+N",
  },
  {
    phrase: "previous page",
    alternatives: ["move to previous page", "previous question", "go to previous page"],
    action: "Navigate back to previous examination question / page",
    category: "navigation",
    exampleSpeech: "previous page",
    shortcut: "Alt+P",
  },
  {
    phrase: "repeat this question again",
    alternatives: ["repeat question", "read question", "read prompt"],
    action: "Text-to-Speech immediately re-reads question prompt aloud",
    category: "tools",
    exampleSpeech: "repeat this question again",
  },
  {
    phrase: "read answer",
    alternatives: ["read back my answer", "listen to answer"],
    action: "Speaks your currently recorded answer response aloud",
    category: "tools",
    exampleSpeech: "read answer",
  },
  {
    phrase: "go to question [number]",
    alternatives: ["question 2", "jump to question 3"],
    action: "Jump directly to specified question number",
    category: "navigation",
    exampleSpeech: "go to question 2",
  },
  {
    phrase: "check time",
    alternatives: ["time remaining", "how much time left"],
    action: "Speaks remaining exam duration aloud via Text-to-Speech",
    category: "navigation",
    exampleSpeech: "check time",
  },
  {
    phrase: "scratch that",
    alternatives: ["undo", "delete last word"],
    action: "Removes the last spoken word or phrase",
    category: "editing",
    exampleSpeech: "scratch that",
  },
  {
    phrase: "delete last sentence",
    alternatives: ["erase sentence"],
    action: "Deletes the most recently dictated sentence",
    category: "editing",
    exampleSpeech: "delete last sentence",
  },
  {
    phrase: "clear answer",
    alternatives: ["clear text", "reset answer"],
    action: "Clears all text in the answer buffer for this question",
    category: "editing",
    exampleSpeech: "clear answer",
  },
  {
    phrase: "draw coordinate axes",
    alternatives: ["draw axes", "coordinate axes", "cartesian plane"],
    action: "Draws Cartesian X and Y coordinate axes on the diagram canvas",
    category: "tools",
    exampleSpeech: "draw coordinate axes",
  },
  {
    phrase: "draw circle radius 60 at center",
    alternatives: ["draw circle", "circle at center", "circle radius 50"],
    action: "Draws circle shape on diagram canvas with customizable radius",
    category: "tools",
    exampleSpeech: "draw circle radius 60 at center",
  },
  {
    phrase: "draw free body diagram",
    alternatives: ["free body diagram", "block with forces"],
    action: "Draws a physics block with applied, friction, normal, and gravity force vectors",
    category: "tools",
    exampleSpeech: "draw free body diagram",
  },
  {
    phrase: "draw binary tree",
    alternatives: ["binary tree", "tree diagram"],
    action: "Draws a binary tree structure with Root, Left (L), and Right (R) child nodes",
    category: "tools",
    exampleSpeech: "draw binary tree",
  },
  {
    phrase: "clear canvas",
    alternatives: ["clear diagram", "reset diagram"],
    action: "Erases all shapes from the diagram canvas",
    category: "editing",
    exampleSpeech: "clear canvas",
  },
  {
    phrase: "select option [A-D]",
    alternatives: ["option A", "choose option B", "pick option C"],
    action: "Selects multiple choice answer option hands-free",
    category: "tools",
    exampleSpeech: "select option B",
  },
  {
    phrase: "flag question",
    alternatives: ["mark for review", "toggle flag"],
    action: "Marks question for later review before submission",
    category: "tools",
    exampleSpeech: "flag question",
    shortcut: "Alt+F",
  },
  {
    phrase: "review exam",
    alternatives: ["go to review", "review answers"],
    action: "Open exam review summary and submission status",
    category: "navigation",
    exampleSpeech: "review exam",
  },
];

export { MATH_FORMULA_SHEET, DIAGRAM_COMMAND_SHEET, SCRIBING_COMMANDS, ANSWERING_COMMANDS };

interface VoiceCommandCheatsheetProps {
  mode: "scribing" | "answering";
  onSelectCommand?: (command: VoiceCommandItem) => void;
  className?: string;
  defaultExpanded?: boolean;
  variant?: "default" | "side-panel";
  highContrast?: boolean;
  defaultTab?: "commands" | "math" | "signs" | "science" | "diagrams";
  allowedTabs?: ("commands" | "math" | "signs" | "science" | "diagrams")[];
  title?: string;
  hideNavigationCommands?: boolean;
}

export function VoiceCommandCheatsheet({
  mode,
  onSelectCommand,
  className = "",
  variant = "default",
  highContrast = false,
  defaultTab = "commands",
  allowedTabs,
  title,
  hideNavigationCommands = false,
}: VoiceCommandCheatsheetProps) {
  const [spokenFeedback, setSpokenFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"commands" | "math" | "signs" | "science" | "diagrams">(
    defaultTab || (allowedTabs && allowedTabs.length > 0 ? allowedTabs[0] : "commands")
  );
  const [searchTerm, setSearchTerm] = useState("");

  const rawCommands = mode === "scribing" ? SCRIBING_COMMANDS : ANSWERING_COMMANDS;
  const commands = hideNavigationCommands
    ? rawCommands.filter((c) => c.category !== "navigation")
    : rawCommands;

  // Text-to-speech demonstration helper (allows clicking or hearing correct pronunciation)
  const handleDemonstrateSpeech = (phrase: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
      setSpokenFeedback(`Pronouncing: "${phrase}"`);
      setTimeout(() => setSpokenFeedback(null), 3000);
    }
  };

  // Filtered lists for side-panel mode
  const filteredCommands = commands.filter(
    (c) =>
      c.phrase.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.shortcut && c.shortcut.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const mathFormulas = MATH_FORMULA_SHEET.filter(
    (f) => f.category === "algebra" || f.category === "calculus"
  ).filter(
    (f) =>
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.spokenPhrase.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const signsFormulas = MATH_FORMULA_SHEET.filter(
    (f) => f.category === "symbols"
  ).filter(
    (f) =>
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.spokenPhrase.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scienceFormulas = MATH_FORMULA_SHEET.filter(
    (f) => f.category === "chemistry" || f.category === "physics"
  ).filter(
    (f) =>
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.spokenPhrase.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const diagramCommands = DIAGRAM_COMMAND_SHEET.filter(
    (d) =>
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.spokenPhrase.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const visibleTabs: ("commands" | "math" | "signs" | "science" | "diagrams")[] =
    allowedTabs || ["commands", "math", "signs", "science", "diagrams"];

  if (variant === "side-panel") {
    return (
      <div
        className={`h-full flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
          highContrast
            ? "bg-black border-2 border-yellow-400 text-yellow-300"
            : "bg-white dark:bg-[#1a2332] border-stone-200 dark:border-stone-800"
        } ${className}`}
        aria-label="Voice Commands & Mathematical Reference Side Panel"
      >
        {/* Header */}
        <div
          className={`p-3.5 border-b shrink-0 flex items-center justify-between gap-2 ${
            highContrast ? "border-yellow-500 bg-yellow-950/30" : "border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/60"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                highContrast ? "bg-yellow-400 text-black font-black" : "bg-blue-600 text-white shadow-xs"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-black uppercase tracking-wider ${highContrast ? "text-yellow-300" : "text-stone-900 dark:text-stone-100"}`}>
                  {title || "Operations & Voice Cheatsheet"}
                </span>
              </div>
              <p className={`text-[10px] ${highContrast ? "text-yellow-400/80" : "text-stone-500 dark:text-stone-400"}`}>
                Always visible • Speak or tap to apply
              </p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
              highContrast
                ? "bg-yellow-400 text-black font-black"
                : "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
            }`}
          >
            Hands-Free
          </span>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className={`p-2.5 border-b shrink-0 space-y-2 ${highContrast ? "border-yellow-500" : "border-stone-200 dark:border-stone-800"}`}>
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 text-[11px] font-bold overflow-x-auto">
            {visibleTabs.map((tab) => {
              const label =
                tab === "commands"
                  ? "Commands"
                  : tab === "math"
                  ? "Maths"
                  : tab === "signs"
                  ? "Signs"
                  : tab === "science"
                  ? "Science"
                  : "Diagrams";
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer truncate text-center font-bold ${
                    isActive
                      ? highContrast
                        ? "bg-yellow-400 text-black font-black shadow-xs"
                        : "bg-white dark:bg-stone-900 text-blue-700 dark:text-blue-300 shadow-xs"
                      : highContrast
                      ? "text-yellow-400 hover:text-white"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <input
            type="text"
            placeholder="Search commands, signs & formulas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none transition-all ${
              highContrast
                ? "bg-black border-yellow-400 text-yellow-300 placeholder-yellow-600 focus:ring-1 focus:ring-yellow-400"
                : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:ring-1 focus:ring-blue-500"
            }`}
          />
        </div>

        {/* Spoken Feedback Notification */}
        {spokenFeedback && (
          <div
            className={`px-3 py-1.5 text-xs font-semibold shrink-0 flex items-center justify-between border-b ${
              highContrast
                ? "bg-yellow-950/80 border-yellow-400 text-yellow-300"
                : "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300"
            }`}
          >
            <span>{spokenFeedback}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0">
          {activeTab === "commands" && (
            <div className="space-y-1.5">
              {filteredCommands.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-4">No matching commands found</p>
              ) : (
                filteredCommands.map((cmd, idx) => (
                  <div
                    key={`side-cmd-${cmd.phrase}-${idx}`}
                    onClick={() => {
                      handleDemonstrateSpeech(cmd.exampleSpeech || cmd.phrase);
                      if (onSelectCommand) onSelectCommand(cmd);
                    }}
                    className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 group ${
                      highContrast
                        ? "border-yellow-500/70 bg-black hover:bg-yellow-950/50 hover:border-yellow-400"
                        : "border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                    title={`Click or speak: "${cmd.phrase}". Action: ${cmd.action}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`font-mono font-bold text-xs flex items-center gap-1 ${
                          highContrast ? "text-yellow-300 group-hover:underline" : "text-blue-700 dark:text-blue-300 group-hover:underline"
                        }`}
                      >
                        <Mic className="w-2.5 h-2.5 shrink-0 opacity-70" />
                        "{cmd.phrase}"
                      </span>
                      {cmd.shortcut && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            highContrast
                              ? "bg-yellow-950 text-yellow-300 border border-yellow-500"
                              : "bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                          }`}
                        >
                          {cmd.shortcut}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] leading-tight ${highContrast ? "text-yellow-200/90" : "text-stone-600 dark:text-stone-400"}`}>
                      {cmd.action}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "math" && (
            <div className="space-y-2">
              {mathFormulas.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-4">No matching formulas found</p>
              ) : (
                mathFormulas.map((f, idx) => {
                  const firstPhrase = f.spokenPhrase.split('"')[1] || f.spokenPhrase.replace(/"/g, "").split(" or ")[0].trim();
                  return (
                    <div
                      key={`side-math-${f.title}-${idx}`}
                      onClick={() => {
                        handleDemonstrateSpeech(firstPhrase);
                        if (onSelectCommand) {
                          onSelectCommand({
                            phrase: firstPhrase,
                            action: `Insert formula: ${f.title}`,
                            category: "math",
                            exampleSpeech: firstPhrase,
                            latexExample: f.latex,
                          });
                        }
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                        highContrast
                          ? "border-yellow-500/70 bg-black hover:border-yellow-400"
                          : "border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 hover:border-blue-300 dark:hover:border-blue-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${highContrast ? "text-yellow-400" : "text-stone-500 dark:text-stone-400"}`}>
                          {f.title}
                        </span>
                        <span className="text-[10px] text-blue-500 font-medium">Speak or tap to insert</span>
                      </div>
                      <p className={`text-xs font-mono font-medium ${highContrast ? "text-yellow-300" : "text-blue-700 dark:text-blue-300"}`}>
                        Speak: {f.spokenPhrase}
                      </p>
                      <div
                        className={`p-1.5 rounded-lg border text-center text-xs overflow-x-auto ${
                          highContrast
                            ? "bg-yellow-950/40 border-yellow-500/50 text-yellow-300"
                            : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100"
                        }`}
                      >
                        <KaTeXText text={`$${f.latex}$`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "signs" && (
            <div className="space-y-2">
              {signsFormulas.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-4">No matching signs or symbols found</p>
              ) : (
                signsFormulas.map((f, idx) => {
                  const firstPhrase = f.spokenPhrase.split('"')[1] || f.spokenPhrase.replace(/"/g, "").split(" or ")[0].trim();
                  return (
                    <div
                      key={`side-sign-${f.title}-${idx}`}
                      onClick={() => {
                        handleDemonstrateSpeech(firstPhrase);
                        if (onSelectCommand) {
                          onSelectCommand({
                            phrase: firstPhrase,
                            action: `Insert symbol: ${f.title}`,
                            category: "math",
                            exampleSpeech: firstPhrase,
                            latexExample: f.latex,
                          });
                        }
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                        highContrast
                          ? "border-yellow-500/70 bg-black hover:border-yellow-400"
                          : "border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 hover:border-blue-300 dark:hover:border-blue-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${highContrast ? "text-yellow-400" : "text-stone-500 dark:text-stone-400"}`}>
                          {f.title}
                        </span>
                        <span className="text-[10px] text-blue-500 font-medium">Speak or tap to insert</span>
                      </div>
                      <p className={`text-xs font-mono font-medium ${highContrast ? "text-yellow-300" : "text-blue-700 dark:text-blue-300"}`}>
                        Speak: {f.spokenPhrase}
                      </p>
                      <div
                        className={`p-1.5 rounded-lg border text-center text-xs overflow-x-auto ${
                          highContrast
                            ? "bg-yellow-950/40 border-yellow-500/50 text-yellow-300"
                            : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100"
                        }`}
                      >
                        <KaTeXText text={`$${f.latex}$`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "science" && (
            <div className="space-y-2">
              {scienceFormulas.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-4">No matching science items</p>
              ) : (
                scienceFormulas.map((f, idx) => {
                  const firstPhrase = f.spokenPhrase.split('"')[1] || f.spokenPhrase.replace(/"/g, "").split(" or ")[0].trim();
                  return (
                    <div
                      key={`side-sci-${f.title}-${idx}`}
                      onClick={() => {
                        handleDemonstrateSpeech(firstPhrase);
                        if (onSelectCommand) {
                          onSelectCommand({
                            phrase: firstPhrase,
                            action: `Insert formula: ${f.title}`,
                            category: "math",
                            exampleSpeech: firstPhrase,
                            latexExample: f.latex,
                          });
                        }
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                        highContrast
                          ? "border-yellow-500/70 bg-black hover:border-yellow-400"
                          : "border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 hover:border-blue-300 dark:hover:border-blue-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${highContrast ? "text-yellow-400" : "text-stone-500 dark:text-stone-400"}`}>
                          {f.title}
                        </span>
                        <span className="text-[10px] text-blue-500 font-medium">Speak or tap to insert</span>
                      </div>
                      <p className={`text-xs font-mono font-medium ${highContrast ? "text-yellow-300" : "text-blue-700 dark:text-blue-300"}`}>
                        Speak: {f.spokenPhrase}
                      </p>
                      <div
                        className={`p-1.5 rounded-lg border text-center text-xs overflow-x-auto ${
                          highContrast
                            ? "bg-yellow-950/40 border-yellow-500/50 text-yellow-300"
                            : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100"
                        }`}
                      >
                        <KaTeXText text={`$${f.latex}$`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "diagrams" && (
            <div className="space-y-2">
              {diagramCommands.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-4">No matching diagram commands</p>
              ) : (
                diagramCommands.map((d, idx) => (
                  <div
                    key={`side-diag-${d.title}-${idx}`}
                    onClick={() => {
                      handleDemonstrateSpeech(d.exampleSpeech);
                      if (onSelectCommand) {
                        onSelectCommand({
                          phrase: d.exampleSpeech,
                          action: d.description,
                          category: "tools",
                          exampleSpeech: d.exampleSpeech,
                        });
                      }
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 group ${
                      highContrast
                        ? "border-yellow-500/70 bg-black hover:border-yellow-400"
                        : "border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${highContrast ? "text-yellow-400" : "text-purple-600 dark:text-purple-400"}`}>
                        <Compass className="w-3 h-3" />
                        {d.title}
                      </span>
                      <span className="text-[10px] text-purple-500 font-medium">Tap to draw</span>
                    </div>
                    <p className={`text-xs font-mono font-medium ${highContrast ? "text-yellow-300" : "text-purple-700 dark:text-purple-300 group-hover:underline"}`}>
                      Speak: {d.spokenPhrase}
                    </p>
                    <p className={`text-[11px] leading-tight ${highContrast ? "text-yellow-200/80" : "text-stone-600 dark:text-stone-400"}`}>
                      {d.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 bg-white dark:bg-[#1a2332] border-stone-200 dark:border-stone-700 shadow-sm flex flex-col gap-4 p-4 sm:p-5 ${className}`}
      aria-label="Voice Commands & Mathematical Formula Sheet"
    >
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-stone-900 dark:text-stone-100">
                Voice Commands & Academic Cheatsheet
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Always Visible • Hands-Free
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Speak any phrase below clearly into your microphone, or tap any command to execute it directly.
            </p>
          </div>
        </div>

        {spokenFeedback && (
          <div className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-900 shrink-0">
            {spokenFeedback}
          </div>
        )}
      </div>

      {/* SECTION 1: VOICE CONTROL COMMANDS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            1. Spoken Control & Navigation Commands
          </span>
          <span className="text-[11px] font-medium text-stone-500">
            {commands.length} Commands Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {commands.map((cmd, idx) => (
            <div
              key={`modal-cmd-${cmd.phrase}-${idx}`}
              onClick={() => {
                handleDemonstrateSpeech(cmd.exampleSpeech || cmd.phrase);
                if (onSelectCommand) onSelectCommand(cmd);
              }}
              className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/50 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer flex flex-col justify-between gap-1 group"
              title={`Click or speak: "${cmd.phrase}". Action: ${cmd.action}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-300 group-hover:underline">
                  "{cmd.phrase}"
                </span>
                {cmd.shortcut && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                    {cmd.shortcut}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-1">
                {cmd.action}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: MATHEMATICAL & SCIENTIFIC FORMULA SHEET */}
      <div className="space-y-2.5 pt-3 border-t border-stone-200 dark:border-stone-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            2. Spoken Formula & Symbol Reference Sheet (KaTeX & LaTeX)
          </span>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
            Auto-Converted
          </span>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-400">
          Speak equations, powers, roots, or scientific terms normally. Our Academic Scribe engine renders them with standard academic notation:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {MATH_FORMULA_SHEET.map((f, idx) => {
            const firstPhrase = f.spokenPhrase.split('"')[1] || f.spokenPhrase.replace(/"/g, "").split(" or ")[0].trim();
            return (
              <div
                key={`modal-math-${f.title}-${idx}`}
                onClick={() => {
                  handleDemonstrateSpeech(firstPhrase);
                  if (onSelectCommand) {
                    onSelectCommand({
                      phrase: firstPhrase,
                      action: `Insert formula: ${f.title}`,
                      category: "math",
                      exampleSpeech: firstPhrase,
                      latexExample: f.latex,
                    });
                  }
                }}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/40 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/20 transition-all cursor-pointer flex flex-col justify-between gap-2 group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      {f.title}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold group-hover:underline">Tap to insert</span>
                  </div>
                  <p className="text-xs font-mono font-medium text-blue-700 dark:text-blue-300 mt-0.5">
                    Speak: {f.spokenPhrase}
                  </p>
                </div>

                {/* Live KaTeX Rendered Preview */}
                <div className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-x-auto text-xs text-center py-2 text-stone-900 dark:text-stone-100 font-serif">
                  <KaTeXText text={`$${f.latex}$`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: DIAGRAM & VECTOR COMMANDS */}
      <div className="space-y-2.5 pt-3 border-t border-stone-200 dark:border-stone-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-purple-600" />
            3. Spoken Diagram & Vector Canvas Commands
          </span>
          <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-900">
            Voice-Drawn
          </span>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-400">
          Dictate shapes, coordinate axes, and vectors hands-free. Click or speak any command to render it onto the diagram canvas:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {DIAGRAM_COMMAND_SHEET.map((d, idx) => (
            <div
              key={`modal-diag-${d.title}-${idx}`}
              onClick={() => {
                handleDemonstrateSpeech(d.exampleSpeech);
                if (onSelectCommand) {
                  onSelectCommand({
                    phrase: d.exampleSpeech,
                    action: d.description,
                    category: "tools",
                    exampleSpeech: d.exampleSpeech,
                  });
                }
              }}
              className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/40 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/20 transition-all cursor-pointer flex flex-col justify-between gap-1.5 group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider block">
                    {d.title}
                  </span>
                  <span className="text-[10px] text-purple-600 font-semibold group-hover:underline">Tap to draw</span>
                </div>
                <p className="text-xs font-mono font-medium text-purple-700 dark:text-purple-300 mt-0.5">
                  Speak: {d.spokenPhrase}
                </p>
              </div>

              <p className="text-[11px] text-stone-600 dark:text-stone-400">
                {d.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
