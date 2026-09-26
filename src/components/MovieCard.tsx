"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { BookmarkIcon, CloseIcon, HeartIcon, StarIcon } from "./Icons";
import { LoadingSpinner } from "./Loading";
import { getTrailer, imageUrl, releaseYear } from "@/lib/tmdb";
import { isInWishlist, toggleWishlist } from "@/lib/storage";
import type { ContinueWatchingItem, Movie } from "@/lib/types";

const trailerPreviewCache = new Map<string, string | null>();

type MovieCardProps = {
  movie: Movie;
  rank?: number;
  progress?: number;
  onRemove?: () => void;
  priority?: boolean;
  continueWatching?: boolean;
  removeActionLabel?: string;
};

export function WishlistButton({ movie, className = "", icon = "bookmark" }: { movie: Movie; className?: string; icon?: "bookmark" | "heart" }) {
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
      {icon === "heart" ? <HeartIcon /> : <BookmarkIcon />}
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
  const [previewActive, setPreviewActive] = useState(false);
  const [previewClosing, setPreviewClosing] = useState(false);
  const [previewTrailerKey, setPreviewTrailerKey] = useState<string | null>(movie.trailer_key ?? null);
  const previewTimerRef = useRef<number | null>(null);
  const previewHideTimerRef = useRef<number | null>(null);
  const previewRequestRef = useRef(0);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const [previewOrigin, setPreviewOrigin] = useState({ x: 0, y: 0, scale: 0.42 });
  const rankLabel = rank ? rank.toString() : null;
  const href = mediaHref(movie, continueWatching);
  const previewEnabled = !continueWatching;
  const previewIdentity = String(movie.media_type ?? "movie") + ":" + String(movie.tmdb_id ?? movie.id);
  // Preserve the original portrait cover inside the existing card frame.
  const cardImagePath = movie.poster_path;
  const cardImageSrc = cardImagePath?.startsWith("http") ? cardImagePath : imageUrl(cardImagePath, "w780");

  useEffect(() => {
    setPreviewTrailerKey(movie.trailer_key ?? trailerPreviewCache.get(previewIdentity) ?? null);
    setPreviewActive(false);
    setPreviewClosing(false);
  }, [movie.trailer_key, previewIdentity]);

  useEffect(() => () => {
    if (previewTimerRef.current !== null) window.clearTimeout(previewTimerRef.current);
    if (previewHideTimerRef.current !== null) window.clearTimeout(previewHideTimerRef.current);
    previewRequestRef.current += 1;
  }, [previewIdentity]);

  const stopPreview = () => {
    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    previewRequestRef.current += 1;
    if (!previewActive) {
      setPreviewClosing(false);
      return;
    }
    setPreviewClosing(true);
    if (previewHideTimerRef.current !== null) window.clearTimeout(previewHideTimerRef.current);
    previewHideTimerRef.current = window.setTimeout(() => {
      previewHideTimerRef.current = null;
      setPreviewActive(false);
      setPreviewClosing(false);
    }, 520);
  };

  const preparePreviewMotion = () => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPreviewOrigin({
      x: rect.left + rect.width / 2 - window.innerWidth / 2,
      y: rect.top + rect.height / 2 - window.innerHeight / 2,
      scale: Math.max(0.34, Math.min(0.58, rect.width / 560)),
    });
  };

  const startPreview = () => {
    if (!previewEnabled) return;
    if (previewHideTimerRef.current !== null) {
      window.clearTimeout(previewHideTimerRef.current);
      previewHideTimerRef.current = null;
    }
    setPreviewClosing(false);
    preparePreviewMotion();
    setPreviewActive(true);
    if (movie.trailer_key) {
      setPreviewTrailerKey(movie.trailer_key);
      return;
    }
    const cachedTrailer = trailerPreviewCache.get(previewIdentity);
    if (cachedTrailer !== undefined) {
      setPreviewTrailerKey(cachedTrailer);
      return;
    }
    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    void getTrailer(movie.tmdb_id ?? movie.id, movie.media_type === "tv" ? "tv" : "movie")
      .then((trailer) => {
        trailerPreviewCache.set(previewIdentity, trailer);
        if (previewRequestRef.current === requestId) setPreviewTrailerKey(trailer);
      })
      .catch(() => {
        trailerPreviewCache.set(previewIdentity, null);
        if (previewRequestRef.current === requestId) setPreviewTrailerKey(null);
      });
  };

  const queuePreview = () => {
    if (!previewEnabled || previewActive) return;
    if (previewTimerRef.current !== null) window.clearTimeout(previewTimerRef.current);
    previewTimerRef.current = window.setTimeout(() => {
      previewTimerRef.current = null;
      startPreview();
    }, 4000);
  };

  const playTrailerPreview = () => {
    const frame = previewFrameRef.current?.contentWindow;
    if (!frame) return;
    const playMessage = JSON.stringify({ event: "command", func: "playVideo", args: [] });
    frame.postMessage(playMessage, "https://www.youtube-nocookie.com");
    window.setTimeout(() => frame.postMessage(playMessage, "https://www.youtube-nocookie.com"), 350);
  };

  const handleCardBlur = (event: any) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) stopPreview();
  };

  return (
    <article
      ref={cardRef}
      className={"movie-card" + (rankLabel ? " is-ranked" : "") + (previewActive ? " is-preview-active" : "") + (previewClosing ? " is-preview-closing" : "")}
      onMouseEnter={previewEnabled ? queuePreview : undefined}
      onMouseLeave={previewEnabled ? stopPreview : undefined}
      onFocusCapture={previewEnabled ? queuePreview : undefined}
      onBlurCapture={previewEnabled ? handleCardBlur : undefined}
    >
      {rankLabel ? <span className="rank-number">{rankLabel}</span> : null}
      <div className="movie-card-body">
        <Link href={href} aria-label={"View " + movie.title} className="poster-link">
          {!loaded ? (
            <span className="poster-loader">
              <LoadingSpinner label={"Loading " + movie.title + " artwork"} />
            </span>
          ) : null}
          <span className={"poster-image" + (loaded ? " is-loaded" : "")}>
            <Image src={cardImageSrc} alt={movie.title + " artwork"} fill sizes="(max-width: 600px) 42vw, (max-width: 1100px) 25vw, 220px" priority={priority} onLoad={() => setLoaded(true)} />
          </span>
          <span className="poster-sheen" />
          {typeof progress === "number" ? <span className="watch-progress" aria-label={Math.round(progress) + " percent watched"}><i style={{ width: String(Math.min(100, Math.max(2, progress))) + "%" }} /></span> : null}
        </Link>
        {previewActive && typeof document !== "undefined" ? createPortal(
          <>
            <span className={"movie-card-preview-backdrop" + (previewClosing ? " is-closing" : "")} aria-hidden="true" />
            <div
              className={"movie-card-preview" + (previewClosing ? " is-closing" : "")}
              aria-label={movie.title + " trailer preview"}
              style={{
                "--preview-from-x": previewOrigin.x + "px",
                "--preview-from-y": previewOrigin.y + "px",
                "--preview-from-scale": String(previewOrigin.scale),
              } as CSSProperties}
              onMouseEnter={() => {
                if (previewHideTimerRef.current !== null) {
                  window.clearTimeout(previewHideTimerRef.current);
                  previewHideTimerRef.current = null;
                }
                setPreviewClosing(false);
              }}
              onMouseLeave={stopPreview}
            >
              <div className="movie-card-preview-media">
                {previewTrailerKey ? (
                  <iframe ref={previewFrameRef} key={previewTrailerKey} src={"https://www.youtube-nocookie.com/embed/" + encodeURIComponent(previewTrailerKey) + "?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&showinfo=0&enablejsapi=1"} title={movie.title + " trailer preview"} allow="autoplay; encrypted-media" onLoad={playTrailerPreview} />
                ) : <Image src={cardImageSrc} alt="" fill sizes="560px" />}
              </div>
              <span className="movie-card-preview-shade" aria-hidden="true" />
              <div className="movie-card-preview-info">
                <strong>{movie.title}</strong>
                <span className="movie-card-preview-meta">
                  <span>{movie.media_type === "tv" ? "TV Show" : "Movie"}</span>
                  <span>{releaseYear(movie)}</span>
                  <span className="movie-card-preview-rating"><StarIcon /> {movie.vote_average.toFixed(1)}</span>
                </span>
                {movie.overview ? <p>{movie.overview}</p> : null}
              </div>
            </div>
          </>,
          document.body,
        ) : null}
        <div className="movie-card-copy">
          <Link href={href}>{movie.title}</Link>
          <span className="movie-card-meta"><span className="movie-card-rating" aria-label={movie.vote_average.toFixed(1) + " rating out of 10"}><StarIcon /> {movie.vote_average.toFixed(1)}</span><span className="movie-card-year">{releaseYear(movie)}</span><span className="movie-card-type">{movie.media_type === "tv" ? "TV Show" : "Movie"}</span></span>
        </div>
        {onRemove ? <button className="remove-card" onClick={onRemove} aria-label={"Remove " + movie.title + " from " + removeActionLabel}><CloseIcon /></button> : null}
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
