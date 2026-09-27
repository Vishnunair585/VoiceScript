// Spoken math & scientific formula to LaTeX conversion engine for hands-free examination

export interface MathConversionResult {
  latex: string;
  displayLatex: string;
  detectedTerms: string[];
}

const GREEK_MAP: Record<string, string> = {
  alpha: "\\alpha",
  beta: "\\beta",
  gamma: "\\gamma",
  delta: "\\delta",
  epsilon: "\\epsilon",
  zeta: "\\zeta",
  eta: "\\eta",
  theta: "\\theta",
  iota: "\\iota",
  kappa: "\\kappa",
  lambda: "\\lambda",
  mu: "\\mu",
  nu: "\\nu",
  xi: "\\xi",
  pi: "\\pi",
  rho: "\\rho",
  sigma: "\\sigma",
  tau: "\\tau",
  upsilon: "\\upsilon",
  phi: "\\phi",
  chi: "\\chi",
  psi: "\\psi",
  omega: "\\omega",
  omega_cap: "\\Omega",
  delta_cap: "\\Delta",
  sigma_cap: "\\Sigma",
  theta_cap: "\\Theta",
  pi_cap: "\\Pi",
  gamma_cap: "\\Gamma",
  lambda_cap: "\\Lambda",
  phi_cap: "\\Phi",
  infinity: "\\infty",
};

const NUMBER_WORDS: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  eleven: "11",
  twelve: "12",
  thirteen: "13",
  fourteen: "14",
  fifteen: "15",
  sixteen: "16",
  seventeen: "17",
  eighteen: "18",
  nineteen: "19",
  twenty: "20",
  half: "1/2",
  quarter: "1/4",
};

// Known chemical formulas
const CHEMICAL_COMPOUNDS: Record<string, string> = {
  h2o: "\\text{H}_2\\text{O}",
  co2: "\\text{CO}_2",
  h2so4: "\\text{H}_2\\text{SO}_4",
  nacl: "\\text{NaCl}",
  c6h12o6: "\\text{C}_6\\text{H}_{12}\\text{O}_6",
  hcl: "\\text{HCl}",
  o2: "\\text{O}_2",
  h2: "\\text{H}_2",
  n2: "\\text{N}_2",
  ch4: "\\text{CH}_4",
  caco3: "\\text{CaCO}_3",
  naoh: "\\text{NaOH}",
  nh3: "\\text{NH}_3",
  kmno4: "\\text{KMnO}_4",
  fe2o3: "\\text{Fe}_2\\text{O}_3",
  co: "\\text{CO}",
  no2: "\\text{NO}_2",
  so2: "\\text{SO}_2",
  so4: "\\text{SO}_4^{2-}",
  ch3cooh: "\\text{CH}_3\\text{COOH}",
};

/**
 * Checks whether a spoken phrase is likely a math or scientific equation.
 */
export function isLikelyMathExpression(phrase: string): boolean {
  if (!phrase || !phrase.trim()) return false;
  const lower = phrase.trim().toLowerCase();

  // Strip prefixes like "math mode", "equation", "insert equation"
  const stripped = lower
    .replace(/^(?:math\s+mode|equation\s+mode|formula\s+mode|insert\s+equation|insert\s+math|insert\s+formula|equation|formula)\s*:\s*/i, "")
    .replace(/^(?:math\s+mode|equation\s+mode|formula\s+mode|insert\s+equation|insert\s+math|insert\s+formula|equation|formula)\s+/i, "")
    .trim();

  // Definite math keywords
  if (
    /\b(?:fraction|over\s+[a-z0-9]|divided\s+by|squared|cubed|to\s+the\s+power|raised\s+to|square\s+root|cube\s+root|nth\s+root|sqrt)\b/i.test(stripped) ||
    /\b(?:integral|summation|sum\s+from|limit\s+as|approaches|infinity|plus\s+minus|plus\s+or\s+minus|greater\s+than\s+or\s+equal|less\s+than\s+or\s+equal|not\s+equal)\b/i.test(stripped) ||
    /\b(?:sine|cosine|tangent|cotangent|secant|cosecant|sin\s+[a-z0-9]|cos\s+[a-z0-9]|tan\s+[a-z0-9]|log\s+base|natural\s+log|ln\s+[a-z0-9])\b/i.test(stripped) ||
    /\b(?:e\s+equals\s+m\s+c\s+squared|meters\s+per\s+second|f\s+equals\s+m\s+a|v\s+equals\s+u\s+plus\s+a\s+t)\b/i.test(stripped) ||
    /\b(?:alpha|beta|gamma|delta|theta|lambda|omega|sigma|pi|mu|tau|phi|psi)\b/i.test(stripped) ||
    /\b(?:h2o|co2|h2so4|nacl|c6h12o6|hcl|naoh|ch4|caco3)\b/i.test(stripped) ||
    /\b(?:gives|yields|produces)\s+(?:\d+\s*)?(?:h2o|co2|nacl|h2|o2)\b/i.test(stripped) ||
    /(?:[0-9a-z]\s*(?:\+|\-|\*|\/|=)\s*[0-9a-z].*?=\s*0)/i.test(stripped) ||
    /\b[a-z0-9]\s*(?:plus|\+|\-|\*|times|equals|=|divided\s+by)\s*[a-z0-9]\b/i.test(stripped)
  ) {
    return true;
  }

  return false;
}

/**
 * Formats a single chemical formula token (e.g. "H2O", "2 H2", "CO2", "C6H12O6")
 */
function formatChemicalFormula(str: string): string {
  const clean = str.trim().toLowerCase().replace(/\s+/g, "");
  if (CHEMICAL_COMPOUNDS[clean]) {
    return CHEMICAL_COMPOUNDS[clean];
  }
  // Generic chemical formula parser: e.g. H2SO4 -> \text{H}_2\text{SO}_4
  const formatted = str.trim().replace(/([A-Z][a-z]?|\d+)/g, (match) => {
    if (/^\d+$/.test(match)) {
      return `_${match}`;
    }
    return `\\text{${match}}`;
  });
  return formatted;
}

/**
 * Converts natural spoken mathematical phrase into clean LaTeX syntax.
 */
export function spokenMathToLaTeX(spoken: string): MathConversionResult {
  if (!spoken || !spoken.trim()) {
    return { latex: "", displayLatex: "", detectedTerms: [] };
  }

  let text = spoken.trim();
  const detectedTerms: string[] = [];

  // Strip wrapping quotes and speech punctuation (. , ? ! ;)
  text = text.replace(/^["'`]|["'`]$/g, "").trim();
  text = text.replace(/[.?!;]+$/, "").trim();

  // Strip leading explicit mode triggers if present
  text = text.replace(/^(?:math\s+mode|equation\s+mode|formula\s+mode|insert\s+equation|insert\s+math|insert\s+formula|equation|formula)\s*:\s*/i, "");
  text = text.replace(/^(?:math\s+mode|equation\s+mode|formula\s+mode|insert\s+equation|insert\s+math|insert\s+formula|equation|formula)\s+/i, "");

  // If already clean LaTeX wrapped in $$ or $, extract and return
  if (/^\$\$([\s\S]+)\$\$$/.test(text)) {
    const inner = text.replace(/^\$\$([\s\S]+)\$\$$/, "$1").trim();
    return { latex: inner, displayLatex: text, detectedTerms: ["latex"] };
  }
  if (/^\$([\s\S]+)\$$/.test(text)) {
    const inner = text.replace(/^\$([\s\S]+)\$$/, "$1").trim();
    return { latex: inner, displayLatex: `$$${inner}$$`, detectedTerms: ["latex"] };
  }

  // If text already has substantial LaTeX syntax (e.g. \frac, \sqrt, \int, \sum, \longrightarrow), preserve it directly
  if (/\\(?:frac|sqrt|int|sum|lim|alpha|beta|gamma|theta|pi|lambda|Omega|Delta|pm|times|div|neq|geq|leq|approx|infty|sin|cos|tan|ln|log|cdot|text|longrightarrow|quad|;)/.test(text)) {
    return { latex: text, displayLatex: `$$${text}$$`, detectedTerms: ["latex"] };
  }

  // Handle multi-expression clauses separated by " or " (e.g. "fraction a over b or fraction 1 over 2")
  if (/\s+\bor\b\s+/i.test(text) && !text.includes("\\") && (text.includes("fraction") || text.includes("root") || text.includes("squared") || text.includes("over"))) {
    const parts = text.split(/\s+\bor\b\s+/i);
    const converted = parts.map((p) => spokenMathToLaTeX(p));
    const joinedLatex = converted.map((c) => c.latex).join(" \\quad \\text{or} \\quad ");
    return {
      latex: joinedLatex,
      displayLatex: `$$${joinedLatex}$$`,
      detectedTerms: converted.flatMap((c) => c.detectedTerms),
    };
  }

  // Handle comma-separated math series (e.g. "x squared, y cubed, 10 to the power minus 3" or Greek symbols)
  if (text.includes(",") && (text.includes("squared") || text.includes("cubed") || text.includes("power") || text.includes("root") || text.includes("fraction"))) {
    const items = text.split(/\s*,\s*/);
    const converted = items.map((it) => spokenMathToLaTeX(it));
    const joinedLatex = converted.map((c) => c.latex).join(", \\quad ");
    return {
      latex: joinedLatex,
      displayLatex: `$$${joinedLatex}$$`,
      detectedTerms: converted.flatMap((c) => c.detectedTerms),
    };
  }

  // 1. Check for physics formulas
  if (/^e\s*(?:equals|=|is)\s*m\s*c\s*(?:squared|\^2)$/i.test(text)) {
    detectedTerms.push("mass-energy equivalence");
    return { latex: "E = mc^2", displayLatex: "$$E = mc^2$$", detectedTerms };
  }
  if (/^f\s*(?:equals|=|is)\s*m\s*a$/i.test(text)) {
    detectedTerms.push("Newton's second law");
    return { latex: "F = ma", displayLatex: "$$F = ma$$", detectedTerms };
  }
  if (/^v\s*(?:equals|=|is)\s*u\s*(?:plus|\+)\s*a\s*t$/i.test(text)) {
    detectedTerms.push("kinematic equation");
    return { latex: "v = u + at", displayLatex: "$$v = u + at$$", detectedTerms };
  }
  if (/^meters?\s+per\s+second\s+squared$/i.test(text)) {
    detectedTerms.push("acceleration unit");
    return { latex: "\\text{m/s}^2", displayLatex: "$$\\text{m/s}^2$$", detectedTerms };
  }
  if (/^meters?\s+per\s+second$/i.test(text)) {
    detectedTerms.push("velocity unit");
    return { latex: "\\text{m/s}", displayLatex: "$$\\text{m/s}$$", detectedTerms };
  }

  // 2. Chemical reaction equations (e.g., "2 H2 plus O2 gives 2 H2O")
  if (/\b(?:gives|yields|produces|forms|reacts\s+to\s+give|arrow)\b/i.test(text) && /\b(?:h2|o2|h2o|co2|nacl|hcl|naoh|ch4)\b/i.test(text)) {
    detectedTerms.push("chemical reaction");
    let reaction = text
      .replace(/\bplus\b/gi, "+")
      .replace(/\b(?:gives|yields|produces|forms|arrow)\b/gi, "\\longrightarrow");

    // Replace chemical terms with KaTeX notation
    for (const [key, val] of Object.entries(CHEMICAL_COMPOUNDS)) {
      const rx = new RegExp(`\\b${key}\\b`, "gi");
      reaction = reaction.replace(rx, val);
    }
    // Clean up spacing around reaction arrow
    reaction = reaction.replace(/\s*\\longrightarrow\s*/g, " \\longrightarrow ");
    reaction = reaction.replace(/\s*\+\s*/g, " + ");
    return { latex: reaction.trim(), displayLatex: `$$${reaction.trim()}$$`, detectedTerms };
  }

  // Standalone chemical compounds (e.g., "H2O", "CO2", "H2SO4", "NaCl", "C6H12O6")
  const compoundKey = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (CHEMICAL_COMPOUNDS[compoundKey]) {
    detectedTerms.push("chemical compound");
    const val = CHEMICAL_COMPOUNDS[compoundKey];
    return { latex: val, displayLatex: `$$${val}$$`, detectedTerms };
  }

  // 3. Normalization: replace written number words in mathematical contexts
  let lower = text.toLowerCase();

  // Convert number words when part of standard expressions (like "fraction 1 over 2", "plus 1", "from 0 to 1")
  for (const [word, digit] of Object.entries(NUMBER_WORDS)) {
    if (word === "half" || word === "quarter") continue;
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    lower = lower.replace(regex, digit);
  }

  // Handle "fraction half" or "one half"
  lower = lower.replace(/\b(?:fraction\s+)?(?:1\s+)?half\b/gi, "1 over 2");
  lower = lower.replace(/\b(?:fraction\s+)?(?:1\s+)?quarter\b/gi, "1 over 4");

  // 4. Definite & Indefinite Integrals
  // Form A: "integral from [lower] to [upper] of [expr] d[var]"
  lower = lower.replace(
    /integral\s+from\s+(.+?)\s+to\s+(.+?)\s+of\s+(.+?)\s+d\s*([a-z])\b/gi,
    (_, lowerLimit, upperLimit, expr, variable) => {
      detectedTerms.push("definite integral");
      const cleanExpr = cleanInternalMath(expr);
      const low = lowerLimit.trim() === "infinity" ? "\\infty" : lowerLimit.trim();
      const up = upperLimit.trim() === "infinity" ? "\\infty" : upperLimit.trim();
      return `\\int_{${low}}^{${up}} ${cleanExpr} \\, d${variable}`;
    }
  );

  // Form B: "integral of [expr] d[var] from [lower] to [upper]"
  lower = lower.replace(
    /integral\s+(?:of\s+)?(.+?)\s+d\s*([a-z])\s+from\s+(.+?)\s+to\s+(.+)/gi,
    (_, expr, variable, lowerLimit, upperLimit) => {
      detectedTerms.push("definite integral");
      const cleanExpr = cleanInternalMath(expr);
      const low = lowerLimit.trim() === "infinity" ? "\\infty" : lowerLimit.trim();
      const up = upperLimit.trim() === "infinity" ? "\\infty" : upperLimit.trim();
      return `\\int_{${low}}^{${up}} ${cleanExpr} \\, d${variable}`;
    }
  );

  // Form C: Indefinite integral: "integral of [expr] dx" or "integral [expr] dx"
  lower = lower.replace(
    /(?:indefinite\s+)?integral\s+(?:of\s+)?(.+?)\s+d\s*([a-z])\b/gi,
    (_, expr, variable) => {
      detectedTerms.push("integral");
      const cleanExpr = cleanInternalMath(expr);
      return `\\int ${cleanExpr} \\, d${variable}`;
    }
  );

  // 5. Summations
  // "sum from [var] equals [lower] to [upper] of [expr]"
  lower = lower.replace(
    /(?:sum|summation)\s+from\s+([a-z])\s*(?:equals|=|is)?\s*([0-9a-z]+)\s+to\s+(.+?)\s+of\s+(.+)/gi,
    (_, variable, lowerVal, upperVal, expr) => {
      detectedTerms.push("summation");
      const up = upperVal.trim() === "infinity" ? "\\infty" : upperVal.trim();
      const cleanExpr = cleanInternalMath(expr);
      return `\\sum_{${variable}=${lowerVal.trim()}}^{${up}} ${cleanExpr}`;
    }
  );

  // 6. Limits
  // "limit as x approaches 0 of sine x over x"
  lower = lower.replace(
    /limit\s+(?:as\s+)?([a-z])\s+(?:approaches|goes\s+to|tends\s+to|to)\s+(.+?)\s+of\s+(.+)/gi,
    (_, variable, targetVal, expr) => {
      detectedTerms.push("limit");
      const tgt = targetVal.trim() === "infinity" ? "\\infty" : targetVal.trim();
      return `\\lim_{${variable} \\to ${tgt}} ${expr}`;
    }
  );

  // 7. Process other math elements
  lower = cleanInternalMath(lower);

  // 8. Greek mathematical symbols (case-sensitive check on original if needed)
  if (/\b(?:alpha|beta|gamma|theta|pi|lambda|omega|delta)\b/i.test(spoken)) {
    // If user says "omega, delta" or has Greek terms
    for (const [name, sym] of Object.entries(GREEK_MAP)) {
      if (!name.endsWith("_cap")) {
        const regex = new RegExp(`\\b${name}\\b`, "gi");
        if (regex.test(lower)) {
          detectedTerms.push(name);
          lower = lower.replace(regex, sym);
        }
      }
    }
  }

  // Capital Omega and Delta if specified in spoken input
  if (/\b(?:Omega|Delta|Sigma|Theta|Pi|Gamma|Lambda|Phi)\b/.test(spoken)) {
    lower = lower.replace(/\\omega\b/g, (m, offset) => {
      return spoken.includes("Omega") ? "\\Omega" : "\\omega";
    });
    lower = lower.replace(/\\delta\b/g, (m, offset) => {
      return spoken.includes("Delta") ? "\\Delta" : "\\delta";
    });
  }

  // Deduplicate any accidental double backslashes
  lower = lower.replace(/\\\\([a-zA-Z]+)/g, "\\$1");

  // Final cleanup of extra spaces
  let cleanLatex = lower
    .replace(/\s+/g, " ")
    .replace(/\s*([=+\-<>])\s*/g, " $1 ")
    .replace(/\s*\\pm\s*/g, " \\pm ")
    .replace(/\s*\\times\s*/g, " \\times ")
    .replace(/\s*\\div\s*/g, " \\div ")
    .replace(/\s*\\neq\s*/g, " \\neq ")
    .replace(/\s*\\geq\s*/g, " \\geq ")
    .replace(/\s*\\leq\s*/g, " \\leq ")
    .replace(/\s*\\approx\s*/g, " \\approx ")
    .replace(/\{\s*-\s*([0-9a-z]+)\s*\}/g, "{-$1}")
    .trim();

  // Clean double spaces and fix commas
  cleanLatex = cleanLatex.replace(/\s*,\s*/g, ", ");
  cleanLatex = cleanLatex.replace(/\s{2,}/g, " ");

  const displayLatex = `$$${cleanLatex}$$`;

  return {
    latex: cleanLatex,
    displayLatex,
    detectedTerms,
  };
}

/**
 * Transforms components of a mathematical expression (fractions, powers, roots, trigonometry, operators).
 */
function cleanInternalMath(input: string): string {
  let str = input.trim();

  // Fractions: "fraction of [a] over [b]" or "fraction [a] over [b]"
  str = str.replace(
    /fraction\s+(?:of\s+)?(.+?)\s+over\s+(.+?)(?=(?:\s+plus|\s+minus|\s+equals|\s*$)|\))/gi,
    (_, num, den) => {
      return `\\frac{${cleanInternalMath(num)}}{${cleanInternalMath(den)}}`;
    }
  );

  // Square roots & cube roots
  // "cube root of [expr]"
  str = str.replace(/cube\s+root\s+(?:of\s+)?(.+?)(?=(?:\s+plus|\s+minus|\s+equals|\s*$)|\))/gi, (_, expr) => {
    return `\\sqrt[3]{${cleanInternalMath(expr)}}`;
  });
  // "square root of [expr]"
  str = str.replace(/(?:square\s+root|sqrt)\s+(?:of\s+)?(.+?)(?=(?:\s+plus|\s+minus|\s+equals|\s*$)|\))/gi, (_, expr) => {
    return `\\sqrt{${cleanInternalMath(expr)}}`;
  });

  // Powers and exponents:
  // "10 to the power minus 3" -> "10^{-3}"
  str = str.replace(
    /([0-9a-z\)\\]+)\s+to\s+the\s+power\s+(?:of\s+)?(?:minus|-)\s*([0-9a-z]+)/gi,
    "$1^{-$2}"
  );
  // "10 to the power of [exp]" or "[base] to the power [exp]"
  str = str.replace(
    /([0-9a-z\)\\]+)\s+to\s+the\s+power\s+(?:of\s+)?([0-9a-z\+\-]+)/gi,
    "$1^{$2}"
  );
  // "[base] raised to (minus)? [exp]"
  str = str.replace(
    /([0-9a-z\)\\]+)\s+raised\s+to\s+(?:minus|-)?\s*([0-9a-z\+\-]+)/gi,
    (_, base, exp) => `$1^{${exp}}`
  );
  // "[base] squared"
  str = str.replace(/([0-9a-z\)\\]+)\s+squared/gi, "$1^2");
  // "[base] cubed"
  str = str.replace(/([0-9a-z\)\\]+)\s+cubed/gi, "$1^3");

  // Trigonometry
  str = str.replace(/sine\s+(?:of\s+)?([a-z0-9]+)/gi, "\\sin $1");
  str = str.replace(/cosine\s+(?:of\s+)?([a-z0-9]+)/gi, "\\cos $1");
  str = str.replace(/tangent\s+(?:of\s+)?([a-z0-9]+)/gi, "\\tan $1");
  str = str.replace(/\bsin\s+([a-z0-9]+)/gi, "\\sin $1");
  str = str.replace(/\bcos\s+([a-z0-9]+)/gi, "\\cos $1");
  str = str.replace(/\btan\s+([a-z0-9]+)/gi, "\\tan $1");
  str = str.replace(/natural\s+log\s+(?:of\s+)?([a-z0-9]+)/gi, "\\ln($1)");
  str = str.replace(/log\s+base\s+([0-9a-z]+)\s+of\s+([a-z0-9]+)/gi, "\\log_{$1}($2)");
  str = str.replace(/log\s+(?:of\s+)?([a-z0-9]+)/gi, "\\log($1)");

  // Standalone "over" quotient: e.g. "sine x over x" -> "\frac{\sin x}{x}" or "1 over 2" -> "\frac{1}{2}"
  str = str.replace(
    /([\\a-z0-9\^\(\)]+(?:\s+[\\a-z0-9\^\(\)]+)?)\s+over\s+([\\a-z0-9\^\(\)]+)/gi,
    (_, num, den) => {
      return `\\frac{${num.trim()}}{${den.trim()}}`;
    }
  );

  // Subscripts: e.g. "x sub 1" -> "x_{1}"
  str = str.replace(/([a-z])\s+sub\s+([0-9a-z\+\-]+)/gi, "$1_{$2}");

  // Operators & Relations (Order is vital to avoid partial matching!)
  str = str.replace(/\bplus\s+minus\b|\bplus\s+or\s+minus\b/gi, "\\pm");
  str = str.replace(/\bnot\s+equal\s+to\b|\bnot\s+equals\b|\bis\s+not\s+equal\s+to\b/gi, "\\neq");
  str = str.replace(/\bgreater\s+than\s+or\s+equal\s+to\b|\bgreater\s+than\s+or\s+equal\b/gi, "\\geq");
  str = str.replace(/\bless\s+than\s+or\s+equal\s+to\b|\bless\s+than\s+or\s+equal\b/gi, "\\leq");
  str = str.replace(/\bapproximately\s+equals?\b|\bapprox\s+equals?\b/gi, "\\approx");
  str = str.replace(/\bgreater\s+than\b/gi, ">");
  str = str.replace(/\bless\s+than\b/gi, "<");
  str = str.replace(/\bequals\b|\bequal\s+to\b|\bis\s+equal\s+to\b/gi, "=");
  str = str.replace(/\bplus\b/gi, "+");
  str = str.replace(/\bminus\b/gi, "-");
  str = str.replace(/\btimes\b|\bmultiplied\s+by\b/gi, "\\times");
  str = str.replace(/\bdivided\s+by\b/gi, "\\div");
  str = str.replace(/\binfinity\b/gi, "\\infty");

  return str;
}
