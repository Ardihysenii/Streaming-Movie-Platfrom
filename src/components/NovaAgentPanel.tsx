"use client";

import { FormEvent, useState } from "react";
import { CloseIcon, AgentIcon } from "./Icons";
import { MovieGrid } from "./MovieCard";
import type { Movie } from "@/lib/types";

type NovaAgentPanelProps = {
  open: boolean;
  onClose: () => void;
};

type AgentResponse = {
  message?: string;
  results?: Movie[];
  error?: string;
};

const SUGGESTIONS = [
  "Top 10 rated movies",
  "Newest movies",
  "Top 10 TV shows",
  "Popular anime",
  "Top rated action movies",
];

export function NovaAgentPanel({ open, onClose }: NovaAgentPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("Ask me to find movies, TV shows, or anime.");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function submit(value: string) {
    const cleanValue = value.trim();
    if (!cleanValue || loading) return;
    setPrompt(cleanValue);
    setLoading(true);
    setResults([]);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: cleanValue }),
      });
      const data = await response.json() as AgentResponse;
      if (!response.ok) throw new Error(data.error || "The Agent could not load titles.");
      setMessage(data.message || "Here are the titles I found.");
      setResults(data.results || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The Agent could not load titles right now.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(prompt);
  }

  return (
    <div className="agent-layer" role="dialog" aria-modal="true" aria-label="NOVA Agent">
      <button className="agent-backdrop" type="button" aria-label="Close Agent" onClick={onClose} />
      <section className="agent-panel">
        <header className="agent-panel-header">
          <div className="agent-panel-title">
            <span className="agent-panel-icon"><AgentIcon /></span>
            <div>
              <p className="eyebrow">NOVA Agent</p>
              <h2>Find your next watch</h2>
            </div>
          </div>
          <button className="agent-close" type="button" aria-label="Close Agent" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="agent-panel-body">
          <p className="agent-message">{message}</p>
          <div className="agent-suggestions" aria-label="Suggested requests">
            {SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => void submit(suggestion)} disabled={loading}>
                {suggestion}
              </button>
            ))}
          </div>
          {loading ? <p className="agent-loading" role="status">Searching the catalog…</p> : null}
          {results.length ? <MovieGrid movies={results} /> : null}
        </div>

        <form className="agent-form" onSubmit={handleSubmit}>
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask for movies, shows, or anime…"
            aria-label="Ask NOVA Agent"
            maxLength={240}
          />
          <button type="submit" disabled={loading || !prompt.trim()}>Find</button>
        </form>
      </section>
    </div>
  );
}
