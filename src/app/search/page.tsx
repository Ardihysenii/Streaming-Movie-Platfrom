"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "@/components/Loading";
import { MovieGrid } from "@/components/MovieCard";
import { SearchIcon } from "@/components/Icons";
import { searchCatalog } from "@/lib/tmdb";
import type { SearchScope } from "@/lib/tmdb";
import type { Movie } from "@/lib/types";

const RECENT_SEARCHES_KEY = "nova-recent-searches";
const SCOPE_OPTIONS: Array<{ value: SearchScope; label: string }> = [
  { value: "all", label: "Everything" },
  { value: "movies", label: "Films" },
  { value: "series", label: "Series" },
  { value: "anime", label: "Anime" },
];

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
      const typeParam = scope === "all" ? "" : "&type=" + scope;
      const next = query
        ? "/search/?q=" + encodeURIComponent(query) + typeParam
        : scope === "all" ? "/search/" : "/search/?type=" + scope;
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

  const activeScopeLabel = SCOPE_OPTIONS.find((option) => option.value === scope)?.label ?? "Everything";

  return (
    <main className="search-page search-page-movie">
      <div className="search-atmosphere" aria-hidden="true">
        <span className="search-frame search-frame-one" />
        <span className="search-frame search-frame-two" />
        <span className="search-orbit search-orbit-one" />
        <span className="search-orbit search-orbit-two" />
      </div>

      <header className="search-header">
        <div className="search-intro">
          <div className="search-film-index">DISCOVERY / 01</div>
          <p className="eyebrow">Find your next frame</p>
          <h1>Find a film<br /><span>worth staying for.</span></h1>
          <p className="search-lede">Search a growing library of movies, series, and worlds worth getting lost in.</p>
        </div>

        <form className="search-field" onSubmit={submitSearch} role="search">
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, character, or mood"
            aria-label="Search movies and series"
          />
          <span className="search-count" aria-live="polite">
            {loading ? <LoadingSpinner label="Searching" /> : movies.length + " titles"}
          </span>
        </form>

        <div className="search-tools">
          <div className="search-scopes" role="group" aria-label="Search library">
            {SCOPE_OPTIONS.map((option) => (
              <button
                className={scope === option.value ? "is-active" : ""}
                key={option.value}
                type="button"
                aria-pressed={scope === option.value}
                onClick={() => setScope(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="search-scope-note">Browsing {activeScopeLabel}</span>
        </div>

        {!query && recentSearches.length ? (
          <div className="recent-searches" aria-label="Recent searches">
            <div className="recent-searches-heading">
              <span>Continue exploring</span>
              <button type="button" onClick={clearRecentSearches}>Clear history</button>
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
        <div className="search-results-heading">
          <div>
            <p className="eyebrow">{query ? "Your search" : "Curated starting points"}</p>
            <h2>{query ? "Titles matching “" + query + "”" : "Popular movies & series"}</h2>
          </div>
          <p className="search-results-caption">{loading ? "Scanning the library" : movies.length + " titles in " + activeScopeLabel.toLowerCase()}</p>
        </div>
        {!loading && !movies.length ? (
          <div className="empty-state search-empty-state">
            <span className="search-empty-mark">00</span>
            <h2>No matching frames.</h2>
            <p>Try another title, actor, or a different library filter.</p>
          </div>
        ) : (
          <MovieGrid movies={movies} />
        )}
      </section>
    </main>
  );
}
