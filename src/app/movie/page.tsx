"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Credits } from "@/components/Credits";
import { BackIcon, MutedIcon, PlayIcon, StarIcon, VolumeIcon } from "@/components/Icons";
import { PageLoader } from "@/components/Loading";
import { WishlistButton } from "@/components/MovieCard";
import { MovieRail } from "@/components/MovieRail";
import { formatRuntime, getMovie, getSimilarMovies, imageUrl, isReleased, releaseYear } from "@/lib/tmdb";
import type { Movie, MovieDetails } from "@/lib/types";

export default function MoviePage() {
  return (
    <Suspense fallback={<PageLoader label="Loading film details" />}>
      <MoviePageContent />
    </Suspense>
  );
}

function MoviePageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.trim() ?? "";
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [similar, setSimilar] = useState<Movie[]>([]);
  const [missingId, setMissingId] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [trailerMuted, setTrailerMuted] = useState(true);
  const [trailerVisible, setTrailerVisible] = useState(false);
  const trailerRef = useRef<HTMLIFrameElement>(null);
  const trailerSetupTimers = useRef<number[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    if (!id) {
      setMissingId(true);
      return () => controller.abort();
    }
    setMissingId(false);
    setMovie(null);
    setSimilar([]);
    setIsIdle(false);
    setTrailerMuted(true);
    setTrailerVisible(false);
    window.scrollTo({ top: 0, behavior: "auto" });
    Promise.all([getMovie(id, controller.signal), getSimilarMovies(id, controller.signal)])
      .then(([details, related]) => {
        setMovie(details);
        setSimilar(related);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!movie?.trailer_key) return;
    let idleTimer: ReturnType<typeof setTimeout>;
    const markActive = () => {
      setIsIdle(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setIsIdle(true), 4000);
    };

    markActive();
    const events: Array<keyof WindowEventMap> = [
      "pointermove",
      "pointerdown",
      "keydown",
      "touchstart",
    ];
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }));
    return () => {
      clearTimeout(idleTimer);
      events.forEach((event) => window.removeEventListener(event, markActive));
    };
  }, [movie]);

  useEffect(() => () => {
    trailerSetupTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function toggleTrailerSound() {
    const frame = trailerRef.current;
    if (!frame?.contentWindow) return;
    const nextMuted = !trailerMuted;
    frame.contentWindow.postMessage(
      JSON.stringify({ event: "command", func: nextMuted ? "mute" : "unMute", args: [] }),
      "https://www.youtube-nocookie.com",
    );
    setTrailerMuted(nextMuted);
  }

  function prepareTrailer() {
    trailerSetupTimers.current.forEach((timer) => window.clearTimeout(timer));
    trailerSetupTimers.current = [];
    setTrailerVisible(false);

    const configurePlayer = () => {
      const player = trailerRef.current?.contentWindow;
      if (!player) return;
      player.postMessage(
        JSON.stringify({ event: "command", func: "playVideo", args: [] }),
        "https://www.youtube-nocookie.com",
      );
      ["captions", "cc"].forEach((module) => {
        player.postMessage(
          JSON.stringify({
            event: "command",
            func: "setOption",
            args: [module, "track", {}],
          }),
          "https://www.youtube-nocookie.com",
        );
      });
    };

    configurePlayer();
    [300, 900, 1700].forEach((delay) => {
      trailerSetupTimers.current.push(window.setTimeout(configurePlayer, delay));
    });
    trailerSetupTimers.current.push(
      window.setTimeout(() => setTrailerVisible(true), 2200),
    );
  }

  if (missingId) {
    return (
      <main className="message-page">
        <p className="eyebrow">No film selected</p>
        <h1>Choose a movie to enter this frame.</h1>
        <Link className="primary-button" href="/movies/">Browse movies</Link>
      </main>
    );
  }
  if (!movie) return <PageLoader label="Loading film details" />;

  const trailerUrl = movie.trailer_key
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(movie.trailer_key)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${encodeURIComponent(movie.trailer_key)}&playsinline=1&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&cc_load_policy=0&disablekb=1&enablejsapi=1`
    : null;

  return (
    <main className="detail-page">
      <section className={`detail-hero${isIdle ? " is-cinematic-idle" : ""}`}>
        <div className="detail-media" aria-hidden="true">
          <Image src={imageUrl(movie.backdrop_path, "original")} alt="" fill priority sizes="100vw" />
          {trailerUrl ? (
            <iframe
              ref={trailerRef}
              className={`detail-trailer-frame${trailerVisible ? " is-visible" : ""}`}
              src={trailerUrl}
              title={`${movie.title} trailer`}
              allow="autoplay; encrypted-media; picture-in-picture"
              onLoad={prepareTrailer}
              tabIndex={-1}
            />
          ) : null}
        </div>
        <div className="detail-shade" />
        {trailerUrl ? (
          <button
            className="detail-trailer-audio"
            type="button"
            onClick={toggleTrailerSound}
            aria-label={trailerMuted ? "Unmute trailer" : "Mute trailer"}
            title={trailerMuted ? "Unmute trailer" : "Mute trailer"}
          >
            {trailerMuted ? <MutedIcon /> : <VolumeIcon />}
          </button>
        ) : null}
        <div className="detail-content">
          <Link className="back-link" href="/">
            <BackIcon /> Back
          </Link>
          <div className="detail-layout">
            <div className="detail-copy">
              <div className="detail-title-stack">
                <p className="eyebrow">Feature film</p>
                {movie.logo_url ? (
                  <div className="detail-title-logo">
                    <Image
                      src={movie.logo_url}
                      alt={movie.title}
                      width={movie.logo_width ?? 800}
                      height={movie.logo_height ?? 310}
                      sizes="(max-width: 680px) 82vw, 44vw"
                      priority
                    />
                  </div>
                ) : (
                  <h1>{movie.title}</h1>
                )}
                {movie.tagline ? <p className="detail-tagline">{movie.tagline}</p> : null}
              </div>
              <div className="detail-info">
                <div className="detail-meta">
                  <span className="detail-year">{releaseYear(movie)}</span>
                  <span className="detail-meta-divider" aria-hidden="true" />
                  <span className="detail-runtime">{formatRuntime(movie.runtime)}</span>
                  <span
                    className="detail-rating"
                    aria-label={`${movie.vote_average.toFixed(1)} rating out of 10`}
                  >
                    <StarIcon /> {movie.vote_average.toFixed(1)}
                  </span>
                  {movie.genres.map((genre) => (
                    <span className="detail-genre" key={genre.id}>
                      {genre.name}
                    </span>
                  ))}
                </div>
                <p className="detail-overview">{movie.overview}</p>
              </div>
              <div className="detail-actions">
                {isReleased(movie) ? (
                  <Link className="primary-button" href={`/watch/?id=${movie.id}`}>
                    <PlayIcon /> Watch now
                  </Link>
                ) : (
                  <button className="primary-button is-coming-soon" type="button" disabled>
                    Coming soon
                  </button>
                )}
                <WishlistButton movie={movie} className="wishlist-detail-button" />
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="inner-page-content">
        <Credits cast={movie.cast} directors={movie.directors} />
        <MovieRail
          title="Movies You May Like"
          eyebrow="Selected for you"
          movies={similar}
          href={`/movies/?similar=${encodeURIComponent(String(movie.tmdb_id ?? movie.id))}`}
        />
      </div>
    </main>
  );
}
