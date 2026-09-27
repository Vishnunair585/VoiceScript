import React, { useState } from "react";
import { DiagramShape } from "../../types";
import {
  parseDiagramVoiceCommand,
  generateSvgMarkup,
} from "../../lib/diagramVoice";
import {
  Circle,
  Square,
  Triangle,
  ArrowRight,
  Minus,
  Type,
  RotateCcw,
  Trash2,
  Download,
  Mic,
  Palette,
  Sparkles,
  Compass,
} from "lucide-react";

interface DiagramCanvasProps {
  shapes: DiagramShape[];
  onShapesChange: (shapes: DiagramShape[]) => void;
  initialPrompt?: string;
  isListening?: boolean;
}

export function DiagramCanvas({
  shapes,
  onShapesChange,
  initialPrompt,
  isListening,
}: DiagramCanvasProps) {
  const [selectedColor, setSelectedColor] = useState("#2563eb");
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);
  const [spokenInputText, setSpokenInputText] = useState("");

  const handleExecuteVoiceCommand = (command: string) => {
    if (!command.trim()) return;
    const result = parseDiagramVoiceCommand(command, shapes);
    onShapesChange(result.shapes);
    setLastActionMessage(result.description);
    setSpokenInputText("");
  };

  const handleAddQuickShape = (type: "circle" | "rect" | "triangle" | "arrow" | "axes" | "line") => {
    if (type === "axes") {
      handleExecuteVoiceCommand("draw axes");
      return;
    }

    const id = `shape_${Date.now()}`;
    let newShape: DiagramShape;

    switch (type) {
      case "circle":
        newShape = {
          id,
          type: "circle",
          x: 250,
          y: 150,
          radius: 50,
          stroke: selectedColor,
          fill: "transparent",
          strokeWidth: 2.5,
        };
        break;
      case "rect":
        newShape = {
          id,
          type: "rect",
          x: 175,
          y: 100,
          width: 150,
          height: 100,
          stroke: selectedColor,
          fill: "transparent",
          strokeWidth: 2.5,
        };
        break;
      case "triangle":
        newShape = {
          id,
          type: "triangle",
          x: 250,
          y: 150,
          width: 120,
          height: 100,
          stroke: selectedColor,
          fill: "transparent",
          strokeWidth: 2.5,
        };
        break;
      case "arrow":
        newShape = {
          id,
          type: "arrow",
          x: 100,
          y: 150,
          x2: 400,
          y2: 150,
          stroke: selectedColor,
          fill: selectedColor,
          strokeWidth: 2.5,
        };
        break;
      case "line":
        newShape = {
          id,
          type: "line",
          x: 100,
          y: 150,
          x2: 400,
          y2: 150,
          stroke: selectedColor,
          fill: "transparent",
          strokeWidth: 2,
        };
        break;
    }

    onShapesChange([...shapes, newShape]);
    setLastActionMessage(`Added ${type}`);
  };

  const handleClear = () => {
    onShapesChange([]);
    setLastActionMessage("Cleared canvas");
  };

  const handleUndo = () => {
    if (shapes.length > 0) {
      onShapesChange(shapes.slice(0, -1));
      setLastActionMessage("Removed last shape");
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 flex flex-col gap-3">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
            Voice Diagram & Schematic Canvas
          </span>
          <span className="text-xs font-mono text-stone-500">
            ({shapes.length} {shapes.length === 1 ? "element" : "elements"})
          </span>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleAddQuickShape("circle")}
            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer"
            title="Add Circle"
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleAddQuickShape("rect")}
            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer"
            title="Add Rectangle"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleAddQuickShape("triangle")}
            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer"
            title="Add Triangle"
          >
            <Triangle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleAddQuickShape("arrow")}
            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer"
            title="Add Arrow / Vector"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleAddQuickShape("axes")}
            className="px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold cursor-pointer"
            title="Add Cartesian Coordinate Axes"
          >
            XY Axes
          </button>
          <button
            type="button"
            onClick={() => handleExecuteVoiceCommand("draw free body diagram")}
            className="px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold cursor-pointer"
            title="Add Free-Body Diagram (Block & Vectors)"
          >
            FBD
          </button>
          <button
            type="button"
            onClick={() => handleExecuteVoiceCommand("draw binary tree")}
            className="px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold cursor-pointer"
            title="Add Binary Tree Hierarchy"
          >
            Tree
          </button>

          <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 mx-1" />

          {/* Color choices */}
          {["#2563eb", "#16a34a", "#dc2626", "#9333ea", "#1e293b"].map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => setSelectedColor(hex)}
              className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${
                selectedColor === hex ? "ring-2 ring-blue-500 scale-110" : ""
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}

          <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 mx-1" />

          <button
            type="button"
            onClick={handleUndo}
            disabled={shapes.length === 0}
            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 disabled:opacity-40 cursor-pointer"
            title="Undo last shape"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={shapes.length === 0}
            className="p-1.5 rounded-lg border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 disabled:opacity-40 cursor-pointer"
            title="Clear diagram"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden bg-stone-50/70 dark:bg-stone-950/40 flex items-center justify-center min-h-[260px]">
        {shapes.length === 0 ? (
          <div className="w-full h-[260px] relative flex flex-col items-center justify-center p-4">
            {/* Subtle SVG Background Grid */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-25 dark:opacity-15"
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              height="100%"
            >
              <defs>
                <pattern id="canvas-grid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-stone-400 dark:text-stone-600" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#canvas-grid)" />
              {/* Origin Crosshair Marker */}
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-blue-500/40" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-blue-500/40" />
            </svg>

            <div className="relative z-10 text-center max-w-sm bg-white/85 dark:bg-stone-900/85 backdrop-blur-xs p-4 rounded-xl border border-stone-200/80 dark:border-stone-700/80 shadow-2xs">
              <Compass className="w-7 h-7 mx-auto mb-1.5 text-blue-600" />
              <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                Interactive Voice Diagram Canvas
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                Say e.g. <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">"draw coordinate axes"</span>, <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">"draw circle radius 60"</span>, or click quick shapes above.
              </p>
              {initialPrompt && (
                <div className="mt-2 text-[10px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 p-1.5 rounded-lg border border-blue-200 dark:border-blue-900">
                  {initialPrompt}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-2"
            dangerouslySetInnerHTML={{ __html: generateSvgMarkup(shapes, 500, 260) }}
          />
        )}

        {/* Live Feedback overlay */}
        {lastActionMessage && (
          <div className="absolute bottom-2 left-2 bg-stone-900/90 text-white text-[11px] px-2.5 py-1 rounded-md backdrop-blur-xs font-mono">
            {lastActionMessage}
          </div>
        )}
      </div>

      {/* Spoken Diagram Command Input Helper */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={spokenInputText}
            onChange={(e) => setSpokenInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleExecuteVoiceCommand(spokenInputText);
            }}
            placeholder="Type or speak diagram command: e.g. 'draw arrow from left to right', 'label Nucleus'"
            className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={() => handleExecuteVoiceCommand(spokenInputText)}
          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shrink-0"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
