"use client";

import { useCallback, useEffect, useState } from "react";
import { Hero } from "@/components/Hero";
import { PageLoader } from "@/components/Loading";
import { ContinueRail, ForYouRail, GenreRail, MoodRail, MovieRail, TopTenRail } from "@/components/MovieRail";
import { readContinueWatching } from "@/lib/storage";
import { discoverAnime, discoverSeries, getHomeData, getNetflixSeries, isReleased } from "@/lib/tmdb";
import type { ContinueWatchingItem, HomeData } from "@/lib/types";

type HomeFilter = "all" | "movies" | "series" | "anime";

function filterForHome(movies: HomeData["trending"], filter: HomeFilter) {
  if (filter === "movies") return movies.filter((movie) => movie.media_type !== "tv" && !movie.genre_ids.includes(16));
  if (filter === "series") return movies.filter((movie) => movie.media_type === "tv" && !movie.genre_ids.includes(16));
  if (filter === "anime") return movies.filter((movie) => movie.genre_ids.includes(16));
  return movies;
}

function homeFilterFromUrl(): HomeFilter {
  if (typeof window === "undefined") return "all";
  const value = new URLSearchParams(window.location.search).get("type");
  return value === "movies" || value === "series" || value === "anime" ? value : "all";
}

function uniqueMovies(...groups: HomeData["trending"][]) {
  const seen = new Set<string>();
  return groups.flat().filter((movie) => {
    const key = `${movie.media_type ?? "movie"}:${movie.tmdb_id ?? movie.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function movieIdentity(movie: HomeData["trending"][number]) {
  return `${movie.media_type ?? "movie"}:${movie.tmdb_id ?? movie.id}`;
}

function excludeMovies(movies: HomeData["trending"], excluded: HomeData["trending"]) {
  const blocked = new Set(excluded.map(movieIdentity));
  return movies.filter((movie) => !blocked.has(movieIdentity(movie)));
}

function releasedHomePool(data: HomeData) {
  return uniqueMovies(
    data.trending,
    data.nowPlaying,
    data.topRated,
    data.action,
    data.trendingSeries,
    data.airingSeries,
    data.topRatedSeries,
  ).filter(isReleased);
}

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [netflixSeries, setNetflixSeries] = useState<HomeData["trending"]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);
  const [homeFilter, setHomeFilter] = useState<HomeFilter>("all");
  const [animeItems, setAnimeItems] = useState<HomeData["trending"]>([]);
  const [crimeSeriesItems, setCrimeSeriesItems] = useState<HomeData["trending"]>([]);

  const refreshContinue = useCallback(() => {
    setContinueWatching(
      readContinueWatching().filter((item) => !String(item.id).startsWith("ia:")),
    );
  }, []);

  useEffect(() => {
    const applyFilter = (value: unknown) => {
      if (value === "movies" || value === "series" || value === "anime") setHomeFilter(value);
      else setHomeFilter("all");
    };
    applyFilter(homeFilterFromUrl());
    const handleFilter = (event: Event) => applyFilter((event as CustomEvent).detail);
    window.addEventListener("nova:home-filter", handleFilter);
    return () => window.removeEventListener("nova:home-filter", handleFilter);
  }, []);

  useEffect(() => {
    if (homeFilter !== "anime") {
      setAnimeItems([]);
      return;
    }
    const controller = new AbortController();
    discoverAnime(1, "popularity.desc", controller.signal)
      .then((result) => setAnimeItems(result.results))
      .catch(() => undefined);
    return () => controller.abort();
  }, [homeFilter]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getHomeData(controller.signal),
      getNetflixSeries(controller.signal),
      discoverSeries(1, 80, "popularity.desc", controller.signal).catch(() => ({ results: [] as HomeData["trending"] })),
    ])
      .then(([home, netflix, crime]) => {
        setData(home);
        setNetflixSeries(netflix);
        setCrimeSeriesItems(crime.results);
      })
      .catch(() => undefined);
    refreshContinue();
    window.addEventListener("nova:continue-updated", refreshContinue);
    window.addEventListener("storage", refreshContinue);
    return () => {
      controller.abort();
      window.removeEventListener("nova:continue-updated", refreshContinue);
      window.removeEventListener("storage", refreshContinue);
    };
  }, [refreshContinue]);

  if (!data) return <PageLoader label="Preparing tonight's selection" />;

  const isFilteredHome = homeFilter !== "all";
  const allHomeMovies = uniqueMovies(
    data.trending,
    data.nowPlaying,
    data.topRated,
    data.action,
    data.trendingSeries,
    data.airingSeries,
    data.topRatedSeries,
  );
  const categoryPool = homeFilter === "anime"
    ? uniqueMovies(filterForHome(allHomeMovies, "anime"), animeItems).slice(0, 90)
    : filterForHome(allHomeMovies, homeFilter).slice(0, 90);
  const filteredSections = {
    hero: [] as HomeData["trending"],
    topTen: [] as HomeData["trending"],
    recommendations: [] as HomeData["trending"],
    current: [] as HomeData["trending"],
    firstEpisodes: [] as HomeData["trending"],
    crime: [] as HomeData["trending"],
    trending: [] as HomeData["trending"],
    mood: [] as HomeData["trending"],
    series: [] as HomeData["trending"],
    netflix: [] as HomeData["trending"],
    genres: [] as HomeData["trending"],
    newReleases: [] as HomeData["trending"],
    action: [] as HomeData["trending"],
    topRated: [] as HomeData["trending"],
    awardSeries: [] as HomeData["trending"],
  };
  if (isFilteredHome) {
    let cursor = 0;
    const take = (count: number) => {
      if (!categoryPool.length) return [];
      const result = Array.from({ length: count }, (_, index) => categoryPool[(cursor + index) % categoryPool.length]);
      cursor += count;
      return uniqueMovies(result);
    };
    filteredSections.hero = take(10);
    filteredSections.topTen = take(10);
    filteredSections.recommendations = take(14);
    filteredSections.current = take(14);
    filteredSections.firstEpisodes = take(14);
    filteredSections.crime = take(14);
    filteredSections.trending = take(14);
    filteredSections.mood = take(14);
    filteredSections.series = take(14);
    filteredSections.netflix = take(14);
    filteredSections.genres = take(14);
    filteredSections.newReleases = take(14);
    filteredSections.action = take(14);
    filteredSections.topRated = take(14);
    filteredSections.awardSeries = take(14);
  }
  const forYou = isFilteredHome
    ? filteredSections.recommendations
    : excludeMovies(
        uniqueMovies(data.topRated, data.trending, data.nowPlaying, data.trendingSeries, data.topRatedSeries),
        isFilteredHome ? filteredSections.topTen : [],
      ).slice(0, 14);
  const seriesPool = uniqueMovies(data.trendingSeries, data.airingSeries, data.topRatedSeries);
  const recentSeriesCutoff = new Date();
  recentSeriesCutoff.setMonth(recentSeriesCutoff.getMonth() - 15);
  const recentTrendingSeries = data.trendingSeries.filter((movie) => {
    const date = Date.parse(movie.release_date);
    return Number.isFinite(date) && date >= recentSeriesCutoff.getTime();
  });
  const currentSeriesPool = uniqueMovies(data.airingSeries, recentTrendingSeries);
  const americanHorrorStory = seriesPool.find((movie) => movie.title.trim().toLowerCase() === "american horror story");
  const series = isFilteredHome
    ? filteredSections.series
    : americanHorrorStory
      ? [americanHorrorStory, ...excludeMovies(seriesPool.filter((movie) => movie !== americanHorrorStory), currentSeriesPool)].slice(0, 14)
      : excludeMovies(seriesPool, currentSeriesPool).slice(0, 14);
  const releasedHomeItems = releasedHomePool(data);
  const mixedHomepageFeatured = americanHorrorStory
    ? [americanHorrorStory, ...excludeMovies(releasedHomeItems, [americanHorrorStory])]
    : releasedHomeItems;
  const topTenMovies = isFilteredHome
    ? filteredSections.topTen
    : mixedHomepageFeatured.slice(0, 10);
  const heroMovies = isFilteredHome
    ? filteredSections.hero
    : mixedHomepageFeatured.slice(0, 10);
  const discoveryPool = isFilteredHome ? filteredSections.mood : allHomeMovies.slice(0, 50);
  const currentUpcomingSeries = isFilteredHome
    ? filteredSections.current
    : currentSeriesPool.slice(0, 14);
  const firstEpisodes = isFilteredHome
    ? filteredSections.firstEpisodes
    : excludeMovies(uniqueMovies(data.trendingSeries, data.airingSeries), currentUpcomingSeries).slice(0, 14);
  const crimeSeries = isFilteredHome
    ? filteredSections.crime
    : excludeMovies(
        uniqueMovies(
          crimeSeriesItems,
          data.trendingSeries,
          data.topRatedSeries,
          data.airingSeries,
        ).filter((movie) => movie.media_type === "tv" && movie.genre_ids.includes(80)),
        [...currentUpcomingSeries, ...firstEpisodes],
      ).slice(0, 14);
  const visibleNetflixSeries = isFilteredHome ? filteredSections.netflix : netflixSeries;
  const filteredContinue = isFilteredHome
    ? continueWatching.filter((item) => filterForHome([item], homeFilter).length > 0)
    : continueWatching;
  const categoryLabel = homeFilter === "series" ? "TV Shows" : homeFilter === "anime" ? "Anime" : "Movies";
  return (
    <main className="home-page">
      <Hero movies={heroMovies} />
      <div className="home-content">
        <TopTenRail movies={topTenMovies} title={isFilteredHome ? `Top 10 ${categoryLabel} on` : "Top 10 on"} />
        {filteredContinue.length ? <ContinueRail items={filteredContinue} onChange={refreshContinue} /> : null}
        {isFilteredHome ? (
          <MovieRail
            title={`Because You Watched ${categoryLabel}`}
            eyebrow="Recommended for this category"
            movies={forYou}
          />
        ) : (
          <ForYouRail movies={forYou} />
        )}
        <MovieRail
          title={isFilteredHome ? `Current & Upcoming ${categoryLabel}` : "Current & Upcoming TV Shows"}
          eyebrow="Fresh episodes and returning favorites"
          movies={currentUpcomingSeries}
          href="/series/?sort=first_air_date.desc"
        />
        <MovieRail
          title={isFilteredHome && homeFilter !== "series" ? `More ${categoryLabel} To Watch` : "First Episodes You Can't Miss"}
          eyebrow="Start a new story tonight"
          movies={firstEpisodes}
          href="/series/?sort=popularity.desc"
        />
        {crimeSeries.length ? (
          <MovieRail
            title={isFilteredHome ? `${categoryLabel} Crime Picks` : "Crime Series"}
            eyebrow="Cases, crews, and consequences"
            movies={crimeSeries}
            href="/series/?genre=80&sort=popularity.desc"
          />
        ) : null}
        <MovieRail
          title={isFilteredHome ? `${categoryLabel} Trending Today` : "Trending Today"}
          eyebrow="What everyone is watching now"
          movies={isFilteredHome ? filteredSections.trending : data.trending.slice(0, 14)}
          href="/movies/?sort=popularity.desc"
        />
        <MoodRail movies={discoveryPool} />
        <MovieRail
          title={isFilteredHome ? categoryLabel : "Series"}
          eyebrow="Stories worth staying for"
          movies={series}
          href="/series/?sort=popularity.desc"
        />
        {visibleNetflixSeries.length ? (
          <MovieRail
            title={isFilteredHome ? `Featured ${categoryLabel}` : "Netflix"}
            eyebrow={isFilteredHome ? `More ${categoryLabel} picks` : "Binge-worthy series"}
            movies={visibleNetflixSeries}
            href={isFilteredHome ? homeFilter === "series" ? "/series/" : homeFilter === "anime" ? "/movies/?type=anime" : "/movies/" : "/series/?network=213&sort=popularity.desc"}
          />
        ) : null}
        <GenreRail movies={isFilteredHome ? filteredSections.genres : discoveryPool} />
        <MovieRail title={isFilteredHome ? `${categoryLabel} New Releases` : "New Releases"} eyebrow="Now playing" movies={isFilteredHome ? filteredSections.newReleases : data.nowPlaying.slice(0, 14)} href="/movies/?sort=primary_release_date.desc" />
        <MovieRail title={isFilteredHome ? `More ${categoryLabel}` : "High Velocity"} eyebrow={isFilteredHome ? `More ${categoryLabel.toLowerCase()} worth watching` : "Action selection"} movies={isFilteredHome ? filteredSections.action : data.action.slice(0, 14)} href="/movies/?genre=28&sort=popularity.desc" />
        <MovieRail
          title={isFilteredHome ? `Top Rated ${categoryLabel}` : "Award-Worthy Movies"}
          eyebrow="Highly rated films"
          movies={isFilteredHome ? filteredSections.topRated : data.topRated.slice(0, 14)}
          href="/movies/?sort=vote_average.desc"
        />
        <MovieRail
          title={isFilteredHome ? `More ${categoryLabel}` : "Award-Worthy TV Shows"}
          eyebrow={isFilteredHome ? `Top rated ${categoryLabel.toLowerCase()}` : "Top rated series"}
          movies={isFilteredHome ? filteredSections.awardSeries : data.topRatedSeries.slice(0, 14)}
          href="/series/?sort=vote_average.desc"
        />
      </div>
    </main>
  );
}
