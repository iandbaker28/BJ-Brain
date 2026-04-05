import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchBar() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1 max-w-xl">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">🔍</span>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search documentation..."
          className="input pl-8 pr-4 py-1.5 text-sm"
        />
      </div>
      <button type="submit" className="btn-primary py-1.5 text-sm">
        Search
      </button>
    </form>
  );
}
