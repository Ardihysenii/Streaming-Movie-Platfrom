"use client";

import { useEffect, useState } from "react";
import { CardSkeletons, LoadingSpinner } from "@/components/Loading";
import { MovieGrid } from "@/components/MovieCard";
import { Hero } from "@/components/Hero";
import { discoverAnime, discoverMovies, getFeaturedAnime, getSimilarAnimePage, getSimilarMoviesPage } from "@/lib/tmdb";
import type { Movie } from "@/lib/types";

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [featuredAnime, setFeaturedAnime] = useState<Movie[]>([]);
  const [genreId, setGenreId] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [similarId, setSimilarId] = useState<string | null>(null);
  const [animeMode, setAnimeMode] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isAnime = params.get("type") === "anime";
    setAnimeMode(isAnime);
    const queryGenre = Number(params.get("genre"));
    if (isAnime) setGenreId(16);
    else if (queryGenre && queryGenre !== 16) setGenreId(queryGenre);
    const querySort = params.get("sort");
    if (["popularity.desc", "primary_release_date.desc", "vote_average.desc", "vote_average.desc&vote_count.gte=500", "title.asc"].includes(querySort ?? "")) {
      setSortBy(querySort!);
    }
    setSimilarId(params.get("similar"));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setMovies([]);
    // Clear the previous Hero set while a new catalog page is loading so
    // page changes never leave the old ten titles visible.
    setFeaturedAnime([]);
    const request = similarId
      ? animeMode
        ? getSimilarAnimePage(similarId, page, controller.signal)
        : getSimilarMoviesPage(similarId, page, controller.signal)
      : animeMode
        ? discoverAnime(page, sortBy, controller.signal)
        : discoverMovies(page, genreId, sortBy, controller.signal);
    const featuredRequest = page === 1 && animeMode && !similarId
      ? getFeaturedAnime(controller.signal)
      : Promise.resolve<Movie[]>([]);
    Promise.all([request, featuredRequest])
      .then(([result, featured]) => {
        setMovies(result.results);
        if (animeMode && !similarId) {
          // Keep the curated hero on page one; subsequent pages promote that
          // page's best popularity-sorted results into the Hero.
          setFeaturedAnime(
            page === 1 && featured.length ? featured : result.results.slice(0, 10),
          );
        }
        setTotalPages(result.total_pages);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [animeMode, genreId, page, similarId, sortBy]);

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
      {movies.length ? <Hero movies={(featuredAnime.length && animeMode ? featuredAnime : movies).slice(0, 10)} /> : null}
      <header className="catalog-header">
        <p className="eyebrow">NOVA library</p>
        <h1>{similarId ? animeMode ? "Anime You May Like" : "Movies You May Like" : animeMode ? "Anime" : "Movies"}</h1>
        <p>{similarId ? animeMode ? "More anime selected from this title." : "More films selected from this title." : animeMode ? "Animated stories, collected in one frame." : "New releases, enduring classics, and everything between."}</p>
      </header>

      {loading ? (
        <div className="catalog-loading">
          <LoadingSpinner label="Loading movies" />
          <CardSkeletons count={12} />
        </div>
      ) : (
        <MovieGrid movies={movies} />
      )}
      <nav className="catalog-pagination" aria-label="Movie pages">
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
