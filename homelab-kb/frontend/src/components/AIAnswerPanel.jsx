import React from "react";
import { Link } from "react-router-dom";

export default function AIAnswerPanel({ answer, sources, status }) {
  const isVisible = status !== "idle";

  if (!isVisible) return null;

  return (
    <div className="card mb-6 border-accent/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-accent">⬡</span>
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
        <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap font-mono">
          {answer}
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
