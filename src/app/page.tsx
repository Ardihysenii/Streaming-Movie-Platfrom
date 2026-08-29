"use client";

import { useCallback, useEffect, useState } from "react";
import { Hero } from "@/components/Hero";
import { PageLoader } from "@/components/Loading";
import { ContinueRail, ForYouRail, GenreRail, MoodRail, MovieRail } from "@/components/MovieRail";
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
  const series = uniqueMovies(data.trendingSeries, data.topRatedSeries, data.airingSeries).slice(0, 14);
  const discoveryPool = uniqueMovies(
    data.trending,
    data.nowPlaying,
    data.topRated,
    data.action,
    data.trendingSeries,
    data.airingSeries,
    data.topRatedSeries,
  ).slice(0, 50);

  return (
    <main className="home-page">
      <Hero movies={data.trending} />
      <div className="home-content">
        <ContinueRail items={continueWatching} onChange={refreshContinue} />
        <ForYouRail movies={forYou} />
        <MoodRail movies={discoveryPool} />
        <MovieRail
          title="Trending Now"
          eyebrow="The weekly top ten"
          movies={data.trending.slice(0, 10)}
          numbered
          href="/movies/?sort=popularity.desc"
        />
        <MovieRail title="New Releases" eyebrow="Now playing" movies={data.nowPlaying.slice(0, 14)} href="/movies/?sort=primary_release_date.desc" />
        <MovieRail title="Critically Acclaimed" eyebrow="Highly rated" movies={data.topRated.slice(0, 14)} href="/movies/?sort=vote_average.desc" />
        <MovieRail title="High Velocity" eyebrow="Action selection" movies={data.action.slice(0, 14)} href="/movies/?genre=28&sort=popularity.desc" />
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
        <MovieRail
          title="Airing Now"
          eyebrow="New episodes"
          movies={data.airingSeries.slice(0, 14)}
          href="/series/?sort=first_air_date.desc"
        />
        <MovieRail
          title="Essential Television"
          eyebrow="Top rated series"
          movies={data.topRatedSeries.slice(0, 14)}
          href="/series/?sort=vote_average.desc"
        />
      </div>
    </main>
  );
}
