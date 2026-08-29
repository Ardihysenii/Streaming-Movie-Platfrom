"use client";

import { useEffect, useState } from "react";
import { CardSkeletons, LoadingSpinner } from "@/components/Loading";
import { MovieGrid } from "@/components/MovieCard";
import { Hero } from "@/components/Hero";
import { discoverSeries, getFeaturedSeries, getSimilarSeriesPage } from "@/lib/tmdb";
import type { Movie } from "@/lib/types";

export default function SeriesCatalogPage() {
  const [series, setSeries] = useState<Movie[]>([]);
  const [featuredSeries, setFeaturedSeries] = useState<Movie[]>([]);
  const [genreId, setGenreId] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [similarId, setSimilarId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryGenre = Number(params.get("genre"));
    if (queryGenre && queryGenre !== 16) setGenreId(queryGenre);
    const querySort = params.get("sort");
    if (["popularity.desc", "first_air_date.desc", "vote_average.desc", "name.asc"].includes(querySort ?? "")) {
      setSortBy(querySort!);
    }
    setSimilarId(params.get("similar"));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setSeries([]);
    // Reset the previous Hero set so every pagination click gets its own
    // ten-title Hero instead of retaining page one's curated titles.
    setFeaturedSeries([]);
    const request = similarId
      ? getSimilarSeriesPage(similarId, page, controller.signal)
      : discoverSeries(page, genreId, sortBy, controller.signal);
    const featuredRequest = page === 1 && !similarId
      ? getFeaturedSeries(controller.signal)
      : Promise.resolve<Movie[]>([]);
    Promise.all([request, featuredRequest])
      .then(([result, featured]) => {
        setSeries(result.results);
        if (!similarId) {
          // Page one uses the known curated shows; later pages use the best
          // popularity-sorted results from that page.
          setFeaturedSeries(
            page === 1 && featured.length ? featured : result.results.slice(0, 10),
          );
        }
        setTotalPages(result.total_pages);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [genreId, page, similarId, sortBy]);

  const paginationStart = Math.max(1, Math.min(page - 2, Math.max(1, totalPages - 4)));
  const paginationPages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => paginationStart + index,
  );

  function goToPage(nextPage: number) {
    setPage(Math.max(1, Math.min(totalPages, nextPage)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="catalog-page">
      {series.length ? <Hero movies={(featuredSeries.length ? featuredSeries : series).slice(0, 10)} /> : null}
      <header className="catalog-header">
        <p className="eyebrow">NOVA television</p>
        <h1>{similarId ? "Series You May Like" : "TV Shows"}</h1>
        <p>{similarId ? "More series selected from this title." : "Complete seasons, new episodes, and stories built to last."}</p>
      </header>

      {loading ? (
        <div className="catalog-loading">
          <LoadingSpinner label="Loading series" />
          <CardSkeletons count={12} />
        </div>
      ) : (
        <MovieGrid movies={series} />
      )}
      <nav className="catalog-pagination" aria-label="Series pages">
        <button type="button" disabled={page <= 1 || loading} onClick={() => goToPage(page - 1)} aria-label="Previous page">←</button>
        {paginationPages.map((pageNumber) => (
          <button
            type="button"
            className={pageNumber === page ? "is-active" : ""}
            disabled={loading}
            key={pageNumber}
            onClick={() => goToPage(pageNumber)}
            aria-current={pageNumber === page ? "page" : undefined}
          >
            {pageNumber}
          </button>
        ))}
        <button type="button" disabled={page >= totalPages || loading} onClick={() => goToPage(page + 1)} aria-label="Next page">→</button>
      </nav>
    </main>
  );
}
