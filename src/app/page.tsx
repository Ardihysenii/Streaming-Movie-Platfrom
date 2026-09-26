"use client";

import { useCallback, useEffect, useState } from "react";
import { Hero } from "@/components/Hero";
import { PageLoader } from "@/components/Loading";
import { ContinueRail, ForYouRail, GenreRail, MoodRail, MovieRail, TopTenRail } from "@/components/MovieRail";
import { readContinueWatching } from "@/lib/storage";
import { getHomeData, getNetflixSeries } from "@/lib/tmdb";
import type { ContinueWatchingItem, HomeData } from "@/lib/types";

function uniqueMovies(...groups: HomeData["trending"][]) {
  const seen = new Set<string>();
  return groups.flat().filter((movie) => {
    const key = `${movie.media_type ?? "movie"}:${movie.tmdb_id ?? movie.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [netflixSeries, setNetflixSeries] = useState<HomeData["trending"]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);

  const refreshContinue = useCallback(() => {
    setContinueWatching(
      readContinueWatching().filter((item) => !String(item.id).startsWith("ia:")),
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getHomeData(controller.signal), getNetflixSeries(controller.signal)])
      .then(([home, netflix]) => {
        setData(home);
        setNetflixSeries(netflix);
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

  const forYou = uniqueMovies(
    data.topRated,
    data.trending,
    data.nowPlaying,
    data.trendingSeries,
    data.topRatedSeries,
  );
  const seriesPool = uniqueMovies(data.trendingSeries, data.topRatedSeries, data.airingSeries);
  const mobLand = seriesPool.find((movie) => movie.title.trim().toLowerCase() === "mobland");
  const series = mobLand
    ? [mobLand, ...seriesPool.filter((movie) => movie !== mobLand)].slice(0, 14)
    : seriesPool.slice(0, 14);
  const topTenMovies = mobLand
    ? [
        mobLand,
        ...data.trending
          .filter((movie) => {
            const title = movie.title.trim().toLowerCase();
            return title !== "forgotten island" && title !== "mobland";
          })
          .slice(0, 9),
      ]
    : data.trending.slice(0, 10);
  const heroMovies = mobLand
    ? [
        mobLand,
        ...data.trending.filter((movie) => movie.title.trim().toLowerCase() !== "mobland"),
      ].slice(0, 10)
    : data.trending;
  const discoveryPool = uniqueMovies(
    data.trending,
    data.nowPlaying,
    data.topRated,
    data.action,
    data.trendingSeries,
    data.airingSeries,
    data.topRatedSeries,
  ).slice(0, 50);
  const currentUpcomingSeries = uniqueMovies(data.airingSeries, data.trendingSeries, data.topRatedSeries).slice(0, 14);
  const firstEpisodes = uniqueMovies(data.trendingSeries, data.airingSeries, data.topRatedSeries).slice(0, 14);
  const crimeSeries = uniqueMovies(data.trendingSeries, data.topRatedSeries, data.airingSeries).filter((movie) => movie.genre_ids.includes(80)).slice(0, 14);

  return (
    <main className="home-page">
      <Hero movies={heroMovies} />
      <div className="home-content">
        <TopTenRail movies={topTenMovies} />
        <ContinueRail items={continueWatching} onChange={refreshContinue} />
        <ForYouRail movies={forYou} />
        <MovieRail
          title="Current & Upcoming TV Shows"
          eyebrow="Fresh episodes and returning favorites"
          movies={currentUpcomingSeries}
          href="/series/?sort=first_air_date.desc"
        />
        <MovieRail
          title="First Episodes You Can't Miss"
          eyebrow="Start a new story tonight"
          movies={firstEpisodes}
          href="/series/?sort=popularity.desc"
        />
        {crimeSeries.length ? (
          <MovieRail
            title="Crime Series"
            eyebrow="Cases, crews, and consequences"
            movies={crimeSeries}
            href="/series/?genre=80&sort=popularity.desc"
          />
        ) : null}
        <MovieRail
          title="Trending Today"
          eyebrow="What everyone is watching now"
          movies={data.trending.slice(0, 14)}
          href="/movies/?sort=popularity.desc"
        />
        <MoodRail movies={discoveryPool} />
        <MovieRail
          title="Series"
          eyebrow="Stories worth staying for"
          movies={series}
          href="/series/?sort=popularity.desc"
        />
        {netflixSeries.length ? (
          <MovieRail
            title="Netflix"
            eyebrow="Binge-worthy series"
            movies={netflixSeries}
            href="/series/?network=213&sort=popularity.desc"
          />
        ) : null}
        <GenreRail movies={discoveryPool} />
        <MovieRail title="New Releases" eyebrow="Now playing" movies={data.nowPlaying.slice(0, 14)} href="/movies/?sort=primary_release_date.desc" />
        <MovieRail title="High Velocity" eyebrow="Action selection" movies={data.action.slice(0, 14)} href="/movies/?genre=28&sort=popularity.desc" />
        <MovieRail
          title="Award-Worthy Movies"
          eyebrow="Highly rated films"
          movies={data.topRated.slice(0, 14)}
          href="/movies/?sort=vote_average.desc"
        />
        <MovieRail
          title="Award-Worthy TV Shows"
          eyebrow="Top rated series"
          movies={data.topRatedSeries.slice(0, 14)}
          href="/series/?sort=vote_average.desc"
        />
      </div>
    </main>
  );
}
