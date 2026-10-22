"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookmarkIcon, TrashIcon } from "@/components/Icons";
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

  if (!items) return <PageLoader label="Loading My List" />;

  return (
    <main className="history-page wishlist-page">

      <header className="history-header">
        <div>
          <p className="eyebrow">Your watch queue</p>
          <h1>My List</h1>
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
        <section className="history-content" aria-labelledby="my-list-title">
          <div className="history-list-heading">
            <div>
              <p className="eyebrow">Saved for later</p>
              <h2 id="my-list-title">Your picks</h2>
            </div>
            <span>{items.length} {items.length === 1 ? "title" : "titles"}</span>
          </div>
          <div className="movie-grid history-grid">
            {items.map((item, index) => (
              <MovieCard
                movie={item}
                onRemove={() => removeWishlist(item)}
                removeActionLabel="My List"
                key={movieKey(item, index)}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="history-empty wishlist-empty" aria-live="polite">
          <BookmarkIcon />
          <h2>Your list is empty</h2>
          <p>Use the bookmark on any title to save it to My List.</p>
          <Link className="primary-button" href="/movies/">Browse titles</Link>
        </section>
      )}
    </main>
  );
}
