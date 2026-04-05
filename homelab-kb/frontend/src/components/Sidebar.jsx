import React, { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Sidebar({ isOpen, onClose }) {
  const { authFetch } = useAuth();
  const { id } = useParams();
  const location = useLocation();
  const [articles, setArticles] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/articles")
      .then((r) => r.json())
      .then((data) => {
        setArticles(Array.isArray(data) ? data : []);
      })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [location.pathname]);

  const byCategory = articles.reduce((acc, art) => {
    const cat = art.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(art);
    return acc;
  }, {});

  const toggleCategory = (cat) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 lg:z-auto
          w-64 bg-surface-1 border-r border-border
          flex flex-col overflow-hidden
          transition-transform duration-200
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border lg:hidden">
          <span className="text-sm font-medium text-text-secondary">Navigation</span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {loading ? (
            <div className="px-3 text-text-muted text-sm animate-pulse">Loading...</div>
          ) : Object.keys(byCategory).length === 0 ? (
            <div className="px-3 text-text-muted text-sm">No articles yet</div>
          ) : (
            Object.entries(byCategory)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([cat, arts]) => (
                <div key={cat} className="mb-2">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider hover:text-text-secondary transition-colors"
                  >
                    <span>{cat}</span>
                    <span className="text-[10px]">{collapsed[cat] ? "▶" : "▼"}</span>
                  </button>
                  {!collapsed[cat] && (
                    <ul className="mt-1 space-y-0.5">
                      {arts.map((art) => (
                        <li key={art.id}>
                          <Link
                            to={`/articles/${art.id}`}
                            onClick={onClose}
                            className={`
                              block px-3 py-1.5 rounded text-sm transition-colors truncate
                              ${String(art.id) === String(id)
                                ? "bg-accent/20 text-accent-hover border-l-2 border-accent pl-[10px]"
                                : "text-text-secondary hover:bg-surface-3 hover:text-text-primary"}
                            `}
                            title={art.title}
                          >
                            {art.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
          )}
        </nav>

        <div className="px-2 py-3 border-t border-border">
          <Link
            to="/articles/new"
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded text-sm text-accent hover:bg-surface-3 transition-colors"
          >
            <span>+</span>
            <span>New Article</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
