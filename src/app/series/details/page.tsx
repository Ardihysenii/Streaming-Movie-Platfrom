"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Credits } from "@/components/Credits";
import { EpisodeBrowser } from "@/components/EpisodeBrowser";
import { BackIcon, MutedIcon, PlayIcon, StarIcon, VolumeIcon } from "@/components/Icons";
import { PageLoader } from "@/components/Loading";
import { WishlistButton } from "@/components/MovieCard";
import { MovieRail } from "@/components/MovieRail";
import { formatRuntime, getSeries, getSimilarSeries, imageUrl, releaseYear } from "@/lib/tmdb";
import type { Movie, SeriesDetails } from "@/lib/types";

export default function SeriesDetailsPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading series details" />}>
      <SeriesDetailsContent />
    </Suspense>
  );
}

function SeriesDetailsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.trim() ?? "";
  const [series, setSeries] = useState<SeriesDetails | null>(null);
  const [similar, setSimilar] = useState<Movie[]>([]);
  const [missingId, setMissingId] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
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
    setLoadFailed(false);
    setSeries(null);
    setSimilar([]);
    setIsIdle(false);
    setTrailerMuted(true);
    setTrailerVisible(false);
    window.scrollTo({ top: 0, behavior: "auto" });
    Promise.all([getSeries(id, controller.signal), getSimilarSeries(id, controller.signal)])
      .then(([details, related]) => {
        setSeries(details);
        setSimilar(related);
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setLoadFailed(true);
      });
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!series?.trailer_key) return;
    let idleTimer: ReturnType<typeof setTimeout>;
    const markActive = () => {
      setIsIdle(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setIsIdle(true), 4000);
    };
    markActive();
    const events: Array<keyof WindowEventMap> = ["pointermove", "pointerdown", "keydown", "touchstart"];
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }));
    return () => {
      clearTimeout(idleTimer);
      events.forEach((event) => window.removeEventListener(event, markActive));
    };
  }, [series]);

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
          JSON.stringify({ event: "command", func: "setOption", args: [module, "track", {}] }),
          "https://www.youtube-nocookie.com",
        );
      });
    };
    configurePlayer();
    [300, 900, 1700].forEach((delay) => {
      trailerSetupTimers.current.push(window.setTimeout(configurePlayer, delay));
    });
    trailerSetupTimers.current.push(window.setTimeout(() => setTrailerVisible(true), 2200));
  }

  if (missingId || loadFailed) {
    return (
      <main className="message-page">
        <p className="eyebrow">Series unavailable</p>
        <h1>Choose another story from the NOVA television library.</h1>
        <Link className="primary-button" href="/series/">Browse series</Link>
      </main>
    );
  }
  if (!series) return <PageLoader label="Loading series details" />;

  const firstSeason = series.seasons.find((season) => season.season_number === 1)
    ?? series.seasons.find((season) => season.season_number > 0)
    ?? series.seasons[0];
  const firstEpisodeUrl = firstSeason
    ? `/watch/?id=${series.id}&type=tv&season=${firstSeason.season_number}&episode=1`
    : null;
  const trailerUrl = series.trailer_key
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(series.trailer_key)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${encodeURIComponent(series.trailer_key)}&playsinline=1&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&cc_load_policy=0&disablekb=1&enablejsapi=1`
    : null;

  return (
    <main className="detail-page series-detail-page">
      <section className={`detail-hero${isIdle ? " is-cinematic-idle" : ""}`}>
        <div className="detail-media" aria-hidden="true">
          <Image src={imageUrl(series.backdrop_path, "original")} alt="" fill priority sizes="100vw" />
          {trailerUrl ? (
            <iframe
              ref={trailerRef}
              className={`detail-trailer-frame${trailerVisible ? " is-visible" : ""}`}
              src={trailerUrl}
              title={`${series.title} trailer`}
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
          <Link className="back-link" href="/series/">
            <BackIcon /> Back
          </Link>
          <div className="detail-layout">
            <div className="detail-copy">
              <div className="detail-title-stack">
                <p className="eyebrow">Original series</p>
                {series.logo_url ? (
                  <div className="detail-title-logo">
                    <Image
                      src={series.logo_url}
                      alt={series.title}
                      width={series.logo_width ?? 800}
                      height={series.logo_height ?? 310}
                      sizes="(max-width: 680px) 82vw, 44vw"
                      priority
                    />
                  </div>
                ) : (
                  <h1>{series.title}</h1>
                )}
                {series.tagline ? <p className="detail-tagline">{series.tagline}</p> : null}
              </div>
              <div className="detail-info">
                <div className="detail-meta">
                  <span className="detail-year">{releaseYear(series)}</span>
                  <span className="detail-runtime">{formatRuntime(series.runtime)}</span>
                  <span className="detail-rating" aria-label={`${series.vote_average.toFixed(1)} rating out of 10`}>
                    <StarIcon /> {series.vote_average.toFixed(1)}
                  </span>
                  {series.genres.map((genre) => (
                    <span className="detail-genre" key={genre.id}>{genre.name}</span>
                  ))}
                </div>
                <p className="detail-overview">{series.overview}</p>
              </div>
              <div className="detail-actions">
                {firstEpisodeUrl ? (
                  <Link className="primary-button" href={firstEpisodeUrl}>
                    <PlayIcon /> Start series
                  </Link>
                ) : null}
                <WishlistButton movie={series} className="wishlist-detail-button" />
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="inner-page-content">
        <EpisodeBrowser series={series} />
        <Credits
          cast={series.cast}
          directors={series.creators}
          heading="Cast & Creators"
          primaryLabel={series.creators.length === 1 ? "Creator" : "Creators"}
          primaryRole="Creator"
        />
        <MovieRail
          title="Series You May Like"
          eyebrow="Selected for you"
          movies={similar}
          href={`/series/?similar=${encodeURIComponent(String(series.tmdb_id ?? series.id))}`}
        />
      </div>
    </main>
  );
}
