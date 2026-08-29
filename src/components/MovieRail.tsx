"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "./Icons";
import { MovieCard, movieKey, progressPercentage } from "./MovieCard";
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
      eyebrow="Made for your next watch"
      title="For You"
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
