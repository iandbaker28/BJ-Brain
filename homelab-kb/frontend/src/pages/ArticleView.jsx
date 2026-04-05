import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import RoleGuard from "../components/RoleGuard";
import FeedbackBox from "../components/FeedbackBox";

export default function ArticleView() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    authFetch(`/api/articles/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Article not found");
        return r.json();
      })
      .then(setArticle)
      .catch((e) => setError(e.message));
  }, [id]);

  const loadFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const r = await authFetch(`/api/articles/${id}/feedback`);
      if (r.ok) setFeedback(await r.json());
    } catch {/* ignore */}
    setLoadingFeedback(false);
    setShowFeedback(true);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this article? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await authFetch(`/api/articles/${id}`, { method: "DELETE" });
      navigate("/");
    } catch {
      setDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-muted mb-4">{error}</p>
        <Link to="/" className="btn-secondary">← Back to home</Link>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-8 text-center text-text-muted animate-pulse">Loading...</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-text-muted bg-surface-3 px-2 py-0.5 rounded">
              {article.category}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary leading-tight">
            {article.title}
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Updated {new Date(article.updated_at).toLocaleDateString("en-US", {
              year: "numeric", month: "short", day: "numeric"
            })}
          </p>
        </div>
        <RoleGuard role="editor">
          <div className="flex gap-2 flex-shrink-0">
            <Link
              to={`/articles/${id}/edit`}
              className="btn-secondary text-sm py-1.5"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger text-sm py-1.5"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </RoleGuard>
      </div>

      {/* Content */}
      <div
        className="article-content"
        dangerouslySetInnerHTML={{ __html: article.body }}
      />

      {/* Feedback section */}
      <FeedbackBox articleId={id} />

      {/* Feedback viewer for editors */}
      <RoleGuard role="editor">
        <div className="mt-6 pt-4 border-t border-border">
          <button
            onClick={loadFeedback}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            {showFeedback ? "Hide feedback" : "View reader feedback"}
          </button>
          {showFeedback && (
            <div className="mt-4 space-y-2">
              {loadingFeedback ? (
                <p className="text-text-muted text-sm animate-pulse">Loading...</p>
              ) : feedback.length === 0 ? (
                <p className="text-text-muted text-sm">No feedback yet.</p>
              ) : (
                feedback.map((f) => (
                  <div key={f.id} className="card text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={f.helpful ? "text-green-400" : "text-red-400"}>
                        {f.helpful ? "👍 Helpful" : "👎 Not helpful"}
                      </span>
                      <span className="text-text-muted text-xs">
                        {new Date(f.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {f.comment && <p className="text-text-secondary">{f.comment}</p>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </RoleGuard>
    </div>
  );
}
