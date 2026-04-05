import React from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

// Markdown component overrides — styled to match the dark theme
const mdComponents = {
  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
  h1: ({ children }) => <h1 className="text-lg font-semibold mt-4 mb-2 text-text-primary">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-2 text-text-primary">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1 text-text-primary">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ inline, children, ...props }) =>
    inline ? (
      <code className="bg-surface-3 text-accent-hover font-mono text-xs px-1.5 py-0.5 rounded" {...props}>
        {children}
      </code>
    ) : (
      <code className="font-mono text-xs" {...props}>{children}</code>
    ),
  pre: ({ children }) => (
    <pre className="bg-surface-3 border border-border rounded-lg p-3 my-3 overflow-x-auto text-xs font-mono">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-accent-muted pl-3 my-3 text-text-secondary italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-accent-hover underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
  hr: () => <hr className="border-border my-4" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="bg-surface-3 border border-border px-3 py-1.5 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-border px-3 py-1.5">{children}</td>,
};

export default function AIAnswerPanel({ answer, sources, status }) {
  if (status === "idle") return null;

  return (
    <div className="card mb-6 border-accent/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-accent ${status === "thinking" || status === "streaming" ? "animate-pulse" : ""}`}>
            ⬡
          </span>
          <span className="text-sm font-semibold text-text-primary">AI Answer</span>
        </div>
        <span className="text-xs text-text-muted bg-surface-3 px-2 py-0.5 rounded">
          Based on your documentation
        </span>
      </div>

      {status === "thinking" && (
        <div className="flex items-center gap-2 text-text-muted text-sm py-2">
          <span className="animate-pulse">●</span>
          <span className="animate-pulse">Thinking...</span>
        </div>
      )}

      {(status === "streaming" || status === "done" || status === "error") && answer && (
        <div className="text-sm text-text-primary">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={mdComponents}
          >
            {answer}
          </ReactMarkdown>
          {status === "streaming" && (
            <span className="inline-block w-1.5 h-4 bg-accent/70 ml-0.5 animate-pulse align-middle" />
          )}
        </div>
      )}

      {status === "done" && sources.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-text-muted mb-2 font-semibold uppercase tracking-wider">Sources</p>
          <div className="flex flex-wrap gap-2">
            {sources.map((src) => (
              <Link
                key={src.id}
                to={`/articles/${src.id}`}
                className="text-xs bg-surface-3 hover:bg-surface-4 border border-border hover:border-accent/30 rounded px-2 py-1 text-accent-hover transition-colors"
              >
                {src.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
