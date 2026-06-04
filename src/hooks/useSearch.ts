import { useState, useRef, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useSearch() {
  const [answer, setAnswer]     = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const ask = useCallback(async (
    message: string,
    history: ChatMessage[] = [],
    ticker?: string,
  ) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setSearching(true);
    setAnswer("");
    setError(null);

    try {
      const resp = await fetch(`${API_BASE}/api/v1/search/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, ticker: ticker || null }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      if (!resp.body) throw new Error("No response body");

      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const chunk = line.slice(6);
          if (chunk === "[DONE]") { setSearching(false); return; }
          if (chunk.startsWith("[Error:")) { setError(chunk); break; }
          setAnswer(prev => prev + chunk.replace(/\\n/g, "\n"));
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e?.message ?? "Search failed");
    } finally {
      setSearching(false);
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setSearching(false);
  }, []);

  const reset = useCallback(() => {
    setAnswer("");
    setError(null);
  }, []);

  return { answer, searching, error, ask, stop, reset };
}
