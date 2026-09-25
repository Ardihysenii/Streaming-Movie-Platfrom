"use client";

import { useCallback, useEffect, useState } from "react";
import { Hero } from "@/components/Hero";
import { PageLoader } from "@/components/Loading";
import { ContinueRail, ForYouRail, MovieRail, TopTenRail } from "@/components/MovieRail";
import { readContinueWatching } from "@/lib/storage";
import { getHomeData } from "@/lib/tmdb";
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
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);

  const refreshContinue = useCallback(() => {
    setContinueWatching(
      readContinueWatching().filter((item) => !String(item.id).startsWith("ia:")),
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getHomeData(controller.signal)
      .then(setData)
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

  return (
    <main className="home-page">
      <Hero movies={heroMovies} />
      <div className="home-content">
        <TopTenRail movies={topTenMovies} />
        <ContinueRail items={continueWatching} onChange={refreshContinue} />
        <ForYouRail movies={forYou} />
        <MovieRail
          title="Trending Now"
          eyebrow="Popular this week"
          movies={data.trending.slice(0, 10)}
          numbered
          href="/movies/?sort=popularity.desc"
        />
      </div>
    </main>
  );
}
