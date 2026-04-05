import React, { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useRAGStream } from "../hooks/useRAGStream";
import AIAnswerPanel from "../components/AIAnswerPanel";

export default function Search() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [inputVal, setInputVal] = useState(q);
  const { answer, sources, status, query: ragQuery, reset } = useRAGStream();

  useEffect(() => {
    setInputVal(q);
    if (!q.trim()) return;
    setSearching(true);
    setResults([]);
    reset();

    authFetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => setResults(data.results || []))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));

    // Trigger AI query in parallel
    ragQuery(q);
  }, [q]);

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Search documentation..."
          className="input flex-1"
          autoFocus
        />
        <button type="submit" className="btn-primary">Search</button>
      </form>

      {q && (
        <>
          {/* AI Answer Panel */}
          <AIAnswerPanel answer={answer} sources={sources} status={status} />

          {/* Standard search results */}
          <div>
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
              {searching
                ? "Searching..."
                : `Articles (${results.length} result${results.length !== 1 ? "s" : ""})`}
            </h2>

            {searching && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="h-4 bg-surface-3 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-surface-3 rounded w-full mb-1" />
                    <div className="h-3 bg-surface-3 rounded w-4/5" />
                  </div>
                ))}
              </div>
            )}

            {!searching && results.length === 0 && (
              <div className="card text-center py-8">
                <p className="text-text-muted">No articles found for "{q}"</p>
                <p className="text-text-muted text-sm mt-1">
                  Try different search terms or{" "}
                  <Link to="/articles/new" className="text-accent-hover hover:underline">
                    create a new article
                  </Link>
                </p>
              </div>
            )}

            <div className="space-y-3">
              {results.map((r) => (
                <Link
                  key={r.id}
                  to={`/articles/${r.id}`}
                  className="block card hover:border-accent/30 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-hover transition-colors">
                      {r.title}
                    </h3>
                    <span className="text-xs text-text-muted bg-surface-3 px-1.5 py-0.5 rounded flex-shrink-0">
                      {r.category}
                    </span>
                  </div>
                  {r.snippet && (
                    <div
                      className="text-xs text-text-secondary leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: r.snippet }}
                    />
                  )}
                  <p className="text-xs text-text-muted mt-1">
                    Updated {new Date(r.updated_at).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {!q && (
        <div className="text-center py-12 text-text-muted">
          <p className="text-lg mb-2">Search your documentation</p>
          <p className="text-sm">Enter a query above to search articles and get AI-powered answers</p>
        </div>
      )}
    </div>
  );
}
