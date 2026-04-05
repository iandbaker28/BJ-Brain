import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { authFetch } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/articles")
      .then((r) => r.json())
      .then((data) => setArticles(Array.isArray(data) ? data : []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  const byCategory = articles.reduce((acc, art) => {
    const cat = art.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(art);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="p-8 text-center text-text-muted animate-pulse">Loading...</div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-xl font-semibold text-text-primary mb-3">Welcome to Homelab KB</h2>
        <p className="text-text-muted mb-6">
          Your personal homelab documentation hub. Start by creating your first article.
        </p>
        <Link to="/articles/new" className="btn-primary">
          + Create First Article
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Documentation</h1>
        <Link to="/articles/new" className="btn-primary text-sm py-1.5">
          + New Article
        </Link>
      </div>

      <div className="space-y-8">
        {Object.entries(byCategory)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([cat, arts]) => (
            <div key={cat}>
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 border-b border-border pb-1">
                {cat}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {arts.map((art) => (
                  <Link
                    key={art.id}
                    to={`/articles/${art.id}`}
                    className={`card hover:border-accent/30 transition-colors group ${!art.is_published ? "border-dashed opacity-70" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-medium text-text-primary group-hover:text-accent-hover transition-colors">
                        {art.title}
                      </h3>
                      {!art.is_published && (
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-border bg-surface-3 text-text-muted leading-none">
                          draft
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">
                      Updated {new Date(art.updated_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric"
                      })}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
