import { FALLBACK_CREDITS, FALLBACK_GENRES, FALLBACK_MOVIES } from "./fallback";
import { withFanartLogo } from "./fanart";
import { distinctRecommendations, organizeHomeData } from "./catalog";
import { withWikipediaPortraits } from "./wikipedia";
import { applyTitleLogoOverride } from "./titleLogos";
import type { Genre, HomeData, Movie, MovieDetails, MoviePage, PersonCredit } from "./types";

const CINEMETA_BASE = "https://v3-cinemeta.strem.io";
const FALLBACK_IMAGE_BASE = "https://image.tmdb.org/t/p";
const CATALOG_PAGE_SIZE = 50;

export const CINEMETA_GENRES: Genre[] = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 100001, name: "Biography" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science Fiction" },
  { id: 100002, name: "Sport" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
];

type CinemetaMeta = {
  id?: string;
  imdb_id?: string;
  moviedb_id?: number;
  name?: string;
  description?: string;
  poster?: string;
  background?: string;
  logo?: string;
  released?: string;
  year?: string;
  releaseInfo?: string;
  imdbRating?: string | number;
  popularity?: number;
  genres?: string[];
  genre?: string[];
  runtime?: string;
  cast?: string[];
  director?: string[];
  type?: string;
};

type CatalogResponse = {
  metas?: CinemetaMeta[];
};

type MetaResponse = {
  meta?: CinemetaMeta;
};

function normalizeGenreName(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized === "sci-fi" ? "science fiction" : normalized;
}

function genreId(name: string) {
  return CINEMETA_GENRES.find(
    (genre) => normalizeGenreName(genre.name) === normalizeGenreName(name),
  )?.id;
}

function genreName(id: number) {
  const name = CINEMETA_GENRES.find((genre) => genre.id === id)?.name;
  return name === "Science Fiction" ? "Sci-Fi" : name;
}

function personId(name: string, index: number) {
  let hash = 0;
  for (let position = 0; position < name.length; position += 1) {
    hash = (hash * 31 + name.charCodeAt(position)) | 0;
  }
  return Math.abs(hash || index + 1);
}

function toPeople(names: string[] = []): PersonCredit[] {
  return names.map((name, index) => ({
    id: personId(name, index),
    name,
    profile_path: null,
  }));
}

function metaGenres(meta: CinemetaMeta) {
  return meta.genres ?? meta.genre ?? [];
}

function toMovie(meta: CinemetaMeta): Movie {
  const names = metaGenres(meta);
  const rating = Number(meta.imdbRating);
  const year = meta.year ?? meta.releaseInfo?.match(/\d{4}/)?.[0] ?? "";
  return applyTitleLogoOverride({
    id: meta.imdb_id ?? meta.id ?? String(meta.moviedb_id ?? ""),
    tmdb_id: meta.moviedb_id,
    title: meta.name?.trim() || "Untitled film",
    original_title: meta.name?.trim() || undefined,
    overview: meta.description?.trim() || "Description unavailable.",
    poster_path: meta.poster || null,
    backdrop_path: meta.background || null,
    logo_url: meta.logo || null,
    release_date: meta.released || (year ? `${year}-01-01` : ""),
    vote_average: Number.isFinite(rating) ? rating : 0,
    popularity: Number(meta.popularity) || 0,
    genre_ids: names.flatMap((name) => {
      const id = genreId(name);
      return id ? [id] : [];
    }),
    adult: false,
  });
}

function parseRuntime(value?: string) {
  const minutes = Number(value?.match(/\d+/)?.[0]);
  return Number.isFinite(minutes) ? minutes : 0;
}

function catalogPath(catalog: string, extras: Record<string, string | number | undefined> = {}) {
  const encodedExtras = Object.entries(extras)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return `/catalog/movie/${catalog}${encodedExtras ? `/${encodedExtras}` : ""}.json`;
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${CINEMETA_BASE}${path}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error(`Cinemeta request failed (${response.status})`);
  return response.json() as Promise<T>;
}

async function requestCatalog(
  catalog: string,
  extras: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
) {
  const data = await request<CatalogResponse>(catalogPath(catalog, extras), signal);
  return (data.metas ?? [])
    .filter((meta) => meta.type === "movie" && (meta.imdb_id || meta.id) && meta.name)
    .map(toMovie);
}

async function requestMeta(id: string | number, signal?: AbortSignal) {
  const data = await request<MetaResponse>(`/meta/movie/${encodeURIComponent(String(id))}.json`, signal);
  if (!data.meta) throw new Error("Cinemeta returned no movie metadata");
  return data.meta;
}

function fallbackPage(items = FALLBACK_MOVIES): MoviePage {
  return {
    page: 1,
    total_pages: 1,
    total_results: items.length,
    results: items,
  };
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function imageUrl(
  path: string | null | undefined,
  size: "w342" | "w500" | "w780" | "w1280" | "original" = "w780",
) {
  if (!path) return "/poster-placeholder.svg";
  if (/^https?:\/\//i.test(path)) return path.replace(/^http:/, "https:");
  if (path.startsWith("//")) return `https:${path}`;
  return `${FALLBACK_IMAGE_BASE}/${size}${path}`;
}

export function releaseYear(movie: Pick<Movie, "release_date">) {
  return movie.release_date?.slice(0, 4) || "—";
}

export function formatRuntime(minutes?: number) {
  if (!minutes) return "Runtime unavailable";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins.toString().padStart(2, "0")}m`;
}

export function genreNames(ids: number[], genres: Genre[] = CINEMETA_GENRES) {
  return ids
    .map((id) => genres.find((genre) => genre.id === id)?.name)
    .filter(Boolean)
    .slice(0, 2)
    .join(" · ");
}

export async function getHomeData(signal?: AbortSignal): Promise<HomeData> {
  try {
    const currentYear = new Date().getFullYear();
    const [trending, nowPlaying, topRated, action] = await Promise.all([
      requestCatalog("top", {}, signal),
      requestCatalog("year", { genre: currentYear }, signal),
      requestCatalog("imdbRating", {}, signal),
      requestCatalog("top", { genre: "Action" }, signal),
    ]);
    const heroMovies = trending.filter((movie) => movie.backdrop_path).slice(0, 10);
    const heroMoviesWithLogos = await Promise.all(
      heroMovies.map((movie) => movie.logo_url ? movie : withFanartLogo(movie, signal)),
    );
    return organizeHomeData({
      trending: heroMoviesWithLogos,
      nowPlaying,
      topRated: topRated
        .filter((movie) => movie.vote_average > 0)
        .sort((a, b) => b.vote_average - a.vote_average),
      action,
      trendingSeries: [],
      airingSeries: [],
      topRatedSeries: [],
      usingFallback: false,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    const heroMovies = await Promise.all(
      FALLBACK_MOVIES.map((movie) => withFanartLogo(movie, signal)),
    );
    return organizeHomeData({
      trending: heroMovies,
      nowPlaying: [...FALLBACK_MOVIES].reverse(),
      topRated: [...FALLBACK_MOVIES].sort((a, b) => b.vote_average - a.vote_average),
      action: FALLBACK_MOVIES.filter((movie) => movie.genre_ids.includes(28)),
      trendingSeries: [],
      airingSeries: [],
      topRatedSeries: [],
      usingFallback: true,
    });
  }
}

export async function getMovie(id: string | number, signal?: AbortSignal): Promise<MovieDetails> {
  if (/^tt\d+$/i.test(String(id))) {
    try {
      const meta = await requestMeta(id, signal);
      const movie = toMovie(meta);
      const directors = toPeople(meta.director);
      const cast = toPeople(meta.cast).slice(0, 8);
      const [movieWithLogo, people] = await Promise.all([
        movie.logo_url ? movie : withFanartLogo(movie, signal),
        withWikipediaPortraits([...directors, ...cast], signal),
      ]);
      const names = metaGenres(meta);
      return {
        ...movieWithLogo,
        runtime: parseRuntime(meta.runtime),
        genres: names.map((name) => ({ id: genreId(name) ?? personId(name, 0), name })),
        directors: people.slice(0, directors.length),
        cast: people.slice(directors.length),
      };
    } catch (error) {
      if (isAbortError(error)) throw error;
    }
  }

  const movie = FALLBACK_MOVIES.find((item) => String(item.id) === String(id)) ?? FALLBACK_MOVIES[0];
  const movieWithLogo = await withFanartLogo(movie, signal);
  const credits = FALLBACK_CREDITS[Number(movie.id)] ?? { cast: [], directors: [] };
  const people = await withWikipediaPortraits([...credits.directors, ...credits.cast], signal);
  return {
    ...movieWithLogo,
    runtime: 126,
    genres: FALLBACK_GENRES.filter((genre) => movie.genre_ids.includes(genre.id)),
    directors: people.slice(0, credits.directors.length),
    cast: people.slice(credits.directors.length),
  };
}

export async function getSimilarMovies(id: string | number, signal?: AbortSignal): Promise<Movie[]> {
  if (/^tt\d+$/i.test(String(id))) {
    try {
      const meta = await requestMeta(id, signal);
      const firstGenre = metaGenres(meta)[0];
      const movies = await requestCatalog("top", { genre: firstGenre }, signal);
      return distinctRecommendations(
        movies
          .filter((movie) => String(movie.id) !== String(id) && movie.poster_path)
          .sort((a, b) => b.vote_average - a.vote_average || (b.popularity ?? 0) - (a.popularity ?? 0)),
      );
    } catch (error) {
      if (isAbortError(error)) throw error;
    }
  }
  return distinctRecommendations(FALLBACK_MOVIES.filter((movie) => String(movie.id) !== String(id)));
}

export async function getGenres(signal?: AbortSignal): Promise<Genre[]> {
  signal?.throwIfAborted();
  return CINEMETA_GENRES;
}

export async function discoverMovies(
  page = 1,
  selectedGenreId?: number,
  sortBy = "popularity.desc",
  signal?: AbortSignal,
): Promise<MoviePage> {
  const skip = Math.max(0, page - 1) * CATALOG_PAGE_SIZE;
  const selectedGenre = selectedGenreId ? genreName(selectedGenreId) : undefined;
  let catalog = "top";
  const extras: Record<string, string | number | undefined> = { skip: skip || undefined };

  if (sortBy.startsWith("vote_average")) {
    catalog = "imdbRating";
    extras.genre = selectedGenre;
  } else if (sortBy.startsWith("primary_release_date") && !selectedGenre) {
    catalog = "year";
    extras.genre = new Date().getFullYear();
  } else {
    extras.genre = selectedGenre;
  }

  try {
    let results = await requestCatalog(catalog, extras, signal);
    if (sortBy === "title.asc") {
      results = [...results].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy.startsWith("vote_average")) {
      results = results
        .filter((movie) => movie.vote_average > 0)
        .sort((a, b) => b.vote_average - a.vote_average);
    } else if (sortBy.startsWith("primary_release_date") && selectedGenre) {
      results = [...results].sort((a, b) => b.release_date.localeCompare(a.release_date));
    }
    const hasMore = results.length === CATALOG_PAGE_SIZE;
    return {
      page,
      total_pages: hasMore ? page + 1 : page,
      total_results: skip + results.length + (hasMore ? 1 : 0),
      results,
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
    const items = selectedGenreId
      ? FALLBACK_MOVIES.filter((movie) => movie.genre_ids.includes(selectedGenreId))
      : FALLBACK_MOVIES;
    return fallbackPage(items);
  }
}

export async function searchMovies(query: string, signal?: AbortSignal): Promise<Movie[]> {
  const cleanQuery = query.trim();
  try {
    const movies = await requestCatalog(
      "top",
      cleanQuery ? { search: cleanQuery } : {},
      signal,
    );
    return movies.filter((movie) => movie.poster_path);
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (!cleanQuery) return FALLBACK_MOVIES;
    const lower = cleanQuery.toLowerCase();
    return FALLBACK_MOVIES.filter((movie) => movie.title.toLowerCase().includes(lower));
  }
}
