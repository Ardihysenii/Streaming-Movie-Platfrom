"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, InfoIcon, PlayIcon, StarIcon } from "./Icons";
import { useNovaSettings } from "./Providers";
import { genreNames, imageUrl, isReleased, releaseYear } from "@/lib/tmdb";
import type { Movie } from "@/lib/types";

export function Hero({ movies }: { movies: Movie[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const logoPreloaders = useRef<HTMLImageElement[]>([]);
  const { settings } = useNovaSettings();
  const slides = movies.slice(0, 10);
  const activeMovie = slides[activeIndex] ?? slides[0];
  const heroGenres = activeMovie ? genreNames(activeMovie.genre_ids).split(" · ").filter(Boolean) : [];

  function move(direction: 1 | -1) {
    setActiveIndex((current) => (current + direction + slides.length) % slides.length);
  }

  useEffect(() => {
    if (!slides.length || !settings.autoplayHero || paused || settings.reduceMotion) return;
    const timer = window.setInterval(
      () => setActiveIndex((current) => (current + 1) % slides.length),
      settings.heroInterval * 1000,
    );
    return () => window.clearInterval(timer);
  }, [paused, settings.autoplayHero, settings.heroInterval, settings.reduceMotion, slides.length]);

  useEffect(() => {
    logoPreloaders.current = movies.slice(0, 10).flatMap((movie, index) => {
      if (!movie.logo_url) return [];
      const logo = new window.Image();
      logo.decoding = "async";
      logo.fetchPriority = index === 0 ? "high" : "auto";
      logo.src = movie.logo_url;
      void logo.decode().catch(() => undefined);
      return [logo];
    });

    return () => {
      logoPreloaders.current = [];
    };
  }, [movies]);

  if (!activeMovie) return null;
  const isSeries = activeMovie.media_type === "tv";
  const isAvailable = isSeries || isReleased(activeMovie);
  const contentId = activeMovie.tmdb_id ?? activeMovie.series_id ?? activeMovie.id;


  return (
    <section
      className="hero"
      style={{ minHeight: "100dvh" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      aria-roledescription="carousel"
      aria-label="Featured movies"
    >
      <div className="hero-backdrop" key={activeMovie.id}>
        <Image
          src={imageUrl(activeMovie.backdrop_path, "original")}
          alt=""
          fill
          priority
          sizes="100vw"
        />
      </div>
      <div className="hero-vignette" />
      <div className={`hero-copy${activeMovie.logo_url ? "" : " hero-copy-text"}`} key={`copy-${activeMovie.id}`}>
        {activeMovie.logo_url ? (
          <div className="hero-title-logo">
            <Image
              src={activeMovie.logo_url}
              alt={activeMovie.title}
              width={activeMovie.logo_width ?? 780}
              height={activeMovie.logo_height ?? 320}
              sizes="(max-width: 680px) 82vw, 42vw"
              priority
            />
          </div>
        ) : (
          <h1>{activeMovie.title}</h1>
        )}
        <div className="hero-meta">
          <span className="hero-year">{releaseYear(activeMovie)}</span>
          <span className="hero-meta-divider" aria-hidden="true" />
          <span className="hero-rating" aria-label={`${activeMovie.vote_average.toFixed(1)} rating out of 10`}>
            <StarIcon /> {activeMovie.vote_average.toFixed(1)}
          </span>
          {(heroGenres.length ? heroGenres : ["Feature film"]).map((genre, index) => (
            <Fragment key={`${genre}-${index}`}>
              <span className="hero-meta-divider" aria-hidden="true" />
              <span className="hero-genre">{genre}</span>
            </Fragment>
          ))}
        </div>
        <p className="hero-overview">{activeMovie.overview}</p>
        <div className="hero-actions hero-reference-actions">
          {isAvailable ? (
            <Link
              className="hero-reference-button hero-play-button"
              href={isSeries ? `/series/details/?id=${contentId}` : `/watch/?id=${contentId}`}
            >
              <PlayIcon />
              <span>Play</span>
            </Link>
          ) : (
            <button className="hero-reference-button hero-play-button is-coming-soon" type="button" disabled>
              <PlayIcon />
              <span>Play</span>
            </button>
          )}
          <Link
            className="hero-reference-button hero-info-button"
            href={isSeries ? `/series/details/?id=${contentId}` : `/movie/?id=${contentId}`}
          >
            <InfoIcon />
            <span>More Info</span>
          </Link>
        </div>
      </div>

      <button className="hero-arrow hero-arrow-left" onClick={() => move(-1)} aria-label="Previous featured movie">
        <ArrowLeftIcon />
      </button>
      <button className="hero-arrow hero-arrow-right" onClick={() => move(1)} aria-label="Next featured movie">
        <ArrowRightIcon />
      </button>





    </section>
  );
}
