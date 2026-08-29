"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, PlayIcon, SearchIcon, StarIcon } from "./Icons";
import { LoadingSpinner } from "./Loading";
import { getSeasonDetails, imageUrl } from "@/lib/tmdb";
import { readContinueWatching } from "@/lib/storage";
import type { SeasonDetails, SeriesDetails } from "@/lib/types";

export function EpisodeBrowser({
  series,
  initialSeasonNumber,
}: {
  series: SeriesDetails;
  initialSeasonNumber?: number;
}) {
  const initialSeason = series.seasons.find((season) => season.season_number === initialSeasonNumber)
    ?? series.seasons.find((season) => season.season_number === 1)
    ?? series.seasons.find((season) => season.season_number > 0)
    ?? series.seasons[0];
  const [seasonNumber, setSeasonNumber] = useState(initialSeason?.season_number ?? 1);
  const [season, setSeason] = useState<SeasonDetails | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [seasonMenuOpen, setSeasonMenuOpen] = useState(false);
  const [continueItems, setContinueItems] = useState(() => readContinueWatching());
  const seasonControlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refreshProgress = () => setContinueItems(readContinueWatching());
    refreshProgress();
    window.addEventListener("nova:continue-updated", refreshProgress);
    window.addEventListener("storage", refreshProgress);
    return () => {
      window.removeEventListener("nova:continue-updated", refreshProgress);
      window.removeEventListener("storage", refreshProgress);
    };
  }, []);

  useEffect(() => {
    if (!seasonMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!seasonControlRef.current?.contains(event.target as Node)) setSeasonMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSeasonMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [seasonMenuOpen]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setSeason(null);
    getSeasonDetails(series.id, seasonNumber, controller.signal)
      .then(setSeason)
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [seasonNumber, series.id]);

  const episodes = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return season?.episodes ?? [];
    return (season?.episodes ?? []).filter((episode) => (
      episode.name.toLowerCase().includes(cleanQuery)
      || String(episode.episode_number) === cleanQuery
      || `episode ${episode.episode_number}`.includes(cleanQuery)
    ));
  }, [query, season]);

  const currentSeason = series.seasons.find((item) => item.season_number === seasonNumber);

  const progressForEpisode = (episode: { season_number: number; episode_number: number }) => {
    // Progress IDs are namespaced by the series ID and episode coordinates.
    // Never match by suffix alone: S01E01 exists in many different series.
    const progressIds = new Set([
      `${series.id}:s${episode.season_number}e${episode.episode_number}`,
      ...(series.tmdb_id !== undefined
        ? [`${series.tmdb_id}:s${episode.season_number}e${episode.episode_number}`]
        : []),
    ]);
    const item = continueItems.find((entry) => progressIds.has(String(entry.id)));
    if (!item) return 0;
    return Math.min(100, Math.max(0, (item.watchedSeconds / Math.max(1, item.estimatedDurationSeconds)) * 100));
  };

  return (
    <section className="episodes-section" aria-labelledby="episodes-title">
      <header className="episodes-heading">
        <span aria-hidden="true" />
        <div>
          <p className="eyebrow">{series.number_of_episodes} episodes across {series.number_of_seasons} seasons</p>
          <h2 id="episodes-title">Episodes</h2>
        </div>
      </header>

      <div className="episode-controls">
        <div className={`season-control${seasonMenuOpen ? " is-open" : ""}`} ref={seasonControlRef}>
          <button
            className="season-trigger"
            type="button"
            aria-haspopup="listbox"
            aria-expanded={seasonMenuOpen}
            onClick={() => setSeasonMenuOpen((open) => !open)}
          >
            <span>{currentSeason?.season_number === 0 ? currentSeason.name : `Season ${seasonNumber}`}</span>
            <ChevronDownIcon />
          </button>
          {seasonMenuOpen ? (
            <div className="season-menu" role="listbox" aria-label="Choose season">
              {series.seasons.map((item) => {
                const label = item.season_number === 0 ? item.name : `Season ${item.season_number}`;
                return (
                  <button
                    className={`season-option${item.season_number === seasonNumber ? " is-selected" : ""}`}
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={item.season_number === seasonNumber}
                    onClick={() => {
                      setSeasonNumber(item.season_number);
                      setQuery("");
                      setSeasonMenuOpen(false);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <label className="episode-search">
          <SearchIcon />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search episode…"
            aria-label="Search episodes"
          />
          {!loading ? <span>{episodes.length}</span> : null}
        </label>
      </div>

      {loading ? (
        <div className="episode-loading">
          <LoadingSpinner label={`Loading season ${seasonNumber}`} />
        </div>
      ) : episodes.length ? (
        <div className="episode-list" tabIndex={0} aria-label={`Season ${seasonNumber} episodes`}>
          {episodes.map((episode) => {
            const episodeProgress = progressForEpisode(episode);
            return (
              <Link
                className="episode-card"
                href={`/watch/?id=${series.id}&type=tv&season=${episode.season_number}&episode=${episode.episode_number}`}
                key={episode.id}
              >
                <div className="episode-copy">
                  <div className="episode-title-row">
                    <span>{episode.episode_number}.</span>
                    <h3>{episode.name}</h3>
                  </div>
                  <p>{episode.overview}</p>
                  <div className="episode-meta">
                    {episode.vote_average > 0 ? (
                      <span className="episode-rating">
                        <StarIcon /> {episode.vote_average.toFixed(1)}
                      </span>
                    ) : null}
                    {episode.runtime ? <span>{episode.runtime}m</span> : null}
                    {episode.air_date ? <span>{episode.air_date.slice(0, 4)}</span> : null}
                  </div>
                </div>
                <div className="episode-still">
                  <Image
                    src={imageUrl(episode.still_path || series.backdrop_path, "w500")}
                    alt={`${series.title} ${episode.name}`}
                    fill
                    sizes="(max-width: 720px) 38vw, 240px"
                  />
                  <span className="episode-play" aria-hidden="true"><PlayIcon /></span>
                  {episodeProgress > 0 ? (
                    <span
                      className="episode-progress"
                      aria-label={`${Math.round(episodeProgress)} percent watched`}
                    >
                      <i style={{ width: `${episodeProgress}%` }} />
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty-state episode-empty">
          <h3>No matching episodes.</h3>
          <p>Try another episode title or number.</p>
        </div>
      )}
    </section>
  );
}
