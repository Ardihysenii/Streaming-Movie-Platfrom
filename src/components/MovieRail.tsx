"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeftIcon, ArrowRightIcon, MutedIcon, PlayIcon, StarIcon, VolumeIcon } from "./Icons";
import { MovieCard, movieKey, progressPercentage } from "./MovieCard";
import { getTrailer, imageUrl, releaseYear } from "@/lib/tmdb";
import { removeContinueWatching } from "@/lib/storage";
import type { ContinueWatchingItem, Movie } from "@/lib/types";

type MovieRailProps = {
  title: string;
  eyebrow?: string;
  movies: Movie[];
  numbered?: boolean;
  href?: string;
};

type RailChoice = {
  label: string;
  movies: Movie[];
  href?: string;
};

function ChoiceRail({
  title,
  eyebrow,
  choices,
  className = "",
}: {
  title: string;
  eyebrow: string;
  choices: RailChoice[];
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = choices[activeIndex] ?? choices[0];
  if (!active) return null;
  const movies = (active.movies.length ? active.movies : choices.flatMap((choice) => choice.movies)).slice(0, 14);

  return (
    <section className={`content-section interactive-rail ${className}`}>
      <header className="section-heading interactive-rail-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <div className="rail-tabs" role="tablist" aria-label={`${title} choices`}>
            {choices.map((choice, index) => (
              <button
                aria-selected={index === activeIndex}
                className={index === activeIndex ? "is-active" : ""}
                key={choice.label}
                onClick={() => setActiveIndex(index)}
                role="tab"
                type="button"
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>
        {active.href ? <Link href={active.href}>View all <ArrowRightIcon /></Link> : null}
      </header>
      <RailScroller label={`${title}: ${active.label}`} itemCount={movies.length}>
        {movies.map((movie, index) => (
          <MovieCard movie={movie} key={movieKey(movie, index)} />
        ))}
      </RailScroller>
    </section>
  );
}

const MOOD_GENRES = [
  { label: "Intense Thrills", ids: [28, 53, 80] },
  { label: "Chill & Relax", ids: [35, 10751, 10749] },
  { label: "Action Packed", ids: [28, 12, 878] },
  { label: "Heartwarming", ids: [18, 10751, 10749] },
  { label: "Nighttime Vibes", ids: [27, 9648, 53] },
];

const GENRE_CHOICES = [
  { label: "Action", id: 28 },
  { label: "Comedy", id: 35 },
  { label: "Drama", id: 18 },
  { label: "Horror", id: 27 },
  { label: "Sci-Fi", id: 878 },
  { label: "Romance", id: 10749 },
];

export function ForYouRail({ movies }: { movies: Movie[] }) {
  return (
    <ChoiceRail
      className="for-you-rail"
      eyebrow="A considered selection"
      title="Recommended"
      choices={[
        { label: "Movies", movies: movies.filter((movie) => movie.media_type !== "tv"), href: "/movies/" },
        { label: "TV Shows", movies: movies.filter((movie) => movie.media_type === "tv"), href: "/series/" },
      ]}
    />
  );
}

export function MoodRail({ movies }: { movies: Movie[] }) {
  return (
    <ChoiceRail
      className="mood-rail"
      eyebrow="Find the feeling"
      title="What’s Your Mood"
      choices={MOOD_GENRES.map((mood) => ({
        label: mood.label,
        movies: movies.filter((movie) => mood.ids.some((id) => movie.genre_ids.includes(id))),
        href: `/movies/?genre=${mood.ids[0]}&sort=popularity.desc`,
      }))}
    />
  );
}

export function GenreRail({ movies }: { movies: Movie[] }) {
  return (
    <ChoiceRail
      className="genre-rail"
      eyebrow="Browse by feeling"
      title="Genres"
      choices={GENRE_CHOICES.map((genre) => ({
        label: genre.label,
        movies: movies.filter((movie) => movie.genre_ids.includes(genre.id)),
        href: `/movies/?genre=${genre.id}`,
      }))}
    />
  );
}

function RailScroller({ children, label, itemCount }: { children: ReactNode; label: string; itemCount: number }) {
  const railRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateEdges = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const nextCanScrollLeft = rail.scrollLeft > 4;
    const nextCanScrollRight = rail.scrollLeft < maxScrollLeft - 4;

    setCanScrollLeft((current) => current === nextCanScrollLeft ? current : nextCanScrollLeft);
    setCanScrollRight((current) => current === nextCanScrollRight ? current : nextCanScrollRight);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const queueEdgeUpdate = () => {
      if (animationFrameRef.current !== null) return;
      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null;
        updateEdges();
      });
    };

    updateEdges();
    rail.addEventListener("scroll", queueEdgeUpdate, { passive: true });
    const resizeObserver = new ResizeObserver(queueEdgeUpdate);
    resizeObserver.observe(rail);

    return () => {
      rail.removeEventListener("scroll", queueEdgeUpdate);
      resizeObserver.disconnect();
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
      if (scrollAnimationRef.current !== null) window.cancelAnimationFrame(scrollAnimationRef.current);
    };
  }, [itemCount, updateEdges]);

  const scrollRail = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = rail.scrollLeft;
    const distance = direction * Math.max(320, rail.clientWidth * 0.82);
    const target = Math.min(Math.max(0, start + distance), rail.scrollWidth - rail.clientWidth);

    if (scrollAnimationRef.current !== null) window.cancelAnimationFrame(scrollAnimationRef.current);
    if (reducedMotion) {
      rail.scrollLeft = target;
      return;
    }

    const startedAt = performance.now();
    const animate = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startedAt) / 420);
      const eased = 0.5 - Math.cos(progress * Math.PI) / 2;
      rail.scrollLeft = start + (target - start) * eased;
      if (progress < 1) scrollAnimationRef.current = window.requestAnimationFrame(animate);
      else scrollAnimationRef.current = null;
    };
    scrollAnimationRef.current = window.requestAnimationFrame(animate);
  };

  return (
    <div className="movie-rail-shell">
      <div className="movie-rail" ref={railRef} aria-label={label}>
        {children}
      </div>
      {canScrollLeft ? (
        <button
          className="rail-arrow rail-arrow-left"
          type="button"
          onClick={() => scrollRail(-1)}
          aria-label={`Scroll ${label} left`}
        >
          <ArrowLeftIcon />
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          className="rail-arrow rail-arrow-right"
          type="button"
          onClick={() => scrollRail(1)}
          aria-label={`Scroll ${label} right`}
        >
          <ArrowRightIcon />
        </button>
      ) : null}
    </div>
  );
}


export function TopTenRail({ movies }: { movies: Movie[] }) {
  const topTen = movies.slice(0, 10);
  const [trailerMovie, setTrailerMovie] = useState<Movie | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailerError, setTrailerError] = useState(false);
  const [trailerMuted, setTrailerMuted] = useState(true);
  const trailerRef = useRef<HTMLIFrameElement>(null);
  const trailerRequestRef = useRef(0);

  const closeTrailer = () => {
    trailerRequestRef.current += 1;
    setTrailerMovie(null);
    setTrailerKey(null);
    setTrailerLoading(false);
    setTrailerError(false);
    setTrailerMuted(true);
  };

  useEffect(() => {
    if (!trailerMovie) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTrailer();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [trailerMovie]);

  const startTrailer = () => {
    const player = trailerRef.current?.contentWindow;
    if (!player) return;
    const playMessage = JSON.stringify({ event: "command", func: "playVideo", args: [] });
    player.postMessage(playMessage, "https://www.youtube-nocookie.com");
    window.setTimeout(() => player.postMessage(playMessage, "https://www.youtube-nocookie.com"), 350);
  };

  const toggleTrailerSound = () => {
    const frame = trailerRef.current?.contentWindow;
    if (!frame) return;
    const nextMuted = !trailerMuted;
    frame.postMessage(
      JSON.stringify({ event: "command", func: nextMuted ? "mute" : "unMute", args: [] }),
      "https://www.youtube-nocookie.com",
    );
    setTrailerMuted(nextMuted);
  };

  const openTrailer = async (movie: Movie) => {
    const requestId = trailerRequestRef.current + 1;
    trailerRequestRef.current = requestId;
    setTrailerMovie(movie);
    setTrailerKey(movie.trailer_key ?? null);
    setTrailerMuted(true);
    setTrailerError(false);
    if (movie.trailer_key) return;

    setTrailerLoading(true);
    try {
      const trailer = await getTrailer(
        movie.tmdb_id ?? movie.id,
        movie.media_type === "tv" ? "tv" : "movie",
      );
      if (trailerRequestRef.current !== requestId) return;
      setTrailerKey(trailer);
      setTrailerError(!trailer);
    } catch {
      if (trailerRequestRef.current === requestId) setTrailerError(true);
    } finally {
      if (trailerRequestRef.current === requestId) setTrailerLoading(false);
    }
  };

  if (!topTen.length) return null;

  return (
    <section className="content-section top-ten-section">
      <header className="top-ten-heading">
        <span className="top-ten-heading-accent" aria-hidden="true" />
        <div className="top-ten-heading-text">
          <div className="top-ten-title-row">
            <h2 className="top-ten-section-title">Top 10 on</h2>
            <span className="top-ten-brand wordmark-letters" aria-label="MONTANA">
              <span className="wordmark-letter">M</span>
              <span className="wordmark-letter">O</span>
              <span className="wordmark-letter">N</span>
              <span className="wordmark-letter">T</span>
              <span className="wordmark-letter">A</span>
              <span className="wordmark-letter">N</span>
              <span className="wordmark-letter">A</span>
            </span>
          </div>
          <p>The most watched titles right now</p>
        </div>
      </header>
      <RailScroller label="Top 10 on MONTANA" itemCount={topTen.length}>
        {topTen.map((movie, index) => {
          const isFeatured = index === 0;
          const trailerActive = isFeatured && trailerMovie?.id === movie.id;
          const href = movie.media_type === "tv"
            ? "/series/details/?id=" + (movie.tmdb_id ?? movie.id)
            : "/movie/?id=" + (movie.tmdb_id ?? movie.id);
          return (
            <article className={"top-ten-card-shell" + (isFeatured ? " is-featured" : "")} key={movieKey(movie, index)}>
              {trailerActive ? (
                <div className="top-ten-card top-ten-card-trailer" aria-label={movie.title + " trailer"}>
                  <span className="top-ten-badge" aria-hidden="true">
                    <small>TOP</small>
                    <strong>{String(index + 1).padStart(2, "0")}</strong>
                  </span>
                  <span className="top-ten-trailer-media">
                    {trailerKey ? (
                      <iframe
                        ref={trailerRef}
                        src={"https://www.youtube-nocookie.com/embed/" + encodeURIComponent(trailerKey) + "?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&cc_load_policy=0&disablekb=1&fs=0&showinfo=0&enablejsapi=1"}
                        title={movie.title + " trailer"}
                        allow="autoplay; encrypted-media; picture-in-picture"
                        onLoad={startTrailer}
                      />
                    ) : (
                      <span className="top-ten-trailer-loading">
                        {trailerLoading ? "Loading trailer…" : trailerError ? "No trailer available" : "Loading trailer…"}
                      </span>
                    )}
                  </span>
                  <button className="top-ten-trailer-back" type="button" onClick={closeTrailer} aria-label="Back to featured card">
                    <ArrowLeftIcon />
                  </button>
                  {trailerKey ? (
                    <button
                      className="top-ten-trailer-volume"
                      type="button"
                      onClick={toggleTrailerSound}
                      aria-label={trailerMuted ? "Unmute trailer" : "Mute trailer"}
                      title={trailerMuted ? "Unmute trailer" : "Mute trailer"}
                    >
                      {trailerMuted ? <MutedIcon /> : <VolumeIcon />}
                    </button>
                  ) : null}
                </div>
              ) : (
                <Link className="top-ten-card" href={href} aria-label={"Top " + (index + 1) + ": " + movie.title}>
                  <span className="top-ten-badge" aria-hidden="true">
                    <small>TOP</small>
                    <strong>{String(index + 1).padStart(2, "0")}</strong>
                  </span>
                  <span className="top-ten-image">
                    <Image
                      src={imageUrl(isFeatured ? movie.backdrop_path ?? movie.poster_path : movie.poster_path, isFeatured ? "w780" : "w500")}
                      alt={movie.title + " artwork"}
                      fill
                      sizes={isFeatured ? "(max-width: 680px) 82vw, 530px" : "200px"}
                    />
                    <span className="top-ten-hover-overlay" aria-hidden="true" />
                    {isFeatured ? (
                      <span className="top-ten-featured-description">
                        <span className="top-ten-featured-title">
                          {movie.logo_url ? (
                            <Image
                              src={movie.logo_url}
                              alt={movie.title}
                              width={movie.logo_width ?? 900}
                              height={movie.logo_height ?? 320}
                              sizes="(max-width: 680px) 68vw, 300px"
                            />
                          ) : movie.title}
                        </span>
                        <span className="top-ten-featured-overview">{movie.overview}</span>
                      </span>
                    ) : null}
                  </span>
                </Link>
              )}
              {isFeatured && !trailerActive ? (
                <button
                  className="top-ten-trailer-button"
                  type="button"
                  onClick={() => void openTrailer(movie)}
                  disabled={trailerLoading && trailerMovie?.id === movie.id}
                >
                  <PlayIcon />
                  {trailerLoading && trailerMovie?.id === movie.id ? "Loading trailer" : "See trailer"}
                </button>
              ) : null}
              <div className="top-ten-meta">
                <h3>{movie.title}</h3>
                <p><span className="top-ten-rating"><StarIcon /> {movie.vote_average.toFixed(1)}</span> <span aria-hidden="true">·</span> {releaseYear(movie)} <span aria-hidden="true">·</span> {movie.media_type === "tv" ? "TV Show" : "Movie"}</p>
              </div>
            </article>
          );
        })}
      </RailScroller>
    </section>
  );
}

export function MovieRail({ title, eyebrow, movies, numbered = false, href = "/movies/" }: MovieRailProps) {
  if (!movies.length) return null;
  return (
    <section className={`content-section${numbered ? " numbered-section" : ""}`}>
      <header className="section-heading">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
        <Link href={href}>
          View all <ArrowRightIcon />
        </Link>
      </header>
      <RailScroller label={title} itemCount={movies.length}>
        {movies.map((movie, index) => (
          <MovieCard movie={movie} rank={numbered ? index + 1 : undefined} key={movieKey(movie, index)} />
        ))}
      </RailScroller>
    </section>
  );
}

export function ContinueRail({
  items,
  onChange,
}: {
  items: ContinueWatchingItem[];
  onChange: () => void;
}) {
  if (!items.length) return null;
  return (
    <section className="content-section continue-section">
      <header className="section-heading">
        <div>
          <p className="eyebrow">Pick up where you left off</p>
          <h2>Continue Watching</h2>
        </div>
      </header>
      <RailScroller label="Continue Watching" itemCount={items.length}>
        {items.map((movie, index) => (
          <MovieCard
            movie={movie}
            progress={progressPercentage(movie)}
            continueWatching
            onRemove={() => {
              removeContinueWatching(movie.id);
              onChange();
            }}
            key={movieKey(movie, index)}
          />
        ))}
      </RailScroller>
    </section>
  );
}
