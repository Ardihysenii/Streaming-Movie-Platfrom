"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookmarkIcon, CloseIcon, HeartIcon, MutedIcon, PlayIcon, StarIcon, VolumeIcon } from "./Icons";
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
  const [previewMuted, setPreviewMuted] = useState(true);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [hoverOrigin, setHoverOrigin] = useState({ left: 0, top: 0, width: 0 });
  const hoverTimerRef = useRef<number | null>(null);
  const hoverHideTimerRef = useRef<number | null>(null);
  const hoverPanelRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLAnchorElement>(null);
  const previewTimerRef = useRef<number | null>(null);
  const previewHideTimerRef = useRef<number | null>(null);
  const previewRequestRef = useRef(0);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const cardRef = useRef<HTMLElement>(null);
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
    setPreviewMuted(true);
  }, [movie.trailer_key, previewIdentity]);

  useEffect(() => () => {
    if (previewTimerRef.current !== null) window.clearTimeout(previewTimerRef.current);
    if (previewHideTimerRef.current !== null) window.clearTimeout(previewHideTimerRef.current);
    if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
    if (hoverHideTimerRef.current !== null) window.clearTimeout(hoverHideTimerRef.current);
    previewRequestRef.current += 1;
  }, [previewIdentity]);

  const cancelHoverClose = () => {
    if (hoverHideTimerRef.current !== null) {
      window.clearTimeout(hoverHideTimerRef.current);
      hoverHideTimerRef.current = null;
    }
  };

  const openHoverPanel = () => {
    const rect = posterRef.current?.getBoundingClientRect();
    if (!rect) return;
    cancelHoverClose();
    setHoverOrigin({ left: rect.left, top: rect.bottom - 1, width: rect.width });
    setHoverOpen(true);
  };

  const queueHoverOpen = () => {
    if (hoverOpen) return;
    if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => {
      hoverTimerRef.current = null;
      openHoverPanel();
    }, 160);
  };

  const queueHoverClose = () => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (hoverHideTimerRef.current !== null) window.clearTimeout(hoverHideTimerRef.current);
    hoverHideTimerRef.current = window.setTimeout(() => {
      hoverHideTimerRef.current = null;
      setHoverOpen(false);
      stopPreview();
    }, 180);
  };

  const updateHoverPanelPosition = () => {
    if (!hoverOpen) return;
    const rect = posterRef.current?.getBoundingClientRect();
    if (rect) setHoverOrigin({ left: rect.left, top: rect.bottom - 1, width: rect.width });
  };

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

  const startPreview = () => {
    if (!previewEnabled) return;
    if (previewHideTimerRef.current !== null) {
      window.clearTimeout(previewHideTimerRef.current);
      previewHideTimerRef.current = null;
    }
    setPreviewClosing(false);
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
    }, 3000);
  };

  const playTrailerPreview = () => {
    const frame = previewFrameRef.current?.contentWindow;
    if (!frame) return;
    const playMessage = JSON.stringify({ event: "command", func: "playVideo", args: [] });
    frame.postMessage(playMessage, "https://www.youtube-nocookie.com");
    window.setTimeout(() => frame.postMessage(playMessage, "https://www.youtube-nocookie.com"), 350);
  };

  const togglePreviewSound = () => {
    const nextMuted = !previewMuted;
    setPreviewMuted(nextMuted);
    const frame = previewFrameRef.current?.contentWindow;
    if (!frame) return;
    frame.postMessage(JSON.stringify({ event: "command", func: nextMuted ? "mute" : "unMute", args: [] }), "https://www.youtube-nocookie.com");
  };

  useEffect(() => {
    if (!hoverOpen) return;
    const update = () => updateHoverPanelPosition();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [hoverOpen]);

  const handleCardBlur = (event: any) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!event.currentTarget.contains(nextTarget) && !hoverPanelRef.current?.contains(nextTarget)) {
      queueHoverClose();
      stopPreview();
    }
  };

  const handleCardMouseLeave = () => {
    queueHoverClose();
  };

  return (
    <article
      ref={cardRef}
      className={"movie-card" + (rankLabel ? " is-ranked" : "") + (hoverOpen ? " is-hover-open" : "") + (previewActive ? " is-preview-active" : "") + (previewClosing ? " is-preview-closing" : "")}
      onMouseEnter={() => {
        queueHoverOpen();
        queuePreview();
      }}
      onMouseLeave={handleCardMouseLeave}
      onFocusCapture={() => {
        queueHoverOpen();
        queuePreview();
      }}
      onBlurCapture={previewEnabled ? handleCardBlur : undefined}
    >
      {rankLabel ? <span className="rank-number">{rankLabel}</span> : null}
      <div className="movie-card-body">
        <Link ref={posterRef} href={href} aria-label={"View " + movie.title} className="poster-link">
          {!loaded ? (
            <span className="poster-loader">
              <LoadingSpinner label={"Loading " + movie.title + " artwork"} />
            </span>
          ) : null}
          <span className={"poster-image" + (loaded ? " is-loaded" : "")}>
            <Image src={cardImageSrc} alt={movie.title + " artwork"} fill sizes="(max-width: 600px) 42vw, (max-width: 1100px) 25vw, 220px" priority={priority} onLoad={() => setLoaded(true)} />
          </span>
          {previewActive && previewTrailerKey ? (
            <span className="movie-card-inline-trailer" aria-hidden="true">
              <iframe
                ref={previewFrameRef}
                key={previewTrailerKey}
                src={"https://www.youtube-nocookie.com/embed/" + encodeURIComponent(previewTrailerKey) + "?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&showinfo=0&enablejsapi=1"}
                title={movie.title + " trailer preview"}
                allow="autoplay; encrypted-media"
                onLoad={playTrailerPreview}
              />
            </span>
          ) : null}
          <span className="poster-sheen" />
          {typeof progress === "number" ? <span className="watch-progress" aria-label={Math.round(progress) + " percent watched"}><i style={{ width: String(Math.min(100, Math.max(2, progress))) + "%" }} /></span> : null}
        </Link>
        {hoverOpen && typeof document !== "undefined" ? createPortal(
          <div
            ref={hoverPanelRef}
            className="card-hover-info is-open"
            style={{ left: hoverOrigin.left, top: hoverOrigin.top, width: hoverOrigin.width }}
            onMouseEnter={cancelHoverClose}
            onMouseLeave={queueHoverClose}
          >
            <strong>{movie.title}</strong>
            <div className="card-hover-actions">
              <div className="card-hover-actions-left">
                <Link className="card-hover-btn card-hover-btn--play" href={href} aria-label={"Play " + movie.title} title="Play"><PlayIcon /></Link>
                <WishlistButton movie={movie} className="card-hover-btn--list" />
              </div>
              <Link className="card-hover-btn card-hover-btn--more" href={href} aria-label={"More info about " + movie.title} title="More info">•••</Link>
            </div>
            <div className="card-hover-meta">
              <span className="card-hover-match">{Math.round(Math.min(99, Math.max(72, movie.vote_average * 10)))}% Match</span>
              <span className="card-hover-pill">{releaseYear(movie)}</span>
              <span>{movie.media_type === "tv" ? "TV Show" : "Movie"}</span>
              <span className="card-hover-rating"><StarIcon /> {movie.vote_average.toFixed(1)}</span>
            </div>
            {movie.overview ? <p className="card-hover-overview">{movie.overview}</p> : null}
          </div>,
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
