import { DiagramShape } from "../types";

export interface DiagramCommandResult {
  shapes: DiagramShape[];
  description: string;
  actionTaken: "add" | "delete" | "clear" | "style" | "none" | "open";
}

const COLOR_KEYWORDS: Record<string, string> = {
  black: "#1e293b",
  blue: "#2563eb",
  red: "#dc2626",
  green: "#16a34a",
  purple: "#9333ea",
  orange: "#ea580c",
  yellow: "#ca8a04",
  gray: "#64748b",
  white: "#ffffff",
  transparent: "transparent",
};

/**
 * Checks whether a spoken phrase is likely a diagram command.
 */
export function isLikelyDiagramCommand(spoken: string): boolean {
  if (!spoken || !spoken.trim()) return false;
  // Normalize punctuation and extra spaces
  const lower = spoken
    .trim()
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Exclude mathematical root phrases
  if (/\b(?:square\s+root|cube\s+root|nth\s+root)\b/i.test(lower)) {
    return false;
  }

  // 1. Explicit open/show/toggle diagram or canvas
  if (/\b(?:show\s+diagram|open\s+diagram|view\s+diagram|open\s+canvas|show\s+canvas|toggle\s+diagram|diagram\s+mode|canvas\s+mode|close\s+diagram|hide\s+diagram)\b/i.test(lower)) return true;

  // 2. Explicit draw / diagram keywords
  if (/^(?:draw|diagram|sketch|shape|plot|paint|render)\b/i.test(lower)) return true;

  // 3. Canvas control commands
  if (/^(?:clear\s+(?:canvas|diagram|drawing|all)|reset\s+diagram|erase\s+diagram|wipe\s+diagram|clear\s+canvas|clear)$/i.test(lower)) return true;
  if (/^(?:undo\s+diagram|undo\s+shape|delete\s+last(?:\s+shape)?|remove\s+last(?:\s+shape)?|undo)$/i.test(lower)) return true;

  // 4. Predefined templates & axes
  if (/\b(?:coordinate\s+axes|cartesian\s+plane|cartesian\s+axes|xy\s+axes|axes|axis|x\s+and\s+y\s+axis)\b/i.test(lower)) return true;
  if (/\b(?:free\s+body\s+diagram|free\s+body|block\s+on\s+(?:a\s+)?surface|binary\s+tree|tree\s+diagram|tree\s+structure)\b/i.test(lower)) return true;

  // 5. Shape names with or without parameters (circle, rectangle, rect, square, triangle, arrow, vector, line)
  if (/\b(?:circle|rectangle|rect|square|triangle|arrow|vector|line|fbd|tree)\b/i.test(lower)) return true;

  // 6. Directional vectors / arrows (e.g. "arrow right", "arrow pointing down", "arrow from left to right")
  if (/\b(?:arrow|vector)\b/i.test(lower)) return true;

  // 7. Lines (e.g. "vertical line", "horizontal line", "straight line")
  if (/\b(?:vertical\s+line|horizontal\s+line|straight\s+line)\b/i.test(lower)) return true;

  // 8. Shape modifiers & annotations
  if (/\b(?:radius\s+\d+|width\s+\d+|height\s+\d+|size\s+\d+|labeled\s+[a-z0-9]+|attendance)\b/i.test(lower)) return true;
  if (/^(?:label\s+diagram|add\s+label|annotate)\b/i.test(lower)) return true;

  return false;
}

/**
 * Extracts position keywords or coordinates from speech.
 * Default canvas coordinate space is 500x300.
 */
function parsePosition(spoken: string, defaultX = 250, defaultY = 150): { x: number; y: number } {
  let x = defaultX;
  let y = defaultY;

  // Named positions - include "attendance" which Web Speech API frequently produces for "at center"
  if (/attendance|at\s+center|in\s+(?:the\s+)?middle|at\s+origin|center/i.test(spoken)) {
    x = 250;
    y = 150;
  } else if (/at\s+top\s+left/i.test(spoken)) {
    x = 100;
    y = 80;
  } else if (/at\s+top\s+right/i.test(spoken)) {
    x = 400;
    y = 80;
  } else if (/at\s+bottom\s+left/i.test(spoken)) {
    x = 100;
    y = 220;
  } else if (/at\s+bottom\s+right/i.test(spoken)) {
    x = 400;
    y = 220;
  } else if (/at\s+top/i.test(spoken)) {
    x = 250;
    y = 80;
  } else if (/at\s+bottom/i.test(spoken)) {
    x = 250;
    y = 220;
  } else if (/at\s+left/i.test(spoken)) {
    x = 120;
    y = 150;
  } else if (/at\s+right/i.test(spoken)) {
    x = 380;
    y = 150;
  }

  // Explicit numbers: "at 150 100" or "at x 150 y 100"
  const coordsMatch = spoken.match(/(?:at|coordinates?)\s+(?:x\s*)?(\d+)\s*(?:and|,)?\s*(?:y\s*)?(\d+)/i);
  if (coordsMatch) {
    x = parseInt(coordsMatch[1], 10);
    y = parseInt(coordsMatch[2], 10);
  }

  return { x, y };
}

function parseColor(spoken: string, defaultColor: string): string {
  for (const [name, hex] of Object.entries(COLOR_KEYWORDS)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(spoken)) {
      return hex;
    }
  }
  return defaultColor;
}

function extractLabel(text: string): string | undefined {
  const match = text.match(/(?:labeled\s+as|labeled|label(?:ed)?\s+as|with\s+label|label)\s+["']?([^"',]+?)["']?(?:\s+(?:at|with|radius|width|height|size|attendance)|$)/i);
  return match && match[1] ? match[1].trim() : undefined;
}

/**
 * Parses spoken drawing commands into SVG shape modifications.
 */
export function parseDiagramVoiceCommand(
  spoken: string,
  existingShapes: DiagramShape[]
): DiagramCommandResult {
  const text = spoken.trim();
  const lower = text.toLowerCase();

  // 1. Clear Canvas
  if (/^(?:clear\s+(?:canvas|diagram|drawing|all)|reset\s+diagram|erase\s+diagram)$/i.test(lower)) {
    return {
      shapes: [],
      description: "Canvas cleared",
      actionTaken: "clear",
    };
  }

  // 2. Undo / Delete last shape
  if (/^(?:undo|undo\s+shape|undo\s+diagram|delete\s+last(?:\s+shape)?|remove\s+last(?:\s+shape)?)$/i.test(lower)) {
    if (existingShapes.length === 0) {
      return {
        shapes: [],
        description: "Canvas is already empty",
        actionTaken: "none",
      };
    }
    const updated = existingShapes.slice(0, -1);
    return {
      shapes: updated,
      description: "Removed last shape",
      actionTaken: "delete",
    };
  }

  // 2b. Open / Show / Focus Diagram Canvas
  if (/^(?:show\s+diagram|open\s+diagram|view\s+diagram|open\s+canvas|show\s+canvas|toggle\s+diagram|canvas\s+mode|diagram\s+mode)$/i.test(lower)) {
    return {
      shapes: existingShapes,
      description: "Opened diagram drawing canvas",
      actionTaken: "open",
    };
  }

  // 2c. Generic "Draw Diagram" / "Add Diagram" / "Diagram"
  if (/^(?:draw\s+(?:a\s+)?diagram|diagram|add\s+diagram|sketch\s+diagram|draw\s+schematic|schematic)$/i.test(lower)) {
    if (existingShapes.length === 0) {
      // Initialize with Cartesian axes template so the user immediately sees a working diagram
      const axisId1 = `shape_${Date.now()}_1`;
      const axisId2 = `shape_${Date.now()}_2`;
      const xAxis: DiagramShape = {
        id: axisId1,
        type: "arrow",
        x: 50,
        y: 150,
        x2: 450,
        y2: 150,
        stroke: "#1e293b",
        fill: "#1e293b",
        strokeWidth: 2,
        label: "X",
      };
      const yAxis: DiagramShape = {
        id: axisId2,
        type: "arrow",
        x: 250,
        y: 270,
        x2: 250,
        y2: 30,
        stroke: "#1e293b",
        fill: "#1e293b",
        strokeWidth: 2,
        label: "Y",
      };
      return {
        shapes: [xAxis, yAxis],
        description: "Drew coordinate axes onto diagram canvas",
        actionTaken: "add",
      };
    }
    return {
      shapes: existingShapes,
      description: "Diagram canvas ready for shapes",
      actionTaken: "open",
    };
  }

  // 3. Predefined Template: Free-Body Diagram with Applied, Friction, Normal, and Gravity Forces
  if (/\b(?:free\s+body|block\s+on\s+(?:a\s+)?surface|box\s+with\s+forces)\b/i.test(lower)) {
    const timestamp = Date.now();
    const block: DiagramShape = {
      id: `rect_${timestamp}_1`,
      type: "rect",
      x: 175,
      y: 120,
      width: 150,
      height: 80,
      stroke: "#1e293b",
      fill: "#e0f2fe",
      strokeWidth: 2.5,
      label: "Block (m)",
    };
    const fApplied: DiagramShape = {
      id: `arrow_${timestamp}_2`,
      type: "arrow",
      x: 325,
      y: 160,
      x2: 440,
      y2: 160,
      stroke: "#2563eb",
      fill: "#2563eb",
      strokeWidth: 2.5,
      label: "F_applied",
    };
    const fFriction: DiagramShape = {
      id: `arrow_${timestamp}_3`,
      type: "arrow",
      x: 175,
      y: 160,
      x2: 60,
      y2: 160,
      stroke: "#dc2626",
      fill: "#dc2626",
      strokeWidth: 2.5,
      label: "F_friction",
    };
    const normalForce: DiagramShape = {
      id: `arrow_${timestamp}_4`,
      type: "arrow",
      x: 250,
      y: 120,
      x2: 250,
      y2: 40,
      stroke: "#16a34a",
      fill: "#16a34a",
      strokeWidth: 2.5,
      label: "Normal Force N",
    };
    const gravity: DiagramShape = {
      id: `arrow_${timestamp}_5`,
      type: "arrow",
      x: 250,
      y: 200,
      x2: 250,
      y2: 275,
      stroke: "#ca8a04",
      fill: "#ca8a04",
      strokeWidth: 2.5,
      label: "W = mg",
    };

    return {
      shapes: [...existingShapes, block, fApplied, fFriction, normalForce, gravity],
      description: "Drew Free-Body Diagram with block and force vectors",
      actionTaken: "add",
    };
  }

  // 4. Predefined Template: Binary Tree
  if (/\b(?:binary\s+tree|tree\s+diagram|tree\s+structure)\b/i.test(lower)) {
    const timestamp = Date.now();
    const rootNode: DiagramShape = {
      id: `circle_${timestamp}_1`,
      type: "circle",
      x: 250,
      y: 65,
      radius: 30,
      stroke: "#2563eb",
      fill: "#dbeafe",
      strokeWidth: 2.5,
      label: "Root",
    };
    const leftChild: DiagramShape = {
      id: `circle_${timestamp}_2`,
      type: "circle",
      x: 150,
      y: 180,
      radius: 25,
      stroke: "#16a34a",
      fill: "#dcfce7",
      strokeWidth: 2.5,
      label: "L",
    };
    const rightChild: DiagramShape = {
      id: `circle_${timestamp}_3`,
      type: "circle",
      x: 350,
      y: 180,
      radius: 25,
      stroke: "#9333ea",
      fill: "#f3e8ff",
      strokeWidth: 2.5,
      label: "R",
    };
    const lineLeft: DiagramShape = {
      id: `line_${timestamp}_4`,
      type: "line",
      x: 230,
      y: 85,
      x2: 170,
      y2: 160,
      stroke: "#64748b",
      fill: "transparent",
      strokeWidth: 2,
    };
    const lineRight: DiagramShape = {
      id: `line_${timestamp}_5`,
      type: "line",
      x: 270,
      y: 85,
      x2: 330,
      y2: 160,
      stroke: "#64748b",
      fill: "transparent",
      strokeWidth: 2,
    };

    return {
      shapes: [...existingShapes, lineLeft, lineRight, rootNode, leftChild, rightChild],
      description: "Drew Binary Tree with Root, Left (L), and Right (R) nodes",
      actionTaken: "add",
    };
  }

  // 5. Predefined Template: Cartesian Coordinate Axes
  if (/\b(?:coordinate\s+axes|axes|axis|coordinate\s+plane|graph\s+axes|cartesian\s+plane|cartesian\s+axes|xy\s+axes)\b/i.test(lower)) {
    const axisId1 = `shape_${Date.now()}_1`;
    const axisId2 = `shape_${Date.now()}_2`;
    const xAxis: DiagramShape = {
      id: axisId1,
      type: "arrow",
      x: 50,
      y: 150,
      x2: 450,
      y2: 150,
      stroke: "#1e293b",
      fill: "#1e293b",
      strokeWidth: 2,
      label: "X",
    };
    const yAxis: DiagramShape = {
      id: axisId2,
      type: "arrow",
      x: 250,
      y: 270,
      x2: 250,
      y2: 30,
      stroke: "#1e293b",
      fill: "#1e293b",
      strokeWidth: 2,
      label: "Y",
    };
    return {
      shapes: [...existingShapes, xAxis, yAxis],
      description: "Drew coordinate axes (X and Y)",
      actionTaken: "add",
    };
  }

  // 6. Circle
  if (/\b(?:circle|disc|ring)\b/i.test(lower)) {
    const radiusMatch = lower.match(/radius\s+(\d+)/i);
    const radius = radiusMatch ? parseInt(radiusMatch[1], 10) : 50;
    const pos = parsePosition(lower, 250, 150);
    const stroke = parseColor(lower, "#2563eb");
    const isFilled = /\bfilled|fill\b/i.test(lower);
    const fill = isFilled ? parseColor(lower, "#dbeafe") : "transparent";
    const label = extractLabel(text);

    const newShape: DiagramShape = {
      id: `circle_${Date.now()}`,
      type: "circle",
      x: pos.x,
      y: pos.y,
      radius,
      stroke,
      fill,
      strokeWidth: 2.5,
      label,
    };

    return {
      shapes: [...existingShapes, newShape],
      description: `Drew circle (radius ${radius}) at (${pos.x}, ${pos.y})${label ? ` labeled "${label}"` : ""}`,
      actionTaken: "add",
    };
  }

  // 7. Rectangle / Square / Box
  if (/\b(?:rectangle|rect|square|box)\b/i.test(lower)) {
    const isSquare = /\bsquare\b/i.test(lower);
    const widthMatch = lower.match(/width\s+(\d+)/i);
    const heightMatch = lower.match(/height\s+(\d+)/i);
    const sizeMatch = lower.match(/size\s+(\d+)/i);

    let width = 120;
    let height = 80;

    if (isSquare) {
      const s = sizeMatch ? parseInt(sizeMatch[1], 10) : widthMatch ? parseInt(widthMatch[1], 10) : 100;
      width = s;
      height = s;
    } else {
      if (widthMatch) width = parseInt(widthMatch[1], 10);
      if (heightMatch) height = parseInt(heightMatch[1], 10);
    }

    const pos = parsePosition(lower, 250 - width / 2, 150 - height / 2);
    const stroke = parseColor(lower, "#16a34a");
    const isFilled = /\bfilled|fill\b/i.test(lower);
    const fill = isFilled ? parseColor(lower, "#dcfce7") : "transparent";
    const label = extractLabel(text);

    const newShape: DiagramShape = {
      id: `rect_${Date.now()}`,
      type: "rect",
      x: pos.x,
      y: pos.y,
      width,
      height,
      stroke,
      fill,
      strokeWidth: 2.5,
      label,
    };

    return {
      shapes: [...existingShapes, newShape],
      description: `Drew ${isSquare ? "square" : "rectangle"} (${width}x${height})${label ? ` labeled "${label}"` : ""}`,
      actionTaken: "add",
    };
  }

  // 8. Arrow / Directed Vector
  if (/\b(?:arrow|vector)\b/i.test(lower)) {
    let x = 150;
    let y = 150;
    let x2 = 350;
    let y2 = 150;

    if (/from\s+left\s+to\s+right|pointing\s+(?:to\s+(?:the\s+)?)?right|east|arrow\s+right/i.test(lower)) {
      x = 100;
      y = 150;
      x2 = 400;
      y2 = 150;
    } else if (/from\s+right\s+to\s+left|pointing\s+(?:to\s+(?:the\s+)?)?left|west|arrow\s+left/i.test(lower)) {
      x = 400;
      y = 150;
      x2 = 100;
      y2 = 150;
    } else if (/from\s+top\s+to\s+bottom|pointing\s+(?:down|downwards?)|south|arrow\s+down/i.test(lower)) {
      x = 250;
      y = 70;
      x2 = 250;
      y2 = 230;
    } else if (/from\s+bottom\s+to\s+top|pointing\s+(?:up|upwards?)|north|arrow\s+up/i.test(lower)) {
      x = 250;
      y = 230;
      x2 = 250;
      y2 = 70;
    }

    const stroke = parseColor(lower, "#dc2626");
    const label = extractLabel(text);

    const newShape: DiagramShape = {
      id: `arrow_${Date.now()}`,
      type: "arrow",
      x,
      y,
      x2,
      y2,
      stroke,
      fill: stroke,
      strokeWidth: 2.5,
      label,
    };

    return {
      shapes: [...existingShapes, newShape],
      description: `Drew arrow pointing (${x},${y}) -> (${x2},${y2})${label ? ` labeled "${label}"` : ""}`,
      actionTaken: "add",
    };
  }

  // 9. Line / Segment
  if (/\b(?:line|segment|divider)\b/i.test(lower)) {
    let x = 100;
    let y = 150;
    let x2 = 400;
    let y2 = 150;

    if (/vertical/i.test(lower)) {
      x = 250;
      y = 50;
      x2 = 250;
      y2 = 250;
    }

    const stroke = parseColor(lower, "#1e293b");

    const newShape: DiagramShape = {
      id: `line_${Date.now()}`,
      type: "line",
      x,
      y,
      x2,
      y2,
      stroke,
      fill: "transparent",
      strokeWidth: 2,
    };

    return {
      shapes: [...existingShapes, newShape],
      description: `Drew line (${x},${y}) to (${x2},${y2})`,
      actionTaken: "add",
    };
  }

  // 10. Triangle
  if (/\b(?:triangle)\b/i.test(lower)) {
    const pos = parsePosition(lower, 250, 150);
    const stroke = parseColor(lower, "#9333ea");
    const isFilled = /\bfilled|fill\b/i.test(lower);
    const fill = isFilled ? parseColor(lower, "#f3e8ff") : "transparent";
    const label = extractLabel(text);

    const newShape: DiagramShape = {
      id: `tri_${Date.now()}`,
      type: "triangle",
      x: pos.x,
      y: pos.y,
      width: 120,
      height: 100,
      stroke,
      fill,
      strokeWidth: 2.5,
      label,
    };

    return {
      shapes: [...existingShapes, newShape],
      description: `Drew triangle at (${pos.x}, ${pos.y})${label ? ` labeled "${label}"` : ""}`,
      actionTaken: "add",
    };
  }

  // 11. Text Label / Annotation
  const labelTextMatch = text.match(/(?:label|text|write|annotate)\s+(?:diagram\s+)?(?:with\s+)?["']?(.+?)["']?$/i);
  if (labelTextMatch) {
    const labelContent = labelTextMatch[1].trim();
    const pos = parsePosition(lower, 250, 50);
    const stroke = parseColor(lower, "#1e293b");

    const newShape: DiagramShape = {
      id: `text_${Date.now()}`,
      type: "text",
      x: pos.x,
      y: pos.y,
      text: labelContent,
      stroke,
      fill: stroke,
      strokeWidth: 1,
    };

    return {
      shapes: [...existingShapes, newShape],
      description: `Added label "${labelContent}"`,
      actionTaken: "add",
    };
  }

  return {
    shapes: existingShapes,
    description: `Unrecognized diagram command: "${spoken}"`,
    actionTaken: "none",
  };
}

/**
 * Converts shape objects into an embeddable SVG XML string.
 */
export function generateSvgMarkup(shapes: DiagramShape[], width = 500, height = 300): string {
  const elements = shapes.map((shape) => {
    switch (shape.type) {
      case "circle":
        return `<circle cx="${shape.x}" cy="${shape.y}" r="${shape.radius || 40}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" fill="${shape.fill}" />${
          shape.label ? `<text x="${shape.x}" y="${shape.y + 5}" font-size="14" font-weight="bold" fill="${shape.stroke}" text-anchor="middle">${shape.label}</text>` : ""
        }`;

      case "rect":
        return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width || 100}" height="${shape.height || 60}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" fill="${shape.fill}" rx="4" />${
          shape.label ? `<text x="${shape.x + (shape.width || 100) / 2}" y="${shape.y + (shape.height || 60) / 2 + 5}" font-size="14" font-weight="bold" fill="${shape.stroke}" text-anchor="middle">${shape.label}</text>` : ""
        }`;

      case "line":
        return `<line x1="${shape.x}" y1="${shape.y}" x2="${shape.x2 || shape.x + 100}" y2="${shape.y2 || shape.y}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" stroke-linecap="round" />`;

      case "arrow": {
        const markerId = `arrowhead_${shape.id}`;
        return `
          <defs>
            <marker id="${markerId}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="${shape.stroke}" />
            </marker>
          </defs>
          <line x1="${shape.x}" y1="${shape.y}" x2="${shape.x2 || shape.x + 100}" y2="${shape.y2 || shape.y}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" marker-end="url(#${markerId})" stroke-linecap="round" />
          ${shape.label ? `<text x="${(shape.x + (shape.x2 || shape.x)) / 2}" y="${(shape.y + (shape.y2 || shape.y)) / 2 - 10}" font-size="14" font-weight="bold" fill="${shape.stroke}" text-anchor="middle">${shape.label}</text>` : ""}
        `;
      }

      case "triangle": {
        const w = shape.width || 100;
        const h = shape.height || 80;
        const p1 = `${shape.x},${shape.y - h / 2}`;
        const p2 = `${shape.x - w / 2},${shape.y + h / 2}`;
        const p3 = `${shape.x + w / 2},${shape.y + h / 2}`;
        return `<polygon points="${p1} ${p2} ${p3}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" fill="${shape.fill}" />${
          shape.label ? `<text x="${shape.x}" y="${shape.y + 10}" font-size="14" font-weight="bold" fill="${shape.stroke}" text-anchor="middle">${shape.label}</text>` : ""
        }`;
      }

      case "text":
        return `<text x="${shape.x}" y="${shape.y}" font-size="16" font-family="system-ui, sans-serif" font-weight="bold" fill="${shape.stroke}" text-anchor="middle">${shape.text || ""}</text>`;

      default:
        return "";
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background: #fafaf9; border-radius: 8px;">${elements.join("\n")}</svg>`;
}
