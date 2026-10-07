"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import CustomMoviePlayer from "@/components/CustomMoviePlayer";
import { BackIcon } from "@/components/Icons";
import { EpisodeBrowser } from "@/components/EpisodeBrowser";
import { PageLoader } from "@/components/Loading";
import { getSavedProgress, saveWatchProgress } from "@/lib/storage";
import { getMovie, getSeries } from "@/lib/tmdb";
import type { Movie, MovieDetails, SeriesDetails } from "@/lib/types";

export default function WatchPage() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id")?.trim() ?? "";
  const queryImdbId = searchParams.get("imdbId")?.trim() ?? "";
  const queryType = searchParams.get("type") === "tv" ? "tv" : "movie";
  const querySeason = Number(searchParams.get("season"));
  const queryEpisode = Number(searchParams.get("episode"));
  const playerSeed: MovieDetails | SeriesDetails | null = queryId && (queryType !== "tv" || (querySeason && queryEpisode))
    ? ({
        id: queryImdbId || queryId,
        tmdb_id: /^\d+$/.test(queryId) ? Number(queryId) : undefined,
        media_type: queryType,
        title: queryType === "tv" ? "Starting your episode…" : "Starting your movie…",
        overview: "",
        poster_path: null,
        backdrop_path: null,
        release_date: "",
        vote_average: 0,
        vote_count: 0,
        popularity: 0,
        genre_ids: [],
        runtime: 0,
        genres: [],
        cast: [],
        ...(queryType === "tv"
          ? { creators: [], seasons: [], number_of_seasons: 0, number_of_episodes: 0 }
          : { directors: [] }),
      } as MovieDetails | SeriesDetails)
    : null;
  const [movie, setMovie] = useState<MovieDetails | SeriesDetails | null>(playerSeed);
  const [detailsLoaded, setDetailsLoaded] = useState(false);
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
    setMovie(playerSeed);
    setDetailsLoaded(false);
    setResumeAt(0);
    setContinueItem(null);
    lastSavedProgressRef.current = 0;
    if (!id || (type === "tv" && (!season || !episode))) {
      setMissingId(true);
      return () => controller.abort();
    }

    const detailsRequest = type === "tv" ? getSeries(id, controller.signal) : getMovie(id, controller.signal);
    setIsSeries(type === "tv");
    setSeasonNumber(type === "tv" ? season : undefined);
    setEpisodeNumber(type === "tv" ? episode : undefined);

    detailsRequest
      .then((details) => {
        const progressId = type === "tv" ? String(queryImdbId || id) + ":s" + season + "e" + episode : id;
        // TMDB detail records use the IMDb ID as `id`, while cards and watch
        // URLs commonly use the numeric TMDB ID. Check both aliases so a
        // movie always resumes the exact position that was saved for it.
        const progressIds: Array<string | number> = type === "tv"
          ? [progressId]
          : [details.id, details.tmdb_id, queryImdbId, progressId].filter(
              (value, index, values): value is string | number => (
                value !== undefined && values.indexOf(value) === index
              ),
            );
        const progress = progressIds.reduce<number>(
          (saved, candidate) => saved || getSavedProgress(candidate),
          0,
        );
        setMovie(details);
        setDetailsLoaded(true);
        const continueItem: Movie = type === "tv"
          ? {
              ...details,
              id: progressId,
              series_id: details.id,
              season_number: season,
              episode_number: episode,
              title: details.title + " · S" + season.toString().padStart(2, "0") + " E" + episode.toString().padStart(2, "0"),
            }
          : details;
        setResumeAt(progress);
        setContinueItem(continueItem);
      })
      .catch(() => undefined);


    return () => controller.abort();
  }, [queryEpisode, queryId, queryImdbId, querySeason, queryType]);

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

  const detailsHref = isSeries ? `/series/details/?id=${movie.id}` : `/movie/?id=${movie.id}`;
  const releaseYear = String(movie.release_date ?? "").slice(0, 4);
  const runtimeMinutes = movie.runtime ?? 0;
  const runtimeLabel = runtimeMinutes > 0
    ? [Math.floor(runtimeMinutes / 60) ? `${Math.floor(runtimeMinutes / 60)}h` : "", runtimeMinutes % 60 ? `${runtimeMinutes % 60}m` : ""].filter(Boolean).join(" ")
    : "";

  return (
    <main className="watch-page watch-page-cinema">
      {movie.backdrop_path ? (
        <div className="watch-cinema-ambient" aria-hidden="true">
          <Image src={"https://image.tmdb.org/t/p/w1280" + movie.backdrop_path} alt="" fill sizes="100vw" />
        </div>
      ) : null}
      <header className="watch-header watch-cinema-header">
        <Link className="back-link" href={detailsHref}>
          <BackIcon /> Back to details
        </Link>
        <div className="watch-cinema-brand"><span className="watch-cinema-brand-mark" aria-hidden="true" />NIGHTOWL <span className="watch-cinema-brand-label">Cinema</span></div>
      </header>

      <section className="player-shell provider-player-shell">
        <CustomMoviePlayer
          key={`${queryId}:${seasonNumber ?? ""}:${episodeNumber ?? ""}`}
          // The watch URL ID is the authoritative TMDB ID for the provider.
          // Do not fall back to the movie/IMDb identifier when a numeric TMDB ID is present.
          tmdbId={/^\d+$/.test(queryId) ? queryId : movie.tmdb_id ?? movie.id}
          imdbId={movie.id}
          mediaType={isSeries ? "tv" : "movie"}
          seasonNumber={seasonNumber}
          episodeNumber={episodeNumber}
          resumeAt={resumeAt}
          onProgress={handleProgress}
          title={movie.title}
          overview={movie.overview}
          releaseYear={String(movie.release_date ?? "").slice(0, 4)}
          runtimeMinutes={movie.runtime ?? 0}
          rating={movie.vote_average ?? 0}
          backdropUrl={movie.backdrop_path ? "https://image.tmdb.org/t/p/w1280" + movie.backdrop_path : ""}
          posterUrl={movie.poster_path ? "https://image.tmdb.org/t/p/w780" + movie.poster_path : ""}
          logoUrl={movie.logo_url ?? ""}
          logoWidth={movie.logo_width}
          logoHeight={movie.logo_height}
        />
      </section>

      <section className="watch-cinema-info" aria-label="Now watching">
        <div className="watch-cinema-title-group">
          <p className="watch-cinema-kicker"><span aria-hidden="true" />Now watching</p>
          <h1>{movie.title}</h1>
          <div className="watch-cinema-facts">
            <span className="watch-cinema-type">{isSeries ? "Series" : "Film"}</span>
            {releaseYear ? <span>{releaseYear}</span> : null}
            {runtimeLabel ? <span>{runtimeLabel}</span> : null}
            {episodeLabel ? <span className="watch-cinema-episode">{episodeLabel}</span> : null}
            {movie.vote_average > 0 ? <span className="watch-cinema-rating" aria-label={`Rating ${movie.vote_average.toFixed(1)} out of 10`}><span aria-hidden="true">★</span> {movie.vote_average.toFixed(1)}</span> : null}
          </div>
        </div>
        <Link className="watch-cinema-details" href={detailsHref}>About this title <span aria-hidden="true">↗</span></Link>
      </section>

      {detailsLoaded && isSeries && "seasons" in movie ? (
        <section className="inner-page-content watch-cinema-episodes" aria-label="Episode selection">
          <EpisodeBrowser series={movie} initialSeasonNumber={seasonNumber} />
        </section>
      ) : null}
    </main>
  );
}

