/**
 * mathVoice.ts (NEW MODULE)
 * -----------------------------------------------------------------------
 * Heuristic, offline (no network round-trip) converter that turns a spoken
 * mathematical phrase into a LaTeX string suitable for KaTeXText.
 *
 * Triggered by the "insert math <phrase>" voice command. Supports:
 * powers, fractions, square roots, integrals, summations, Greek letters,
 * infinity and the basic arithmetic/relational symbols.
 *
 * This is intentionally a lightweight rule-based pass (not a full parser) —
 * it covers the common single-level phrasings a student is likely to speak
 * and degrades gracefully (falls back to the literal words) for anything
 * it doesn't recognise, rather than producing broken LaTeX.
 * -----------------------------------------------------------------------
 */

const GREEK: Record<string, string> = {
  alpha: "\\alpha", beta: "\\beta", gamma: "\\gamma", delta: "\\delta",
  epsilon: "\\epsilon", theta: "\\theta", lambda: "\\lambda", mu: "\\mu",
  pi: "\\pi", sigma: "\\sigma", phi: "\\phi", omega: "\\omega",
};

function normalizeVariable(token: string): string {
  const t = token.trim().toLowerCase();
  return GREEK[t] || token.trim();
}

/** Converts "x squared" / "x cubed" / "x to the power n" into exponent form. */
function handlePowers(s: string): string {
  s = s.replace(/(\w+)\s+squared/gi, (_m, base) => `${normalizeVariable(base)}^2`);
  s = s.replace(/(\w+)\s+cubed/gi, (_m, base) => `${normalizeVariable(base)}^3`);
  s = s.replace(/(\w+)\s+to the power (?:of )?(\w+)/gi, (_m, base, exp) => `${normalizeVariable(base)}^{${normalizeVariable(exp)}}`);
  return s;
}

/** Converts "square root of X" and "nth root of X" into \sqrt{}. */
function handleRoots(s: string): string {
  s = s.replace(/square root of ([\w\s+\-*/^]+?)(?=$|,|\.| plus | minus | equals )/gi, (_m, inner) => `\\sqrt{${inner.trim()}}`);
  s = s.replace(/cube root of ([\w\s+\-*/^]+?)(?=$|,|\.| plus | minus | equals )/gi, (_m, inner) => `\\sqrt[3]{${inner.trim()}}`);
  return s;
}

/** Converts "A over B" / "A divided by B" into \frac{A}{B}. */
function handleFractions(s: string): string {
  s = s.replace(/([\w^{}\\]+)\s+over\s+([\w^{}\\]+)/gi, (_m, a, b) => `\\frac{${a}}{${b}}`);
  s = s.replace(/([\w^{}\\]+)\s+divided by\s+([\w^{}\\]+)/gi, (_m, a, b) => `\\frac{${a}}{${b}}`);
  return s;
}

/** Converts "integral [from A to B] of X dx" into \int notation. */
function handleIntegrals(s: string): string {
  s = s.replace(
    /integral from ([\w\d]+) to ([\w\d]+) of (.+?) d(\w)/gi,
    (_m, lo, hi, expr, dv) => `\\int_{${lo}}^{${hi}} ${expr.trim()}\\,d${dv}`,
  );
  s = s.replace(
    /integral of (.+?) d(\w)/gi,
    (_m, expr, dv) => `\\int ${expr.trim()}\\,d${dv}`,
  );
  return s;
}

/** Converts "sum from i equals A to B of X" into \sum notation. */
function handleSummations(s: string): string {
  s = s.replace(
    /sum from ([\w\d]+) equals ([\w\d]+) to ([\w\d]+) of (.+)/gi,
    (_m, idx, lo, hi, expr) => `\\sum_{${idx}=${lo}}^{${hi}} ${expr.trim()}`,
  );
  return s;
}

/** Basic operator + relation word-to-symbol substitutions (run last). */
function handleOperators(s: string): string {
  const ops: [RegExp, string][] = [
    [/\bplus or minus\b/gi, "\\pm"],
    [/\bnot equal to\b/gi, "\\neq"],
    [/\bgreater than or equal to\b/gi, "\\geq"],
    [/\bless than or equal to\b/gi, "\\leq"],
    [/\bgreater than\b/gi, ">"],
    [/\bless than\b/gi, "<"],
    [/\bplus\b/gi, "+"],
    [/\bminus\b/gi, "-"],
    [/\btimes\b/gi, "\\times"],
    [/\bmultiplied by\b/gi, "\\times"],
    [/\bdivided by\b/gi, "\\div"],
    [/\bequals\b/gi, "="],
    [/\binfinity\b/gi, "\\infty"],
  ];
  for (const [re, rep] of ops) s = s.replace(re, ` ${rep} `);
  return s.replace(/\s{2,}/g, " ").trim();
}

/**
 * Converts a full spoken math phrase into a LaTeX string wrapped for
 * inline rendering, e.g. "x squared plus 2 x plus 5 equals 0" ->
 * "$x^2 + 2 x + 5 = 0$".
 */
export function spokenMathToLatex(phrase: string): string {
  let s = phrase.trim();
  if (!s) return "";

  s = handleIntegrals(s);
  s = handleSummations(s);
  s = handleRoots(s);
  s = handleFractions(s);
  s = handlePowers(s);
  s = handleOperators(s);

  // Replace any remaining bare Greek-letter words.
  for (const [word, latex] of Object.entries(GREEK)) {
    s = s.replace(new RegExp(`\\b${word}\\b`, "gi"), latex);
  }

  return `$${s.trim()}$`;
}