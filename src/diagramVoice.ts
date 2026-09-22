/**
 * diagramVoice.ts (NEW MODULE)
 * -----------------------------------------------------------------------
 * Turns spoken drawing commands ("draw a rectangle", "draw an arrow from
 * A to B", "draw an axis", "add label force") into DiagramShape objects
 * that DiagramCanvas.tsx renders as inline SVG. Shapes are auto-laid-out
 * left-to-right/top-to-bottom on a 400x260 canvas so a candidate never has
 * to speak coordinates.
 * -----------------------------------------------------------------------
 */
import { DiagramShape, DiagramShapeType } from "../types";

const CANVAS_W = 400;
const CANVAS_H = 260;
const COLS = 3;
const CELL_W = CANVAS_W / COLS;
const CELL_H = 90;

/** Simple grid auto-layout so every new shape gets a free-ish slot. */
function nextSlot(count: number) {
  const col = count % COLS;
  const row = Math.floor(count / COLS);
  return { x: col * CELL_W + CELL_W / 2, y: 40 + (row % 2) * CELL_H };
}

export interface DiagramCommandResult {
  action: "add" | "clear" | "none";
  shape?: DiagramShape;
}

/**
 * Interprets a "draw ..." / "add label ..." utterance. `existingCount` is
 * the number of shapes already in the active diagram, used for layout and
 * for id generation.
 */
export function parseDiagramCommand(phrase: string, existingCount: number): DiagramCommandResult {
  const p = phrase.trim().toLowerCase();

  if (/^clear (?:the )?diagram$/.test(p)) return { action: "clear" };

  const id = `shape_${existingCount + 1}_${Date.now()}`;
  const slot = nextSlot(existingCount);

  // "draw an arrow from A to B"
  const arrowMatch = p.match(/^draw (?:an? )?arrow(?: from (.+?) to (.+))?$/);
  if (arrowMatch) {
    return {
      action: "add",
      shape: {
        id, type: "arrow" as DiagramShapeType,
        x: slot.x - 40, y: slot.y, x2: slot.x + 40, y2: slot.y,
        text: arrowMatch[1] && arrowMatch[2] ? `${arrowMatch[1]} → ${arrowMatch[2]}` : undefined,
      },
    };
  }

  // "draw a rectangle [labeled X]"
  const rectMatch = p.match(/^draw (?:a )?rectangle(?: (?:labeled|labelled) (.+))?$/);
  if (rectMatch) {
    return { action: "add", shape: { id, type: "rectangle", x: slot.x - 35, y: slot.y - 20, w: 70, h: 40, text: rectMatch[1] } };
  }

  // "draw a triangle [labeled X]"
  const triMatch = p.match(/^draw (?:a )?triangle(?: (?:labeled|labelled) (.+))?$/);
  if (triMatch) {
    return { action: "add", shape: { id, type: "triangle", x: slot.x, y: slot.y - 25, w: 60, h: 50, text: triMatch[1] } };
  }

  // "draw a circle [labeled X]"
  const circMatch = p.match(/^draw (?:a )?circle(?: (?:labeled|labelled) (.+))?$/);
  if (circMatch) {
    return { action: "add", shape: { id, type: "circle", x: slot.x, y: slot.y, w: 30, text: circMatch[1] } };
  }

  // "draw a line [labeled X]"
  const lineMatch = p.match(/^draw (?:a )?line(?: (?:labeled|labelled) (.+))?$/);
  if (lineMatch) {
    return { action: "add", shape: { id, type: "line", x: slot.x - 40, y: slot.y, x2: slot.x + 40, y2: slot.y, text: lineMatch[1] } };
  }

  // "draw an axis" / "draw a graph"
  if (/^draw (?:an? )?(?:axis|axes|graph)$/.test(p)) {
    return { action: "add", shape: { id, type: "axis", x: 20, y: CANVAS_H - 30, w: CANVAS_W - 40, h: CANVAS_H - 60 } };
  }

  // "add label X" — attaches a free-floating text label.
  const labelMatch = p.match(/^add (?:a |an )?label (.+)$/);
  if (labelMatch) {
    return { action: "add", shape: { id, type: "label", x: slot.x, y: slot.y, text: labelMatch[1] } };
  }

  return { action: "none" };
}

export const DIAGRAM_CANVAS_SIZE = { width: CANVAS_W, height: CANVAS_H };