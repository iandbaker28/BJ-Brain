import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import TipTapEditor from "../components/Editor/TipTapEditor";

const CATEGORIES = [
  "General", "Networking", "Storage", "Compute", "Security",
  "Monitoring", "Containers", "Databases", "Backups", "Services",
];

export default function ArticleEditor() {
  const { id } = useParams(); // undefined for new article
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const isNew = !id;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [body, setBody] = useState("");
  const [isPublished, setIsPublished] = useState(1);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew) return;
    authFetch(`/api/articles/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Article not found");
        return r.json();
      })
      .then((a) => {
        setTitle(a.title);
        setCategory(a.category);
        setBody(a.body);
        setIsPublished(a.is_published);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        body,
        category,
        is_published: isPublished,
      };
      const res = await authFetch(
        isNew ? "/api/articles" : `/api/articles/${id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Save failed");
      }
      const saved = await res.json();
      navigate(`/articles/${saved.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-text-muted animate-pulse">Loading article...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-text-primary">
          {isNew ? "New Article" : "Edit Article"}
        </h1>
        <Link to={isNew ? "/" : `/articles/${id}`} className="btn-secondary text-sm py-1.5">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
              className="input text-base"
              maxLength={512}
              required
              autoFocus
            />
          </div>
          <div className="w-48">
            <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Content</label>
          <TipTapEditor content={body} onChange={setBody} editable={true} />
        </div>

        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPublished === 1}
              onChange={(e) => setIsPublished(e.target.checked ? 1 : 0)}
              className="rounded border-border"
            />
            <span className="text-sm text-text-secondary">Published</span>
          </label>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving..." : isNew ? "Create Article" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
