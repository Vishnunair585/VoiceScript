import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { spokenMathToLaTeX, isLikelyMathExpression } from "../lib/mathVoice";

interface Segment {
  type: "text" | "inline-math" | "block-math" | "code-block" | "inline-code";
  content: string;
  language?: string;
}

// Function to split raw text into LaTeX blocks, code blocks, inline snippets and text formulas
function parseTextWithMathAndCode(text: string): Segment[] {
  const segments: Segment[] = [];
  if (!text) return segments;

  // Split on markdown code blocks ```...```, school math blocks $$...$$, LaTeX \[...\], inline math $...$, LaTeX \(...\), and backtick inline code `...`
  const regex = /(\s*```[a-zA-Z0-9_-]*[\s\S]*?```\s*|\s*\$\$[\s\S]*?\$\$\s*|\s*\\\[[\s\S]*?\\\]\s*|\$[^\$\n]+?\$|\\\([^\)\n]+?\\\)|\s*`.*?`)/g;
  const parts = text.split(regex);

  for (const part of parts) {
    if (!part) continue;

    const trimmedPart = part.trim();

    if (trimmedPart.startsWith("```")) {
      const match = part.match(/^\s*```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```\s*$/);
      if (match) {
        segments.push({
          type: "code-block",
          content: match[2].trim(),
          language: match[1]?.trim() || "code",
        });
      } else {
        segments.push({
          type: "code-block",
          content: part.replace(/```/g, "").trim(),
          language: "code",
        });
      }
    } else if (trimmedPart.startsWith("$$") && trimmedPart.endsWith("$$")) {
      let content = trimmedPart.slice(2, -2).trim();
      // If content is purely spoken words without LaTeX syntax, convert to LaTeX
      if (!/[\\_{}^]/.test(content) && isLikelyMathExpression(content)) {
        content = spokenMathToLaTeX(content).latex || content;
      }
      segments.push({ type: "block-math", content });
    } else if (trimmedPart.startsWith("\\[") && trimmedPart.endsWith("\\]")) {
      let content = trimmedPart.slice(2, -2).trim();
      if (!/[\\_{}^]/.test(content) && isLikelyMathExpression(content)) {
        content = spokenMathToLaTeX(content).latex || content;
      }
      segments.push({ type: "block-math", content });
    } else if (trimmedPart.startsWith("$") && trimmedPart.endsWith("$") && trimmedPart.length > 2) {
      let content = trimmedPart.slice(1, -1).trim();
      if (!/[\\_{}^]/.test(content) && isLikelyMathExpression(content)) {
        content = spokenMathToLaTeX(content).latex || content;
      }
      segments.push({ type: "inline-math", content });
    } else if (trimmedPart.startsWith("\\(") && trimmedPart.endsWith("\\)") && trimmedPart.length > 4) {
      let content = trimmedPart.slice(2, -2).trim();
      if (!/[\\_{}^]/.test(content) && isLikelyMathExpression(content)) {
        content = spokenMathToLaTeX(content).latex || content;
      }
      segments.push({ type: "inline-math", content });
    } else if (trimmedPart.startsWith("`") && trimmedPart.endsWith("`")) {
      const match = trimmedPart.match(/^`(.*?)`/);
      if (match) {
        segments.push({ type: "inline-code", content: match[1].trim() });
      } else {
        segments.push({ type: "inline-code", content: trimmedPart.replace(/`/g, "").trim() });
      }
    } else {
      // Check lines inside text segment for standalone LaTeX or spoken math formulas
      const lines = part.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Check if the entire line is a mathematical or scientific equation
        const isLatexCommand = /^\\(?:frac|sqrt|int|sum|lim|alpha|beta|gamma|theta|pi|lambda|Omega|Delta|pm|times|div|neq|geq|leq|approx|infty|sin|cos|tan|ln|log|cdot|text|longrightarrow|quad)/.test(trimmed);
        const isEquationPattern = /^(?:[a-zA-Z]\s*=\s*[^.?!]+|[0-9a-zA-Z^_{}\\]+\s*=\s*[0-9a-zA-Z^_{}\\]+)$/.test(trimmed) && /[0-9a-zA-Z^_{}\\]+/.test(trimmed);
        const isSpokenMath = isLikelyMathExpression(trimmed);

        if (trimmed && (isLatexCommand || isEquationPattern || isSpokenMath)) {
          let mathContent = trimmed;
          if (!isLatexCommand && !/[\\_{}^]/.test(trimmed)) {
            const converted = spokenMathToLaTeX(trimmed);
            if (converted.latex) {
              mathContent = converted.latex;
            }
          }
          segments.push({ type: "block-math", content: mathContent });
          continue;
        }

        segments.push({ type: "text", content: line + (i < lines.length - 1 ? "\n" : "") });
      }
    }
  }

  return segments;
}

// Parse chemical symbols like H2O, CO2, H2SO4, C6H12O6 to subscript nodes
function renderChemicals(text: string, keyPrefix = "chem"): React.ReactNode[] {
  if (!text) return [];

  // Match standard element capitalizations followed by numbers, e.g., H2, SO4, C6, H12, O6
  const parts = text.split(/([A-Z][a-z]?\d+)/g);
  return parts.map((part, i) => {
    const isFormulaSegment = /^[A-Z][a-z]?\d+$/.test(part);
    if (isFormulaSegment) {
      const match = part.match(/^([A-Z][a-z]?)(\d+)$/);
      if (match) {
        const [, element, exponent] = match;
        return (
          <React.Fragment key={`${keyPrefix}-chem-${i}`}>
            {element}
            <sub className="select-none font-medium" style={{ fontSize: "0.75em", bottom: "-0.15em", position: "relative" }}>{exponent}</sub>
          </React.Fragment>
        );
      }
    }
    return <React.Fragment key={`${keyPrefix}-txt-${i}`}>{part}</React.Fragment>;
  });
}

// Render inline content handling both inline math $...$ and chemical notations
function renderInlineContent(text: string, keyPrefix = "inline"): React.ReactNode[] {
  if (!text) return [];
  // Split on inline math $...$
  const mathParts = text.split(/(\$[^\$\n]+?\$)/g);
  return mathParts.map((subPart, j) => {
    if (subPart.startsWith("$") && subPart.endsWith("$") && subPart.length > 2) {
      const mathExpr = subPart.slice(1, -1).trim();
      try {
        const html = katex.renderToString(mathExpr, { displayMode: false, throwOnError: false });
        return (
          <span
            key={`${keyPrefix}-imath-${j}`}
            style={{ display: "inline-block", paddingLeft: "3px", paddingRight: "3px", fontWeight: 600, verticalAlign: "baseline" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        return <code key={`${keyPrefix}-imath-err-${j}`} style={{ color: "#ef4444" }}>{subPart}</code>;
      }
    }
    return <React.Fragment key={`${keyPrefix}-chemgrp-${j}`}>{renderChemicals(subPart, `${keyPrefix}-${j}`)}</React.Fragment>;
  });
}

function renderInlineMarkdownAndChemicals(text: string, linePrefix = "md"): React.ReactNode[] {
  // Split on bold (**text**) and italic (*text*) markers
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  
  return parts.flatMap((part, i) => {
    const partKey = `${linePrefix}-p-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2);
      return (
        <strong key={`${partKey}-strong`} style={{ fontWeight: 800, color: "#1c1917" }}>
          {renderInlineContent(inner, `${partKey}-strong`)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      const inner = part.slice(1, -1);
      return (
        <em key={`${partKey}-em`} style={{ fontStyle: "italic", color: "#1c1917" }}>
          {renderInlineContent(inner, `${partKey}-em`)}
        </em>
      );
    }
    return renderInlineContent(part, partKey);
  });
}

function renderTextWithMarkdownAndChemicals(text: string, blockPrefix = "block"): React.ReactNode {
  if (!text) return null;
  const lines = text.split("\n");
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {lines.map((line, i) => {
        const lineKey = `${blockPrefix}-l-${i}`;
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith("### ")) {
          return (
            <h3 key={lineKey} style={{ fontSize: "1.15em", fontWeight: "bold", color: "#1c1917", marginTop: "12px", marginBottom: "6px", fontFamily: "sans-serif" }}>
              {renderInlineMarkdownAndChemicals(trimmedLine.slice(4), lineKey)}
            </h3>
          );
        }
        if (trimmedLine.startsWith("## ")) {
          return (
            <h2 key={lineKey} style={{ fontSize: "1.3em", fontWeight: "bold", color: "#1c1917", marginTop: "16px", marginBottom: "6px", fontFamily: "sans-serif" }}>
              {renderInlineMarkdownAndChemicals(trimmedLine.slice(3), lineKey)}
            </h2>
          );
        }
        if (trimmedLine.startsWith("# ")) {
          return (
            <h1 key={lineKey} style={{ fontSize: "1.5em", fontWeight: "900", color: "#1c1917", marginTop: "20px", marginBottom: "8px", fontFamily: "sans-serif" }}>
              {renderInlineMarkdownAndChemicals(trimmedLine.slice(2), lineKey)}
            </h1>
          );
        }
        if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
          return (
            <div key={lineKey} style={{ display: "flex", alignItems: "start", gap: "8px", paddingLeft: "16px", margin: "2px 0" }}>
              <span style={{ color: "#2563eb", fontWeight: "bold", userSelect: "none" }}>•</span>
              <div style={{ flex: 1, color: "#44403c" }}>
                {renderInlineMarkdownAndChemicals(trimmedLine.slice(2), lineKey)}
              </div>
            </div>
          );
        }
        
        const numericListMatch = trimmedLine.match(/^(\d+)\.\s(.*)$/);
        if (numericListMatch) {
          const [, num, content] = numericListMatch;
          return (
            <div key={lineKey} style={{ display: "flex", alignItems: "start", gap: "8px", paddingLeft: "16px", margin: "2px 0" }}>
              <span style={{ color: "#2563eb", fontWeight: "bold", userSelect: "none" }}>{num}.</span>
              <div style={{ flex: 1, color: "#44403c" }}>
                {renderInlineMarkdownAndChemicals(content, lineKey)}
              </div>
            </div>
          );
        }
        
        if (!line) {
          return <div key={lineKey} style={{ height: "6px" }} />;
        }
        
        return (
          <p key={lineKey} style={{ fontSize: "1em", color: "#44403c", lineHeight: "1.6", margin: "2px 0", fontFamily: "sans-serif" }}>
            {renderInlineMarkdownAndChemicals(line, lineKey)}
          </p>
        );
      })}
    </div>
  );
}

export function KaTeXText({ text }: { text: string }) {
  const segments = React.useMemo(() => parseTextWithMathAndCode(text), [text]);

  return (
    <div style={{ whiteSpace: "pre-wrap", display: "flex", flexDirection: "column", gap: "12px", fontFamily: "sans-serif", color: "#44403c" }}>
      {segments.map((segment, index) => {
        if (segment.type === "code-block") {
          return (
            <div key={`seg-code-${index}`} style={{ marginTop: "16px", marginBottom: "16px", overflowX: "auto", borderRadius: "12px", border: "1px solid #e7e5e4", backgroundColor: "#1c1917", color: "#f3f4f6", padding: "16px", fontFamily: "monospace", fontSize: "0.9em", position: "relative", lineHeight: "1.5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7em", color: "#a8a29e", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em", paddingBottom: "6px", marginBottom: "10px", borderBottom: "1px solid #44403c" }}>
                <span>{segment.language || "programming code"}</span>
                <span style={{ color: "#34d399", fontFamily: "monospace", fontSize: "0.65em", backgroundColor: "rgba(6, 78, 59, 0.4)", padding: "2px 6px", borderRadius: "4px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>Verified Code</span>
              </div>
              <pre style={{ whiteSpace: "pre", overflowX: "auto", userSelect: "all", color: "#f8f8f2", fontFamily: "monospace", lineHeight: "1.5" }}>{segment.content}</pre>
            </div>
          );
        } else if (segment.type === "inline-code") {
          return (
            <code key={`seg-icode-${index}`} style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "#fef3c7", color: "#b45309", fontFamily: "monospace", fontSize: "0.9em", border: "1px solid #fde68a", fontWeight: 600, display: "inline-block" }}>
              {segment.content}
            </code>
          );
        } else if (segment.type === "block-math") {
          if (!segment.content.trim()) return null;
          try {
            const html = katex.renderToString(segment.content, {
              displayMode: true,
              throwOnError: false,
            });
            return (
              <div
                key={`seg-bmath-${index}`}
                style={{ marginTop: "16px", marginBottom: "16px", overflowX: "auto", paddingTop: "12px", paddingBottom: "12px", paddingLeft: "16px", paddingRight: "16px", backgroundColor: "#faf9f6", border: "1px solid #e7e5e4", borderRadius: "8px", textAlign: "center" }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            return (
              <div key={`seg-bmath-err-${index}`} style={{ color: "#ef4444", fontFamily: "monospace", marginTop: "8px", marginBottom: "8px", textAlign: "center", fontSize: "1em", backgroundColor: "#fef2f2", padding: "8px", borderRadius: "6px" }}>
                 {segment.content} 
              </div>
            );
          }
        } else if (segment.type === "inline-math") {
          if (!segment.content.trim()) return null;
          try {
            const html = katex.renderToString(segment.content, {
              displayMode: false,
              throwOnError: false,
            });
            return (
              <span
                key={`seg-imath-${index}`}
                style={{ display: "inline-block", paddingLeft: "4px", paddingRight: "4px", fontWeight: 600, color: "#0f172a", verticalAlign: "baseline" }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            return (
              <code key={`seg-imath-err-${index}`} style={{ color: "#ef4444", backgroundColor: "#fef2f2", paddingLeft: "4px", paddingRight: "4px", borderRadius: "4px", fontFamily: "monospace", fontSize: "1em" }}>
                ${segment.content}$
              </code>
            );
          }
        } else {
          return <div key={`seg-txt-${index}`}>{renderTextWithMarkdownAndChemicals(segment.content, `seg-${index}`)}</div>;
        }
      })}
    </div>
  );
}
