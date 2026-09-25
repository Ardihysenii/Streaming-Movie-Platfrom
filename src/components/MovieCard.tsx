"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookmarkIcon, CloseIcon, HeartIcon, MutedIcon, PlayIcon, StarIcon, VolumeIcon } from "./Icons";
import { LoadingSpinner } from "./Loading";
import { getTrailer, imageUrl, releaseYear } from "@/lib/tmdb";
import { isInWishlist, toggleWishlist } from "@/lib/storage";
import type { ContinueWatchingItem, Movie } from "@/lib/types";

const trailerPreviewCache = new Map<string, string | null>();
const mediuxArtworkCache = new Map<string, string | null>();
const mediuxArtworkLogoCache = new Map<string, boolean>();

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
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [showArtworkLogo, setShowArtworkLogo] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [previewTrailerKey, setPreviewTrailerKey] = useState<string | null>(movie.trailer_key ?? null);
  const [previewMuted, setPreviewMuted] = useState(true);
  const previewTimerRef = useRef<number | null>(null);
  const previewRequestRef = useRef(0);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const rankLabel = rank ? rank.toString() : null;
  const href = mediaHref(movie, continueWatching);
  const previewEnabled = !continueWatching;
  const previewIdentity = String(movie.media_type ?? "movie") + ":" + String(movie.tmdb_id ?? movie.id);
  const cardImagePath = artworkUrl ?? movie.backdrop_path ?? movie.poster_path;
  const cardImageSrc = cardImagePath?.startsWith("http") ? cardImagePath : imageUrl(cardImagePath, "w780");

  useEffect(() => {
    let cancelled = false;
    const cached = mediuxArtworkCache.get(previewIdentity);
    if (cached !== undefined) {
      setArtworkUrl(cached);
      setShowArtworkLogo(mediuxArtworkLogoCache.get(previewIdentity) === true);
      return () => { cancelled = true; };
    }
    setArtworkUrl(null);
    setShowArtworkLogo(false);
    const params = new URLSearchParams({ tmdb_id: String(movie.tmdb_id ?? movie.id), type: movie.media_type === "tv" ? "tv" : "movie", version: "2" });
    void fetch("/api/mediux-artwork?" + params.toString())
      .then((response) => response.ok ? response.json() as Promise<{ image_url?: string | null; needs_logo?: boolean }> : { image_url: null, needs_logo: false })
      .then((payload) => {
        const next = typeof payload.image_url === "string" ? payload.image_url : null;
        mediuxArtworkCache.set(previewIdentity, next);
        if (!cancelled) {
          setArtworkUrl(next);
          mediuxArtworkLogoCache.set(previewIdentity, payload.needs_logo === true);
          setShowArtworkLogo(payload.needs_logo === true);
        }
      })
      .catch(() => {
        mediuxArtworkCache.set(previewIdentity, null);
        mediuxArtworkLogoCache.set(previewIdentity, false);
        if (!cancelled) {
          setArtworkUrl(null);
          setShowArtworkLogo(false);
        }
      });
    return () => { cancelled = true; };
  }, [movie.id, movie.media_type, movie.tmdb_id, previewIdentity]);

  useEffect(() => {
    setPreviewTrailerKey(movie.trailer_key ?? trailerPreviewCache.get(previewIdentity) ?? null);
    setPreviewActive(false);
    setPreviewMuted(true);
  }, [movie.trailer_key, previewIdentity]);

  useEffect(() => () => {
    if (previewTimerRef.current !== null) window.clearTimeout(previewTimerRef.current);
    previewRequestRef.current += 1;
  }, [previewIdentity]);

  const stopPreview = () => {
    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    previewRequestRef.current += 1;
    setPreviewActive(false);
    setPreviewMuted(true);
  };

  const startPreview = () => {
    if (!previewEnabled) return;
    setPreviewActive(true);
    setPreviewMuted(true);
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
    }, 2000);
  };

  const sendTrailerCommand = (command: string) => {
    const frame = previewFrameRef.current?.contentWindow;
    if (!frame) return;
    frame.postMessage(JSON.stringify({ event: "command", func: command, args: [] }), "https://www.youtube-nocookie.com");
  };

  const togglePreviewSound = (event: any) => {
    event.preventDefault();
    event.stopPropagation();
    const nextMuted = !previewMuted;
    sendTrailerCommand(nextMuted ? "mute" : "unMute");
    setPreviewMuted(nextMuted);
  };

  const handleCardBlur = (event: any) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) stopPreview();
  };

  // Always show a title treatment: prefer the transparent TMDB/Fanart logo,
  // then fall back to the real title when a logo is unavailable.
  const titleOverlayVisible = showArtworkLogo || Boolean(movie.logo_url) || movie.title.trim().length > 0;

  return (
    <article
      ref={cardRef}
      className={"movie-card" + (rankLabel ? " is-ranked" : "") + (previewActive ? " is-preview-active" : "")}
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
          {titleOverlayVisible ? (
            <span className="poster-logo-overlay" aria-hidden="true">
              {movie.logo_url ? (
                <Image className="poster-logo-image" src={movie.logo_url} alt="" width={movie.logo_width ?? 780} height={movie.logo_height ?? 320} sizes="(max-width: 600px) 28vw, 150px" />
              ) : (
                <span className="poster-title-fallback">{movie.title}</span>
              )}
            </span>
          ) : null}
          {typeof progress === "number" ? <span className="watch-progress" aria-label={Math.round(progress) + " percent watched"}><i style={{ width: String(Math.min(100, Math.max(2, progress))) + "%" }} /></span> : null}
        </Link>
        {previewActive ? (
          <div className="movie-card-preview" aria-label={movie.title + " trailer preview"}>
            <div className="movie-card-preview-media">
              {previewTrailerKey ? (
                <iframe ref={previewFrameRef} key={previewTrailerKey} src={"https://www.youtube-nocookie.com/embed/" + encodeURIComponent(previewTrailerKey) + "?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&showinfo=0&enablejsapi=1"} title={movie.title + " trailer preview"} allow="autoplay; encrypted-media; picture-in-picture" onLoad={() => { sendTrailerCommand("playVideo"); window.setTimeout(() => sendTrailerCommand("playVideo"), 350); }} />
              ) : <Image src={cardImageSrc} alt="" fill sizes="440px" />}
            </div>
            <span className="movie-card-preview-shade" aria-hidden="true" />
            <button className="movie-card-preview-sound" type="button" onClick={togglePreviewSound} aria-label={previewMuted ? "Unmute trailer preview" : "Mute trailer preview"} title={previewMuted ? "Unmute trailer preview" : "Mute trailer preview"}>{previewMuted ? <MutedIcon /> : <VolumeIcon />}</button>
            <div className="movie-card-preview-info">
              <strong>{movie.title}</strong>
              <span><StarIcon /> {movie.vote_average.toFixed(1)} · {releaseYear(movie)} · {movie.media_type === "tv" ? "TV Show" : "Movie"}</span>
              {movie.overview ? <p className="movie-card-preview-description">{movie.overview}</p> : null}
              <div className="movie-card-preview-actions"><Link className="movie-card-preview-play" href={href} aria-label={"Play " + movie.title}><PlayIcon /></Link><WishlistButton movie={movie} icon="heart" className="movie-card-preview-wishlist" /></div>
            </div>
          </div>
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
