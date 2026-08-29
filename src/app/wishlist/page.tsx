"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BackIcon, BookmarkIcon, TrashIcon } from "@/components/Icons";
import { MovieCard, movieKey } from "@/components/MovieCard";
import { PageLoader } from "@/components/Loading";
import { clearWishlist, readWishlist, removeWishlist } from "@/lib/storage";
import type { WishlistItem } from "@/lib/types";

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[] | null>(null);

  const refresh = useCallback(() => {
    setItems(readWishlist());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("nova:wishlist-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("nova:wishlist-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  if (!items) return <PageLoader label="Loading wishlist" />;

  return (
    <main className="history-page wishlist-page">
      <div className="history-atmosphere wishlist-atmosphere" aria-hidden="true">
        <span className="history-frame history-frame-one" />
        <span className="history-frame history-frame-two" />
        <span className="history-orbit history-orbit-one" />
        <span className="history-orbit history-orbit-two" />
        <span className="wishlist-beam wishlist-beam-one" />
        <span className="wishlist-beam wishlist-beam-two" />
        <span className="wishlist-ring wishlist-ring-one" />
        <span className="wishlist-ring wishlist-ring-two" />
        <span className="wishlist-particles" />
      </div>

      <Link className="back-link history-back" href="/">
        <BackIcon /> Back to home
      </Link>

      <header className="history-header">
        <div>
          <p className="eyebrow">Your watch queue</p>
          <h1>Wishlist</h1>
          <p>Save films, series, and anime you want to come back to.</p>
        </div>
        <button
          className="history-clear"
          type="button"
          onClick={() => {
            clearWishlist();
            refresh();
          }}
          disabled={!items.length}
        >
          <TrashIcon /> Clear all
        </button>
      </header>

      {items.length ? (
        <section className="history-content" aria-labelledby="wishlist-list-title">
          <div className="history-list-heading">
            <div>
              <p className="eyebrow">Saved for later</p>
              <h2 id="wishlist-list-title">Your picks</h2>
            </div>
            <span>{items.length} {items.length === 1 ? "title" : "titles"}</span>
          </div>
          <div className="movie-grid history-grid">
            {items.map((item, index) => (
              <MovieCard
                movie={item}
                onRemove={() => removeWishlist(item)}
                removeActionLabel="Wishlist"
                key={movieKey(item, index)}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="history-empty wishlist-empty" aria-live="polite">
          <BookmarkIcon />
          <h2>Your wishlist is empty</h2>
          <p>Use the bookmark on any title to save it here for later.</p>
          <Link className="primary-button" href="/movies/">Browse titles</Link>
        </section>
      )}
    </main>
  );
}
