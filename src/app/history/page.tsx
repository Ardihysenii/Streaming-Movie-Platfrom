"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BackIcon, HistoryIcon, TrashIcon } from "@/components/Icons";
import { PageLoader } from "@/components/Loading";
import { MovieCard, movieKey, progressPercentage } from "@/components/MovieCard";
import { clearContinueWatching, readContinueWatching, removeContinueWatching } from "@/lib/storage";
import type { ContinueWatchingItem } from "@/lib/types";

export default function HistoryPage() {
  const [items, setItems] = useState<ContinueWatchingItem[] | null>(null);

  const refresh = useCallback(() => {
    setItems(readContinueWatching());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("nova:continue-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("nova:continue-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  if (!items) return <PageLoader label="Loading history" />;

  return (
    <main className="history-page">
      <div className="history-atmosphere" aria-hidden="true">
        <span className="history-frame history-frame-one" />
        <span className="history-frame history-frame-two" />
        <span className="history-orbit history-orbit-one" />
        <span className="history-orbit history-orbit-two" />
      </div>

      <Link className="back-link history-back" href="/">
        <BackIcon /> Back to home
      </Link>

      <header className="history-header">
        <div>
          <p className="eyebrow">Your playback trail</p>
          <h1>History</h1>
          <p>Every title you started, ready whenever you are.</p>
        </div>
        <button
          className="history-clear"
          type="button"
          onClick={() => {
            clearContinueWatching();
            refresh();
          }}
          disabled={!items.length}
        >
          <TrashIcon /> Clear all
        </button>
      </header>

      {items.length ? (
        <section className="history-content" aria-labelledby="history-list-title">
          <div className="history-list-heading">
            <div>
              <p className="eyebrow">Recently played</p>
              <h2 id="history-list-title">Continue watching</h2>
            </div>
            <span>{items.length} {items.length === 1 ? "title" : "titles"}</span>
          </div>
          <div className="movie-grid history-grid">
            {items.map((item, index) => (
              <MovieCard
                continueWatching
                movie={item}
                onRemove={() => {
                  removeContinueWatching(item.id);
                  refresh();
                }}
                progress={progressPercentage(item)}
                key={movieKey(item, index)}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="history-empty" aria-live="polite">
          <HistoryIcon />
          <h2>Your history is clear</h2>
          <p>Start a movie or episode and it will appear here.</p>
          <Link className="primary-button" href="/movies/">Browse titles</Link>
        </section>
      )}
    </main>
  );
}
