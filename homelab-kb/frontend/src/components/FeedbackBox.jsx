import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function FeedbackBox({ articleId }) {
  const { authFetch } = useAuth();
  const [step, setStep] = useState("prompt"); // prompt | comment | done
  const [helpful, setHelpful] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleVote = (val) => {
    setHelpful(val);
    setStep("comment");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authFetch(`/api/articles/${articleId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpful, comment: comment.trim() || null }),
      });
      setStep("done");
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <div className="mt-8 pt-6 border-t border-border text-center text-text-muted text-sm">
        Thanks for your feedback!
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <p className="text-sm text-text-secondary mb-3">Was this article helpful?</p>
      {step === "prompt" && (
        <div className="flex gap-3">
          <button
            onClick={() => handleVote(true)}
            className="btn-secondary text-green-400 border-green-900/50 hover:bg-green-900/20"
          >
            👍 Yes
          </button>
          <button
            onClick={() => handleVote(false)}
            className="btn-secondary text-red-400 border-red-900/50 hover:bg-red-900/20"
          >
            👎 No
          </button>
        </div>
      )}
      {step === "comment" && (
        <form onSubmit={handleSubmit} className="space-y-3 max-w-lg">
          <p className="text-sm text-text-muted">
            {helpful ? "Great! Any additional comments?" : "Sorry to hear that. What could be improved?"}
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            rows={3}
            className="input resize-none"
            placeholder="Optional comment..."
          />
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Submitting..." : "Submit"}
            </button>
            <button type="button" onClick={() => setStep("done")} className="btn-secondary">
              Skip
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
