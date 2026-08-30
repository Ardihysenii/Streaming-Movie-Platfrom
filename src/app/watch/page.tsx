"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import CustomMoviePlayer from "@/components/CustomMoviePlayer";
import { BackIcon } from "@/components/Icons";
import { EpisodeBrowser } from "@/components/EpisodeBrowser";
import { PageLoader } from "@/components/Loading";
import { MovieRail } from "@/components/MovieRail";
import { getSavedProgress, saveWatchProgress } from "@/lib/storage";
import { getMovie, getSeries, getSimilarMovies, getSimilarSeries } from "@/lib/tmdb";
import type { Movie, MovieDetails, SeriesDetails } from "@/lib/types";

export default function WatchPage() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id")?.trim() ?? "";
  const queryType = searchParams.get("type") === "tv" ? "tv" : "movie";
  const querySeason = Number(searchParams.get("season"));
  const queryEpisode = Number(searchParams.get("episode"));
  const [movie, setMovie] = useState<MovieDetails | SeriesDetails | null>(null);
  const [similar, setSimilar] = useState<Movie[]>([]);
  const [missingId, setMissingId] = useState(false);
  const [isSeries, setIsSeries] = useState(false);
  const [seasonNumber, setSeasonNumber] = useState<number | undefined>();
  const [episodeNumber, setEpisodeNumber] = useState<number | undefined>();
  const [resumeAt, setResumeAt] = useState(0);
  const [continueItem, setContinueItem] = useState<Movie | null>(null);
  const latestProgressRef = useRef(0);
  const lastSavedProgressRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const id = queryId;
    const type = queryType;
    const season = querySeason;
    const episode = queryEpisode;
    setMissingId(false);
    setMovie(null);
    setSimilar([]);
    setResumeAt(0);
    setContinueItem(null);
    lastSavedProgressRef.current = 0;
    if (!id || (type === "tv" && (!season || !episode))) {
      setMissingId(true);
      return () => controller.abort();
    }

    const detailsRequest = type === "tv" ? getSeries(id, controller.signal) : getMovie(id, controller.signal);
    const similarRequest = type === "tv"
      ? getSimilarSeries(id, controller.signal)
      : getSimilarMovies(id, controller.signal);
    setIsSeries(type === "tv");
    setSeasonNumber(type === "tv" ? season : undefined);
    setEpisodeNumber(type === "tv" ? episode : undefined);

    Promise.all([detailsRequest, similarRequest])
      .then(([details, related]) => {
        const progressId = type === "tv" ? `${id}:s${season}e${episode}` : id;
        // TMDB detail records use the IMDb ID as `id`, while cards and watch
        // URLs commonly use the numeric TMDB ID. Check both aliases so a
        // movie always resumes the exact position that was saved for it.
        const progressIds: Array<string | number> = type === "tv"
          ? [progressId]
          : [details.id, details.tmdb_id, progressId].filter(
              (value, index, values): value is string | number => (
                value !== undefined && values.indexOf(value) === index
              ),
            );
        const progress = progressIds.reduce<number>(
          (saved, candidate) => saved || getSavedProgress(candidate),
          0,
        );
        setMovie(details);
        setSimilar(related);
        const continueItem: Movie = type === "tv"
          ? {
              ...details,
              id: progressId,
              series_id: details.id,
              season_number: season,
              episode_number: episode,
              title: `${details.title} · S${season.toString().padStart(2, "0")} E${episode.toString().padStart(2, "0")}`,
            }
          : details;
        setResumeAt(progress);
        setContinueItem(continueItem);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [queryEpisode, queryId, querySeason, queryType]);

  useEffect(() => {
    if (!continueItem) return;

    const persistProgress = () => {
      const current = latestProgressRef.current;
      if (current <= 0) return;
      const fallbackDuration = "runtime" in continueItem && typeof continueItem.runtime === "number"
        ? continueItem.runtime * 60
        : 45 * 60;
      saveWatchProgress(
        continueItem,
        current,
        fallbackDuration,
      );
    };

    window.addEventListener("pagehide", persistProgress);
    document.addEventListener("visibilitychange", persistProgress);
    return () => {
      persistProgress();
      window.removeEventListener("pagehide", persistProgress);
      document.removeEventListener("visibilitychange", persistProgress);
    };
  }, [continueItem]);

  const handleProgress = (currentTime: number, duration: number) => {
    if (!continueItem || !Number.isFinite(currentTime) || currentTime <= 0) return;
    latestProgressRef.current = currentTime;
    const reachedEnd = Number.isFinite(duration) && duration > 0 && currentTime >= duration - 1;
    if (!reachedEnd && currentTime - lastSavedProgressRef.current < 3) return;
    lastSavedProgressRef.current = currentTime;
    const fallbackDuration = "runtime" in continueItem && typeof continueItem.runtime === "number"
      ? continueItem.runtime * 60
      : 45 * 60;
    saveWatchProgress(
      continueItem,
      currentTime,
      Number.isFinite(duration) && duration > 0 ? duration : fallbackDuration,
    );
  };

  if (missingId) {
    return (
      <main className="message-page">
        <p className="eyebrow">Nothing queued</p>
        <h1>Select a movie or episode before opening the player.</h1>
        <Link className="primary-button" href="/">Browse NOVA</Link>
      </main>
    );
  }

  if (!movie) return <PageLoader label="Preparing the player" />;

  const episodeLabel = isSeries && seasonNumber && episodeNumber
    ? `S${seasonNumber.toString().padStart(2, "0")} · E${episodeNumber.toString().padStart(2, "0")}`
    : null;
  const isAnime = movie.genre_ids.includes(16);

  return (
    <main className="watch-page">
      <header className="watch-header">
        <Link className="back-link" href={isSeries ? `/series/details/?id=${movie.id}` : `/movie/?id=${movie.id}`}>
          <BackIcon /> Back to details
        </Link>
        <div>
          <strong>{movie.title}{episodeLabel ? ` · ${episodeLabel}` : ""}</strong>
          <span>NOVA custom player</span>
        </div>
      </header>

      <section className="player-shell provider-player-shell">
        <CustomMoviePlayer
          key={`${movie.id}:${seasonNumber ?? ""}:${episodeNumber ?? ""}`}
          tmdbId={movie.tmdb_id ?? movie.id}
          imdbId={movie.id}
          mediaType={isSeries ? "tv" : "movie"}
          seasonNumber={seasonNumber}
          episodeNumber={episodeNumber}
          resumeAt={resumeAt}
          onProgress={handleProgress}
        />
      </section>

      <div className="player-meta">
        <div className="player-title">
          <p className="eyebrow">Now watching</p>
          {movie.logo_url ? (
            <div className="player-title-logo">
              <Image
                src={movie.logo_url}
                alt={movie.title}
                width={movie.logo_width ?? 800}
                height={movie.logo_height ?? 310}
                sizes="(max-width: 680px) 72vw, 34vw"
              />
              {episodeLabel ? <span>{episodeLabel}</span> : null}
            </div>
          ) : (
            <h1>{movie.title}{episodeLabel ? ` · ${episodeLabel}` : ""}</h1>
          )}
        </div>
        <dl>
          <div><dt>Quality</dt><dd>Resolver managed</dd></div>
          <div><dt>Subtitles</dt><dd>External tracks</dd></div>
          <div><dt>Playback</dt><dd>NOVA custom player</dd></div>
        </dl>
      </div>

      <div className="inner-page-content">
        {isSeries && "seasons" in movie ? (
          <EpisodeBrowser series={movie} initialSeasonNumber={seasonNumber} />
        ) : null}
        <MovieRail
          title={isAnime ? "Anime You May Like" : isSeries ? "More Series" : "Watch Next"}
          eyebrow="More like this"
          movies={similar}
          href={
            isAnime
              ? `/movies/?type=anime&similar=${encodeURIComponent(String(movie.tmdb_id ?? movie.id))}`
              : isSeries
              ? `/series/?similar=${encodeURIComponent(String(movie.tmdb_id ?? movie.id))}`
              : `/movies/?similar=${encodeURIComponent(String(movie.tmdb_id ?? movie.id))}`
          }
        />
      </div>
    </main>
  );
}

