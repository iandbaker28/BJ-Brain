import { useState, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";

export function useRAGStream() {
  const { getToken } = useAuth();
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | thinking | streaming | done | error
  const abortRef = useRef(null);

  const query = useCallback(async (q) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAnswer("");
    setSources([]);
    setStatus("thinking");

    try {
      const token = getToken();
      const res = await fetch(`/api/ai/query?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 429) {
          setAnswer("AI search rate limit reached. Please wait a moment before trying again.");
          setStatus("error");
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      setStatus("streaming");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === "token") {
              setAnswer((prev) => prev + event.content);
            } else if (event.type === "done") {
              setSources(event.sources || []);
              setStatus("done");
            } else if (event.type === "error") {
              setAnswer(event.content || "An error occurred.");
              setStatus("error");
            }
          } catch {
            /* ignore malformed SSE */
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setAnswer("AI search is currently unavailable.");
      setStatus("error");
    }
  }, [getToken]);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      setStatus("idle");
    }
  }, []);

  const reset = useCallback(() => {
    cancel();
    setAnswer("");
    setSources([]);
    setStatus("idle");
  }, [cancel]);

  return { answer, sources, status, query, cancel, reset };
}
