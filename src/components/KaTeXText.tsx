import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface Segment {
  type: "text" | "inline-math" | "block-math" | "code-block" | "inline-code";
  content: string;
  language?: string;
}

// Function to split raw text into LaTeX blocks, code blocks, inline snippets and text formulas
function parseTextWithMathAndCode(text: string): Segment[] {
  const segments: Segment[] = [];
  if (!text) return segments;

  // Split on markdown code blocks ```...```, school math blocks $$...$$, inline math $...$, and backtick inline code `...`
  const regex = /(\s*```[a-zA-Z0-9_-]*[\s\S]*?```\s*|\s*\$\$[\s\S]*?\$\$\s*|\$.*?\$|`.*?`)/g;
  const parts = text.split(regex);

  for (const part of parts) {
    if (!part) continue;

    if (part.trim().startsWith("```")) {
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
    } else if (part.trim().startsWith("$$")) {
      const match = part.match(/^\s*\$\$([\s\S]*?)\$\$\s*$/);
      if (match) {
        segments.push({ type: "block-math", content: match[1].trim() });
      } else {
        segments.push({ type: "block-math", content: part.replace(/\$\$/g, "").trim() });
      }
    } else if (part.startsWith("$") && part.endsWith("$")) {
      const match = part.match(/^\$(.*?)\$/);
      if (match) {
        segments.push({ type: "inline-math", content: match[1].trim() });
      } else {
        segments.push({ type: "inline-math", content: part.replace(/\$/g, "").trim() });
      }
    } else if (part.startsWith("`") && part.endsWith("`")) {
      const match = part.match(/^`(.*?)`/);
      if (match) {
        segments.push({ type: "inline-code", content: match[1].trim() });
      } else {
        segments.push({ type: "inline-code", content: part.replace(/`/g, "").trim() });
      }
    } else {
      segments.push({ type: "text", content: part });
    }
  }

  return segments;
}

// Parse chemical symbols like H2O, CO2, H2SO4, C6H12O6 to subscript nodes
function renderChemicals(text: string): React.ReactNode[] {
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
          <React.Fragment key={i}>
            {element}
            <sub className="select-none font-medium" style={{ fontSize: "0.75em", bottom: "-0.15em", position: "relative" }}>{exponent}</sub>
          </React.Fragment>
        );
      }
    }
    return part;
  });
}

function renderInlineMarkdownAndChemicals(text: string): React.ReactNode[] {
  // Split on bold (**text**) and italic (*text*) markers
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  
  return parts.flatMap((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2);
      return (
        <strong key={i} style={{ fontWeight: 800, color: "#1c1917" }}>
          {renderChemicals(inner)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      const inner = part.slice(1, -1);
      return (
        <em key={i} style={{ fontStyle: "italic", color: "#1c1917" }}>
          {renderChemicals(inner)}
        </em>
      );
    }
    return renderChemicals(part);
  });
}

function renderTextWithMarkdownAndChemicals(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split("\n");
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {lines.map((line, i) => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith("### ")) {
          return (
            <h3 key={i} style={{ fontSize: "1.15em", fontWeight: "bold", color: "#1c1917", marginTop: "12px", marginBottom: "6px", fontFamily: "sans-serif" }}>
              {renderInlineMarkdownAndChemicals(trimmedLine.slice(4))}
            </h3>
          );
        }
        if (trimmedLine.startsWith("## ")) {
          return (
            <h2 key={i} style={{ fontSize: "1.3em", fontWeight: "bold", color: "#1c1917", marginTop: "16px", marginBottom: "6px", fontFamily: "sans-serif" }}>
              {renderInlineMarkdownAndChemicals(trimmedLine.slice(3))}
            </h2>
          );
        }
        if (trimmedLine.startsWith("# ")) {
          return (
            <h1 key={i} style={{ fontSize: "1.5em", fontWeight: "900", color: "#1c1917", marginTop: "20px", marginBottom: "8px", fontFamily: "sans-serif" }}>
              {renderInlineMarkdownAndChemicals(trimmedLine.slice(2))}
            </h1>
          );
        }
        if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
          return (
            <div key={i} style={{ display: "flex", alignItems: "start", gap: "8px", paddingLeft: "16px", margin: "2px 0" }}>
              <span style={{ color: "#2563eb", fontWeight: "bold", userSelect: "none" }}>•</span>
              <div style={{ flex: 1, color: "#44403c" }}>
                {renderInlineMarkdownAndChemicals(trimmedLine.slice(2))}
              </div>
            </div>
          );
        }
        
        const numericListMatch = trimmedLine.match(/^(\d+)\.\s(.*)$/);
        if (numericListMatch) {
          const [, num, content] = numericListMatch;
          return (
            <div key={i} style={{ display: "flex", alignItems: "start", gap: "8px", paddingLeft: "16px", margin: "2px 0" }}>
              <span style={{ color: "#2563eb", fontWeight: "bold", userSelect: "none" }}>{num}.</span>
              <div style={{ flex: 1, color: "#44403c" }}>
                {renderInlineMarkdownAndChemicals(content)}
              </div>
            </div>
          );
        }
        
        if (!line) {
          return <div key={i} style={{ height: "6px" }} />;
        }
        
        return (
          <p key={i} style={{ fontSize: "1em", color: "#44403c", lineHeight: "1.6", margin: "2px 0", fontFamily: "sans-serif" }}>
            {renderInlineMarkdownAndChemicals(line)}
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
            <div key={index} style={{ marginTop: "16px", marginBottom: "16px", overflowX: "auto", borderRadius: "12px", border: "1px solid #e7e5e4", backgroundColor: "#1c1917", color: "#f3f4f6", padding: "16px", fontFamily: "monospace", fontSize: "0.9em", position: "relative", lineHeight: "1.5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7em", color: "#a8a29e", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em", paddingBottom: "6px", marginBottom: "10px", borderBottom: "1px solid #44403c" }}>
                <span>{segment.language || "programming code"}</span>
                <span style={{ color: "#34d399", fontFamily: "monospace", fontSize: "0.65em", backgroundColor: "rgba(6, 78, 59, 0.4)", padding: "2px 6px", borderRadius: "4px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>Verified Code</span>
              </div>
              <pre style={{ whiteSpace: "pre", overflowX: "auto", userSelect: "all", color: "#f8f8f2", fontFamily: "monospace", lineHeight: "1.5" }}>{segment.content}</pre>
            </div>
          );
        } else if (segment.type === "inline-code") {
          return (
            <code key={index} style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "#fef3c7", color: "#b45309", fontFamily: "monospace", fontSize: "0.9em", border: "1px solid #fde68a", fontWeight: 600, display: "inline-block" }}>
              {segment.content}
            </code>
          );
        } else if (segment.type === "block-math") {
          try {
            const html = katex.renderToString(segment.content, {
              displayMode: true,
              throwOnError: false,
            });
            return (
              <div
                key={index}
                style={{ marginTop: "16px", marginBottom: "16px", overflowX: "auto", paddingTop: "12px", paddingBottom: "12px", paddingLeft: "16px", paddingRight: "16px", backgroundColor: "#faf9f6", border: "1px solid #e7e5e4", borderRadius: "8px", textAlign: "center" }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            return (
              <div key={index} style={{ color: "#ef4444", fontFamily: "monospace", marginTop: "8px", marginBottom: "8px", textAlign: "center", fontSize: "1em", backgroundColor: "#fef2f2", padding: "8px", borderRadius: "6px" }}>
                 {segment.content} 
              </div>
            );
          }
        } else if (segment.type === "inline-math") {
          try {
            const html = katex.renderToString(segment.content, {
              displayMode: false,
              throwOnError: false,
            });
            return (
              <span
                key={index}
                style={{ display: "inline-block", paddingLeft: "4px", paddingRight: "4px", fontWeight: 600, color: "#0f172a", verticalAlign: "baseline" }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            return (
              <code key={index} style={{ color: "#ef4444", backgroundColor: "#fef2f2", paddingLeft: "4px", paddingRight: "4px", borderRadius: "4px", fontFamily: "monospace", fontSize: "1em" }}>
                ${segment.content}$
              </code>
            );
          }
        } else {
          return <React.Fragment key={index}>{renderTextWithMarkdownAndChemicals(segment.content)}</React.Fragment>;
        }
      })}
    </div>
  );
}
