"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "@/components/Loading";
import { MovieGrid } from "@/components/MovieCard";
import { SearchIcon } from "@/components/Icons";
import { searchCatalog } from "@/lib/tmdb";
import type { SearchScope } from "@/lib/tmdb";
import type { Movie } from "@/lib/types";

const RECENT_SEARCHES_KEY = "nova-recent-searches";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [scope, setScope] = useState<SearchScope>("all");
  const [loading, setLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("q") ?? "";
    const type = params.get("type");
    setScope(type === "movies" || type === "series" || type === "anime" ? type : "all");
    setQuery(initial);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]");
      if (Array.isArray(saved)) {
        setRecentSearches(saved.filter((value): value is string => typeof value === "string").slice(0, 6));
      }
    } catch {
      // Local storage can be unavailable in private browsing modes.
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      searchCatalog(query, controller.signal, scope)
        .then(setMovies)
        .catch(() => undefined)
        .finally(() => setLoading(false));
      const typeParam = scope === "all" ? "" : `&type=${scope}`;
      const next = query
        ? `/search/?q=${encodeURIComponent(query)}${typeParam}`
        : scope === "all" ? "/search/" : `/search/?type=${scope}`;
      window.history.replaceState({}, "", next);
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, scope]);

  function rememberSearch(value: string) {
    const term = value.trim();
    if (!term) return;
    setRecentSearches((current) => {
      const next = [term, ...current.filter((entry) => entry.toLowerCase() !== term.toLowerCase())].slice(0, 6);
      try {
        window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {
        // Keep the in-memory list when local storage is unavailable.
      }
      return next;
    });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    rememberSearch(query);
  }

  function clearRecentSearches() {
    setRecentSearches([]);
    try {
      window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
  }

  return (
    <main className="search-page">
      <div className="search-atmosphere" aria-hidden="true">
        <span className="search-frame search-frame-one" />
        <span className="search-frame search-frame-two" />
        <span className="search-orbit search-orbit-one" />
        <span className="search-orbit search-orbit-two" />
      </div>
      <header className="search-header">
        <p className="eyebrow">Find your next frame</p>
        <form className="search-field" onSubmit={submitSearch} role="search">
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search movies or series…"
            aria-label="Search movies and series"
          />
          {loading ? <LoadingSpinner label="Searching" /> : <span className="search-count">{movies.length}</span>}
        </form>
        {!query && recentSearches.length ? (
          <div className="recent-searches" aria-label="Recent searches">
            <div className="recent-searches-heading">
              <span>Recent searches</span>
              <button type="button" onClick={clearRecentSearches}>Clear</button>
            </div>
            <div className="recent-searches-list">
              {recentSearches.map((term) => (
                <button
                  className="recent-search-chip"
                  key={term}
                  type="button"
                  onClick={() => {
                    setQuery(term);
                    rememberSearch(term);
                  }}
                >
                  <SearchIcon />
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </header>
      <section className="search-results">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{query ? "Search results" : "Starting points"}</p>
            <h1>{query ? `Titles matching “${query}”` : "Popular movies & series"}</h1>
          </div>
        </div>
        {!loading && !movies.length ? (
          <div className="empty-state">
            <h2>No matching frames.</h2>
            <p>Try another title or check the spelling.</p>
          </div>
        ) : (
          <MovieGrid movies={movies} />
        )}
      </section>
    </main>
  );
}
