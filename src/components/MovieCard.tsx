"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BookmarkIcon, StarIcon, TrashIcon } from "./Icons";
import { LoadingSpinner } from "./Loading";
import { imageUrl, releaseYear } from "@/lib/tmdb";
import { isInWishlist, toggleWishlist } from "@/lib/storage";
import type { ContinueWatchingItem, Movie } from "@/lib/types";

type MovieCardProps = {
  movie: Movie;
  rank?: number;
  progress?: number;
  onRemove?: () => void;
  priority?: boolean;
  continueWatching?: boolean;
  removeActionLabel?: string;
};

export function WishlistButton({ movie, className = "" }: { movie: Movie; className?: string }) {
  const [saved, setSaved] = useState(false);
  const identity = `${movie.media_type ?? "movie"}:${movie.tmdb_id ?? movie.id}`;

  useEffect(() => {
    const refresh = () => setSaved(isInWishlist(movie));
    refresh();
    window.addEventListener("nova:wishlist-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("nova:wishlist-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [identity, movie]);

  return (
    <button
      className={`wishlist-toggle${saved ? " is-saved" : ""}${className ? ` ${className}` : ""}`}
      type="button"
      aria-label={saved ? `Remove ${movie.title} from Wishlist` : `Add ${movie.title} to Wishlist`}
      aria-pressed={saved}
      title={saved ? "Remove from Wishlist" : "Add to Wishlist"}
      onClick={() => setSaved(toggleWishlist(movie))}
    >
      <BookmarkIcon />
    </button>
  );
}

export function mediaHref(item: Movie, continueWatching = false) {
  if (item.media_type === "tv") {
    if (item.series_id && item.season_number && item.episode_number) {
      return `/watch/?id=${item.series_id}&type=tv&season=${item.season_number}&episode=${item.episode_number}`;
    }
    return `/series/details/?id=${item.series_id ?? item.tmdb_id ?? item.id}`;
  }
  if (continueWatching) {
    return `/watch/?id=${item.tmdb_id ?? item.id}&type=movie`;
  }
  return `/movie/?id=${item.tmdb_id ?? item.id}`;
}

// Movie and TV namespaces can reuse the same numeric ID, and recommendation
// responses may contain duplicate entries. Keep React keys unique without
// changing the rendered content or its order.
export function movieKey(movie: Movie, index: number) {
  const type = movie.media_type ?? "movie";
  const identity = movie.tmdb_id ?? movie.id;
  return `${type}:${identity}:${index}`;
}

export function MovieCard({ movie, rank, progress, onRemove, priority = false, continueWatching = false, removeActionLabel = "Continue Watching" }: MovieCardProps) {
  const [loaded, setLoaded] = useState(false);
  const rankLabel = rank ? rank.toString() : null;
  const href = mediaHref(movie, continueWatching);

  return (
    <article className={`movie-card${rankLabel ? " is-ranked" : ""}`}>
      {rankLabel ? <span className="rank-number">{rankLabel}</span> : null}
      <div className="movie-card-body">
        <Link href={href} aria-label={`View ${movie.title}`} className="poster-link">
          {!loaded ? (
            <span className="poster-loader">
              <LoadingSpinner label={`Loading ${movie.title} artwork`} />
            </span>
          ) : null}
          <span className={`poster-image${loaded ? " is-loaded" : ""}`}>
            <Image
              src={imageUrl(movie.poster_path, "w500")}
              alt={`${movie.title} poster`}
              fill
              sizes="(max-width: 600px) 42vw, (max-width: 1100px) 25vw, 220px"
              priority={priority}
              onLoad={() => setLoaded(true)}
            />
          </span>
          <span className="poster-sheen" />
          {typeof progress === "number" ? (
            <span className="watch-progress" aria-label={`${Math.round(progress)} percent watched`}>
              <i style={{ width: `${Math.min(100, Math.max(2, progress))}%` }} />
            </span>
          ) : null}
        </Link>
        <WishlistButton movie={movie} />
        <div className="movie-card-copy">
          <Link href={href}>{movie.title}</Link>
          <span className="movie-card-meta">
            <span
              className="movie-card-rating"
              aria-label={`${movie.vote_average.toFixed(1)} rating out of 10`}
            >
              <StarIcon /> {movie.vote_average.toFixed(1)}
            </span>
            <span className="movie-card-year">{releaseYear(movie)}</span>
            <span className="movie-card-type">{movie.media_type === "tv" ? "TV Show" : "Movie"}</span>
          </span>
        </div>
        {onRemove ? (
          <button className="remove-card" onClick={onRemove} aria-label={`Remove ${movie.title} from ${removeActionLabel}`}>
            <TrashIcon />
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function MovieGrid({ movies }: { movies: Movie[] }) {
  return (
    <div className="movie-grid">
      {movies.map((movie, index) => (
        <MovieCard movie={movie} key={movieKey(movie, index)} />
      ))}
    </div>
  );
}

export function progressPercentage(item: ContinueWatchingItem) {
  return (item.watchedSeconds / Math.max(1, item.estimatedDurationSeconds)) * 100;
}
