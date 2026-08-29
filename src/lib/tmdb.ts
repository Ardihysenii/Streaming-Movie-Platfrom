import {
  CINEMETA_GENRES,
  discoverMovies as discoverCinemetaMovies,
  formatRuntime,
  genreNames,
  getGenres as getCinemetaGenres,
  getHomeData as getCinemetaHomeData,
  getMovie as getCinemetaMovie,
  getSimilarMovies as getCinemetaSimilarMovies,
  imageUrl,
  releaseYear,
  searchMovies as searchCinemetaMovies,
} from "./cinemeta";
import { withFanartLogo } from "./fanart";
import { distinctRecommendations, organizeHomeData } from "./catalog";
import { applyTitleLogoOverride } from "./titleLogos";
import type {
  Episode,
  Genre,
  HomeData,
  Movie,
  MovieDetails,
  MoviePage,
  PersonDetails,
  PersonCredit,
  SeasonDetails,
  SeasonSummary,
  SeriesDetails,
} from "./types";

export { CINEMETA_GENRES, formatRuntime, genreNames, imageUrl, releaseYear };

export function isReleased(item: Pick<Movie, "release_date">) {
  const releaseDate = item.release_date?.trim();
  if (!releaseDate) return true;
  const timestamp = Date.parse(releaseDate);
  return !Number.isFinite(timestamp) || timestamp <= Date.now();
}

// These titles are currently available as camera-release sources. Keep this
// small catalog annotation separate from TMDB metadata so the card badge can
// show the source version without changing poster, title, or release data.
const CATALOG_QUALITY_OVERRIDES: Record<number, string> = {
  1368337: "CAM", // The Odyssey
  969681: "CAM", // Spider-Man: Brand New Day
};

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY?.trim();

type TmdbMovie = {
  id: number;
  title?: string;
  original_title?: string;
  original_language?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
  adult?: boolean;
};

type TmdbSeries = {
  id: number;
  name?: string;
  original_name?: string;
  original_language?: string;
  genres?: Genre[];
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
  adult?: boolean;
};

type TmdbPerson = {
  id: number;
  name: string;
  profile_path?: string | null;
  character?: string;
  job?: string;
};

type TmdbPersonDetails = {
  id: number;
  name?: string;
  biography?: string;
  birthday?: string | null;
  place_of_birth?: string | null;
  profile_path?: string | null;
  known_for_department?: string;
};

type TmdbMovieCredits = {
  cast?: TmdbMovie[];
  crew?: TmdbMovie[];
};

type TmdbImage = {
  file_path: string;
  width?: number;
  height?: number;
  iso_639_1?: string | null;
};

type TmdbVideo = {
  key: string;
  name?: string;
  official?: boolean;
  published_at?: string;
  site?: string;
  type?: string;
};

type TmdbMovieDetails = TmdbMovie & {
  runtime?: number;
  genres?: Genre[];
  tagline?: string;
  status?: string;
  external_ids?: { imdb_id?: string | null };
  credits?: { cast?: TmdbPerson[]; crew?: TmdbPerson[] };
  images?: { logos?: TmdbImage[] };
  videos?: { results?: TmdbVideo[] };
};

type TmdbSeasonSummary = {
  id: number;
  name?: string;
  overview?: string;
  air_date?: string;
  episode_count?: number;
  poster_path?: string | null;
  season_number?: number;
};

type TmdbEpisode = {
  id: number;
  name?: string;
  overview?: string;
  air_date?: string;
  episode_number?: number;
  season_number?: number;
  runtime?: number | null;
  still_path?: string | null;
  vote_average?: number;
};

type TmdbSeriesDetails = TmdbSeries & {
  episode_run_time?: number[];
  genres?: Genre[];
  tagline?: string;
  status?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: TmdbSeasonSummary[];
  created_by?: TmdbPerson[];
  last_episode_to_air?: { runtime?: number | null };
  external_ids?: { imdb_id?: string | null };
  credits?: { cast?: TmdbPerson[]; crew?: TmdbPerson[] };
  images?: { logos?: TmdbImage[] };
  videos?: { results?: TmdbVideo[] };
};

type TmdbPage = {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbMovie[];
};

type TmdbSeriesPage = {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbSeries[];
};

type TmdbPeoplePage = {
  results?: TmdbPerson[];
};

type TmdbSeasonDetails = TmdbSeasonSummary & {
  episodes?: TmdbEpisode[];
};

type TmdbGenreResponse = { genres?: Genre[] };
type TmdbFindResponse = { movie_results?: TmdbMovie[]; tv_results?: TmdbSeries[] };
type TmdbImagesResponse = { logos?: TmdbImage[] };

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function tmdbRequest<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  signal?: AbortSignal,
) {
  if (!TMDB_API_KEY) throw new Error("TMDB API key is not configured");
  const endpoint = new URL(`${TMDB_BASE}${path}`);
  endpoint.searchParams.set("api_key", TMDB_API_KEY);
  endpoint.searchParams.set("language", "en-US");
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") endpoint.searchParams.set(key, String(value));
  });
  const response = await fetch(endpoint, { headers: { Accept: "application/json" }, signal });
  if (!response.ok) throw new Error(`TMDB request failed (${response.status})`);
  return response.json() as Promise<T>;
}

function toMovie(movie: TmdbMovie): Movie {
  return applyTitleLogoOverride({
    id: movie.id,
    tmdb_id: movie.id,
    media_type: "movie",
    title: movie.title?.trim() || "Untitled film",
    original_title: movie.original_title?.trim() || undefined,
    overview: movie.overview?.trim() || "Description unavailable.",
    poster_path: movie.poster_path || null,
    backdrop_path: movie.backdrop_path || null,
    release_date: movie.release_date || "",
    quality: CATALOG_QUALITY_OVERRIDES[movie.id],
    vote_average: Number(movie.vote_average) || 0,
    vote_count: Number(movie.vote_count) || 0,
    popularity: Number(movie.popularity) || 0,
    genre_ids: movie.genre_ids ?? [],
    adult: movie.adult === true,
  });
}

function toSeries(series: TmdbSeries): Movie {
  return applyTitleLogoOverride({
    id: series.id,
    tmdb_id: series.id,
    media_type: "tv",
    title: series.name?.trim() || "Untitled series",
    original_title: series.original_name?.trim() || undefined,
    overview: series.overview?.trim() || "Description unavailable.",
    poster_path: series.poster_path || null,
    backdrop_path: series.backdrop_path || null,
    release_date: series.first_air_date || "",
    vote_average: Number(series.vote_average) || 0,
    vote_count: Number(series.vote_count) || 0,
    popularity: Number(series.popularity) || 0,
    genre_ids: series.genre_ids ?? series.genres?.map((genre) => genre.id) ?? [],
    adult: series.adult === true,
  });
}

function toSeason(season: TmdbSeasonSummary): SeasonSummary {
  return {
    id: season.id,
    name: season.name?.trim() || `Season ${season.season_number ?? 0}`,
    overview: season.overview?.trim() || "",
    air_date: season.air_date || "",
    episode_count: Number(season.episode_count) || 0,
    poster_path: season.poster_path || null,
    season_number: Number(season.season_number) || 0,
  };
}

function toEpisode(episode: TmdbEpisode): Episode {
  return {
    id: episode.id,
    name: episode.name?.trim() || `Episode ${episode.episode_number ?? 0}`,
    overview: episode.overview?.trim() || "Episode description unavailable.",
    air_date: episode.air_date || "",
    episode_number: Number(episode.episode_number) || 0,
    season_number: Number(episode.season_number) || 0,
    runtime: Number(episode.runtime) || 0,
    still_path: episode.still_path || null,
    vote_average: Number(episode.vote_average) || 0,
  };
}

function toPerson(person: TmdbPerson): PersonCredit {
  return {
    id: person.id,
    name: person.name,
    profile_path: person.profile_path || null,
    character: person.character,
  };
}

async function resolveTmdbId(id: string | number, signal?: AbortSignal) {
  const normalized = String(id).trim();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  if (!/^tt\d+$/i.test(normalized)) throw new Error("Unsupported movie identifier");
  const result = await tmdbRequest<TmdbFindResponse>(
    `/find/${encodeURIComponent(normalized)}`,
    { external_source: "imdb_id" },
    signal,
  );
  const tmdbId = result.movie_results?.[0]?.id;
  if (!tmdbId) throw new Error("TMDB could not match this IMDb identifier");
  return tmdbId;
}

async function resolveSeriesId(id: string | number, signal?: AbortSignal) {
  const normalized = String(id).trim();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  if (!/^tt\d+$/i.test(normalized)) throw new Error("Unsupported series identifier");
  const result = await tmdbRequest<TmdbFindResponse>(
    `/find/${encodeURIComponent(normalized)}`,
    { external_source: "imdb_id" },
    signal,
  );
  const tmdbId = result.tv_results?.[0]?.id;
  if (!tmdbId) throw new Error("TMDB could not match this IMDb series identifier");
  return tmdbId;
}

async function loadDetails(id: string | number, signal?: AbortSignal): Promise<MovieDetails> {
  const tmdbId = await resolveTmdbId(id, signal);
  const details = await tmdbRequest<TmdbMovieDetails>(
    `/movie/${tmdbId}`,
    {
      append_to_response: "credits,external_ids,images,videos",
      include_image_language: "en,null,ja",
    },
    signal,
  );
  const logo = details.images?.logos?.find((image) => image.iso_639_1 === "en")
    ?? details.images?.logos?.[0];
  const youtubeVideos = (details.videos?.results ?? []).filter(
    (video) => video.site === "YouTube" && video.key,
  );
  const trailer = youtubeVideos.find((video) => video.type === "Trailer" && video.official)
    ?? youtubeVideos.find((video) => video.type === "Trailer")
    ?? youtubeVideos.find((video) => video.type === "Teaser" && video.official)
    ?? youtubeVideos[0];
  const movie: Movie = {
    ...toMovie({ ...details, genre_ids: details.genres?.map((genre) => genre.id) ?? [] }),
    id: details.external_ids?.imdb_id || details.id,
    logo_url: logo ? imageUrl(logo.file_path, "original") : null,
    logo_width: logo?.width,
    logo_height: logo?.height,
    trailer_key: trailer?.key,
  };
  const movieWithLogo = applyTitleLogoOverride(
    movie.logo_url ? movie : await withFanartLogo(movie, signal),
  );
  const directors = (details.credits?.crew ?? [])
    .filter((person) => person.job === "Director")
    .map(toPerson);
  const cast = (details.credits?.cast ?? []).slice(0, 8).map(toPerson);
  return {
    ...movieWithLogo,
    runtime: details.runtime || 0,
    genres: details.genres ?? [],
    directors,
    cast,
    tagline: details.tagline,
    status: details.status,
  };
}

async function loadSeriesDetails(
  id: string | number,
  signal?: AbortSignal,
): Promise<SeriesDetails> {
  const tmdbId = await resolveSeriesId(id, signal);
  const details = await tmdbRequest<TmdbSeriesDetails>(
    `/tv/${tmdbId}`,
    {
      append_to_response: "credits,external_ids,images,videos",
      include_image_language: "en,null,ja",
    },
    signal,
  );
  const logo = details.images?.logos?.find((image) => image.iso_639_1 === "en")
    ?? details.images?.logos?.[0];
  const youtubeVideos = (details.videos?.results ?? []).filter(
    (video) => video.site === "YouTube" && video.key,
  );
  const trailer = youtubeVideos.find((video) => video.type === "Trailer" && video.official)
    ?? youtubeVideos.find((video) => video.type === "Trailer")
    ?? youtubeVideos.find((video) => video.type === "Teaser" && video.official)
    ?? youtubeVideos[0];
  const series: Movie = {
    ...toSeries({ ...details, genre_ids: details.genres?.map((genre) => genre.id) ?? [] }),
    id: details.external_ids?.imdb_id || details.id,
    logo_url: logo ? imageUrl(logo.file_path, "original") : null,
    logo_width: logo?.width,
    logo_height: logo?.height,
    trailer_key: trailer?.key,
  };
  const seriesWithLogo = applyTitleLogoOverride(
    series.logo_url ? series : await withFanartLogo(series, signal),
  );
  const seasons = (details.seasons ?? [])
    .map(toSeason)
    .filter((season) => season.episode_count > 0)
    .sort((a, b) => a.season_number - b.season_number);
  return {
    ...seriesWithLogo,
    runtime: details.episode_run_time?.find((runtime) => runtime > 0)
      || Number(details.last_episode_to_air?.runtime)
      || 0,
    genres: details.genres ?? [],
    creators: (details.created_by ?? []).map(toPerson),
    cast: (details.credits?.cast ?? []).slice(0, 8).map(toPerson),
    seasons,
    number_of_seasons: Number(details.number_of_seasons) || seasons.filter((season) => season.season_number > 0).length,
    number_of_episodes: Number(details.number_of_episodes)
      || seasons.reduce((total, season) => total + season.episode_count, 0),
    tagline: details.tagline,
    status: details.status,
  };
}

async function withTmdbLogo(movie: Movie, signal?: AbortSignal) {
  const tmdbId = movie.tmdb_id ?? movie.id;
  try {
    const images = await tmdbRequest<TmdbImagesResponse>(
      `/${movie.media_type === "tv" ? "tv" : "movie"}/${encodeURIComponent(String(tmdbId))}/images`,
      { include_image_language: "en,null,ja" },
      signal,
    );
    const logo = images.logos?.find((image) => image.iso_639_1 === "en") ?? images.logos?.[0];
    if (!logo) return movie;
    return {
      ...movie,
      logo_url: imageUrl(logo.file_path, "original"),
      logo_width: logo.width,
      logo_height: logo.height,
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
    return movie;
  }
}

async function withCatalogLogo(movie: Movie, signal?: AbortSignal) {
  const tmdbMovie = await withTmdbLogo(movie, signal);
  if (tmdbMovie.logo_url) return tmdbMovie;
  return withFanartLogo(tmdbMovie, signal);
}

export async function getHomeData(signal?: AbortSignal): Promise<HomeData> {
  if (!TMDB_API_KEY) return getCinemetaHomeData(signal);
  try {
    const [trending, nowPlaying, topRated, action, trendingSeries, airingSeries, topRatedSeries] = await Promise.all([
      tmdbRequest<TmdbPage>("/trending/movie/week", {}, signal),
      tmdbRequest<TmdbPage>("/movie/now_playing", { page: 1 }, signal),
      tmdbRequest<TmdbPage>("/movie/top_rated", { page: 1 }, signal),
      tmdbRequest<TmdbPage>("/discover/movie", {
        page: 1,
        sort_by: "popularity.desc",
        with_genres: 28,
        include_adult: false,
      }, signal),
      tmdbRequest<TmdbSeriesPage>("/trending/tv/week", {}, signal),
      tmdbRequest<TmdbSeriesPage>("/tv/on_the_air", { page: 1 }, signal),
      tmdbRequest<TmdbSeriesPage>("/tv/top_rated", { page: 1 }, signal),
    ]);
    const heroMovies = trending.results.map(toMovie).filter((movie) => movie.backdrop_path).slice(0, 10);
    const heroMoviesWithLogos = await Promise.all(heroMovies.map((movie) => withTmdbLogo(movie, signal)));
    return organizeHomeData({
      trending: heroMoviesWithLogos,
      nowPlaying: nowPlaying.results.map(toMovie),
      topRated: topRated.results.map(toMovie),
      action: action.results.map(toMovie),
      trendingSeries: trendingSeries.results.map(toSeries).filter((series) => series.poster_path),
      airingSeries: airingSeries.results.map(toSeries).filter((series) => series.poster_path),
      topRatedSeries: topRatedSeries.results.map(toSeries).filter((series) => series.poster_path),
      usingFallback: false,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    return getCinemetaHomeData(signal);
  }
}

export async function getMovie(id: string | number, signal?: AbortSignal) {
  if (!TMDB_API_KEY) return getCinemetaMovie(id, signal);
  try {
    return await loadDetails(id, signal);
  } catch (error) {
    if (isAbortError(error)) throw error;
    return getCinemetaMovie(id, signal);
  }
}

export async function getPerson(id: string | number, signal?: AbortSignal): Promise<PersonDetails> {
  if (!TMDB_API_KEY) throw new Error("TMDB is required for person profiles");
  const personId = Number(String(id).trim());
  if (!Number.isInteger(personId) || personId <= 0) throw new Error("Unsupported person identifier");

  const [details, credits] = await Promise.all([
    tmdbRequest<TmdbPersonDetails>(`/person/${personId}`, {}, signal),
    tmdbRequest<TmdbMovieCredits>(`/person/${personId}/movie_credits`, { include_adult: false }, signal),
  ]);
  const knownFor = [...(credits.cast ?? []), ...(credits.crew ?? [])]
    .map(toMovie)
    .filter((movie) => movie.poster_path && !movie.adult)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0) || b.vote_average - a.vote_average)
    .filter((movie, index, all) => all.findIndex((candidate) => candidate.tmdb_id === movie.tmdb_id) === index);

  return {
    id: details.id,
    name: details.name?.trim() || "Unknown person",
    biography: details.biography?.trim() || "Biography unavailable.",
    birthday: details.birthday?.trim() || undefined,
    place_of_birth: details.place_of_birth?.trim() || undefined,
    profile_path: details.profile_path || null,
    known_for_department: details.known_for_department?.trim() || undefined,
    known_for: knownFor,
  };
}

export async function getSimilarMoviesPage(
  id: string | number,
  page = 1,
  signal?: AbortSignal,
): Promise<MoviePage> {
  const currentPage = Math.max(1, Math.floor(page));
  if (!TMDB_API_KEY) {
    const all = await getCinemetaSimilarMovies(id, signal);
    const pageSize = 14;
    const start = (currentPage - 1) * pageSize;
    return {
      page: currentPage,
      total_pages: Math.max(1, Math.ceil(all.length / pageSize)),
      total_results: all.length,
      results: all.slice(start, start + pageSize),
    };
  }
  try {
    const tmdbId = await resolveTmdbId(id, signal);
    const [recommended, similar] = await Promise.all([
      tmdbRequest<TmdbPage>(`/movie/${tmdbId}/recommendations`, { page: currentPage }, signal),
      tmdbRequest<TmdbPage>(`/movie/${tmdbId}/similar`, { page: currentPage }, signal),
    ]);
    const results = distinctRecommendations(
      [...recommended.results, ...similar.results]
        .map(toMovie)
        .filter((movie) => movie.tmdb_id !== tmdbId && movie.poster_path && !movie.adult),
    );
    const featured = await Promise.all(
      results.slice(0, 10).map((movie) => withCatalogLogo(movie, signal)),
    );
    return {
      page: currentPage,
      total_pages: Math.max(recommended.total_pages, similar.total_pages),
      total_results: recommended.total_results + similar.total_results,
      results: [...featured, ...results.slice(10)],
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
    const all = await getCinemetaSimilarMovies(id, signal);
    return { page: 1, total_pages: 1, total_results: all.length, results: all };
  }
}

export async function getSimilarMovies(id: string | number, signal?: AbortSignal): Promise<Movie[]> {
  return (await getSimilarMoviesPage(id, 1, signal)).results;
}

/**
 * Anime recommendations can be either films or TV series in TMDB. Resolve
 * both catalog types and keep only animation titles so the Anime related page
 * never falls back to a generic movie list.
 */
export async function getSimilarAnimePage(
  id: string | number,
  page = 1,
  signal?: AbortSignal,
): Promise<MoviePage> {
  const [moviePage, seriesPage] = await Promise.all([
    getSimilarMoviesPage(id, page, signal),
    getSimilarSeriesPage(id, page, signal),
  ]);
  const results = distinctRecommendations(
    [...moviePage.results, ...seriesPage.results].filter((item) => item.genre_ids.includes(16)),
  );
  return {
    page: Math.max(moviePage.page, seriesPage.page),
    total_pages: Math.max(moviePage.total_pages, seriesPage.total_pages),
    total_results: results.length,
    results,
  };
}

export async function getSeries(id: string | number, signal?: AbortSignal) {
  if (!TMDB_API_KEY) throw new Error("TMDB is required for series details");
  return loadSeriesDetails(id, signal);
}

export async function getSimilarSeriesPage(
  id: string | number,
  page = 1,
  signal?: AbortSignal,
): Promise<MoviePage> {
  const currentPage = Math.max(1, Math.floor(page));
  if (!TMDB_API_KEY) return { page: currentPage, total_pages: 1, total_results: 0, results: [] };
  try {
    const tmdbId = await resolveSeriesId(id, signal);
    const [recommended, similar] = await Promise.all([
      tmdbRequest<TmdbSeriesPage>(`/tv/${tmdbId}/recommendations`, { page: currentPage }, signal),
      tmdbRequest<TmdbSeriesPage>(`/tv/${tmdbId}/similar`, { page: currentPage }, signal),
    ]);
    const results = distinctRecommendations(
      [...recommended.results, ...similar.results]
        .map(toSeries)
        .filter((series) => series.tmdb_id !== tmdbId && series.poster_path && !series.adult),
    );
    const featured = await Promise.all(
      results.slice(0, 10).map((series) => withCatalogLogo(series, signal)),
    );
    return {
      page: currentPage,
      total_pages: Math.max(recommended.total_pages, similar.total_pages),
      total_results: recommended.total_results + similar.total_results,
      results: [...featured, ...results.slice(10)],
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { page: 1, total_pages: 1, total_results: 0, results: [] };
  }
}

export async function getSimilarSeries(id: string | number, signal?: AbortSignal): Promise<Movie[]> {
  return (await getSimilarSeriesPage(id, 1, signal)).results;
}

export async function getSeasonDetails(
  id: string | number,
  seasonNumber: number,
  signal?: AbortSignal,
): Promise<SeasonDetails> {
  if (!TMDB_API_KEY) throw new Error("TMDB is required for episode details");
  const tmdbId = await resolveSeriesId(id, signal);
  const season = await tmdbRequest<TmdbSeasonDetails>(
    `/tv/${tmdbId}/season/${seasonNumber}`,
    {},
    signal,
  );
  return {
    ...toSeason(season),
    episodes: (season.episodes ?? []).map(toEpisode),
  };
}

export async function getGenres(signal?: AbortSignal): Promise<Genre[]> {
  if (!TMDB_API_KEY) return getCinemetaGenres(signal);
  try {
    const response = await tmdbRequest<TmdbGenreResponse>("/genre/movie/list", {}, signal);
    return response.genres?.length ? response.genres : CINEMETA_GENRES;
  } catch (error) {
    if (isAbortError(error)) throw error;
    return getCinemetaGenres(signal);
  }
}

export async function getSeriesGenres(signal?: AbortSignal): Promise<Genre[]> {
  if (!TMDB_API_KEY) return [];
  try {
    const response = await tmdbRequest<TmdbGenreResponse>("/genre/tv/list", {}, signal);
    return response.genres ?? [];
  } catch (error) {
    if (isAbortError(error)) throw error;
    return [];
  }
}

export async function discoverMovies(
  page = 1,
  selectedGenreId?: number,
  sortBy = "popularity.desc",
  signal?: AbortSignal,
): Promise<MoviePage> {
  if (!TMDB_API_KEY) {
    const fallback = await discoverCinemetaMovies(page, selectedGenreId, sortBy, signal);
    return selectedGenreId === 16
      ? fallback
      : { ...fallback, results: fallback.results.filter((movie) => !movie.genre_ids.includes(16)) };
  }
  try {
    const response = await tmdbRequest<TmdbPage>(
      "/discover/movie",
      {
        page,
        sort_by: sortBy,
        with_genres: selectedGenreId,
        without_genres: selectedGenreId === 16 ? undefined : 16,
        with_original_language: selectedGenreId === 16 ? "ja" : undefined,
        include_adult: false,
        include_video: false,
        "vote_count.gte": sortBy.startsWith("vote_average") ? 100 : undefined,
        "primary_release_date.lte": sortBy.startsWith("primary_release_date")
          ? new Date().toISOString().slice(0, 10)
          : undefined,
      },
      signal,
    );
    const results = response.results
      .filter((movie) => selectedGenreId !== 16 || movie.original_language === "ja")
      .map(toMovie)
      .filter((movie) => selectedGenreId === 16 || !movie.genre_ids.includes(16));
    const featured = await Promise.all(
      results.slice(0, 10).map((movie) => withCatalogLogo(movie, signal)),
    );
    return {
      page: response.page,
      total_pages: Math.min(response.total_pages, 500),
      total_results: response.total_results,
      results: [...featured, ...results.slice(10)],
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
    return discoverCinemetaMovies(page, selectedGenreId, sortBy, signal);
  }
}

/**
 * Anime is a mixed catalog: TMDB stores anime films under /discover/movie and
 * anime series under /discover/tv. Keep both sources together so the Anime
 * section can include shows such as Vinland Saga (Thorfinn), not just films.
 */
export async function discoverAnime(
  page = 1,
  sortBy = "popularity.desc",
  signal?: AbortSignal,
): Promise<MoviePage> {
  if (!TMDB_API_KEY) {
    const fallback = await discoverCinemetaMovies(page, 16, sortBy, signal);
    return {
      ...fallback,
      results: fallback.results.filter((movie) => movie.genre_ids.includes(16)),
    };
  }
  try {
    const tvSortBy = sortBy === "primary_release_date.desc" ? "first_air_date.desc" : sortBy;
    const [movieResponse, seriesResponse] = await Promise.all([
      tmdbRequest<TmdbPage>(
        "/discover/movie",
        {
          page,
          sort_by: sortBy,
          with_genres: 16,
          with_original_language: "ja",
          include_adult: false,
          include_video: false,
          "primary_release_date.lte": sortBy.startsWith("primary_release_date")
            ? new Date().toISOString().slice(0, 10)
            : undefined,
        },
        signal,
      ),
      tmdbRequest<TmdbSeriesPage>(
        "/discover/tv",
        {
          page,
          sort_by: tvSortBy,
          with_genres: 16,
          with_original_language: "ja",
          include_adult: false,
          "first_air_date.lte": sortBy.startsWith("primary_release_date")
            ? new Date().toISOString().slice(0, 10)
            : undefined,
        },
        signal,
      ),
    ]);
    const movies = movieResponse.results
      .filter((movie) => movie.genre_ids?.includes(16) && movie.original_language === "ja")
      .map(toMovie);
    const series = seriesResponse.results
      .filter((show) => show.genre_ids?.includes(16) && show.original_language === "ja")
      .map(toSeries);
    const results = [...movies, ...series]
      .filter((item) => item.poster_path)
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    const featured = await Promise.all(
      results.slice(0, 10).map((item) => withCatalogLogo(item, signal)),
    );
    return {
      page: Math.max(movieResponse.page, seriesResponse.page),
      total_pages: Math.min(Math.max(movieResponse.total_pages, seriesResponse.total_pages), 500),
      total_results: movieResponse.total_results + seriesResponse.total_results,
      results: [...featured, ...results.slice(10)],
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
    const fallback = await discoverCinemetaMovies(page, 16, sortBy, signal);
    return {
      ...fallback,
      results: fallback.results.filter((movie) => movie.genre_ids.includes(16)),
    };
  }
}

const FEATURED_SERIES_IDS = [
  108978, // Reacher
  100088, // Outer Banks
  37680, // Suits
  5920, // The Mentalist
  66732, // Stranger Things
  60574, // Peaky Blinders
  46952, // The Blacklist
  2288, // Prison Break
  1396, // Breaking Bad
  19885, // Sherlock
];

const FEATURED_ANIME_IDS = [
  88803, // Vinland Saga
  95479, // Jujutsu Kaisen
  46260, // Naruto
  31910, // Naruto: Shippuden
  12971, // Dragon Ball Z
  37854, // One Piece
  85937, // Demon Slayer: Kimetsu no Yaiba
  1429, // Attack on Titan
  65930, // My Hero Academia
  30984, // Bleach
];

async function getFeaturedSeriesByIds(ids: number[], signal?: AbortSignal): Promise<Movie[]> {
  if (!TMDB_API_KEY) return [];
  const details = await Promise.all(ids.map(async (id) => {
    try {
      return await tmdbRequest<TmdbSeriesDetails>(
        `/tv/${id}`,
        { append_to_response: "images", include_image_language: "en,null,ja" },
        signal,
      );
    } catch (error) {
      if (isAbortError(error)) throw error;
      return null;
    }
  }));
  const items = details.filter((item): item is TmdbSeriesDetails => Boolean(item)).map((item) => {
    const logo = item.images?.logos?.find((image) => image.iso_639_1 === "en")
      ?? item.images?.logos?.find((image) => image.iso_639_1 === "ja")
      ?? item.images?.logos?.[0];
    return {
      ...toSeries({ ...item, genre_ids: item.genres?.map((genre) => genre.id) ?? [] }),
      id: item.id,
      tmdb_id: item.id,
      logo_url: logo ? imageUrl(logo.file_path, "original") : null,
      logo_width: logo?.width,
      logo_height: logo?.height,
    };
  });
  return Promise.all(items.map((item) => item.logo_url ? item : withFanartLogo(item, signal)));
}

export async function getFeaturedSeries(signal?: AbortSignal): Promise<Movie[]> {
  return getFeaturedSeriesByIds(FEATURED_SERIES_IDS, signal);
}

export async function getFeaturedAnime(signal?: AbortSignal): Promise<Movie[]> {
  return getFeaturedSeriesByIds(FEATURED_ANIME_IDS, signal);
}

/** Netflix's public TMDB network id, used only to curate the homepage rail. */
export async function getNetflixSeries(signal?: AbortSignal): Promise<Movie[]> {
  if (!TMDB_API_KEY) return [];
  try {
    const response = await tmdbRequest<TmdbSeriesPage>(
      "/discover/tv",
      {
        page: 1,
        sort_by: "popularity.desc",
        with_networks: 213,
        without_genres: 16,
        include_adult: false,
        "first_air_date.lte": new Date().toISOString().slice(0, 10),
      },
      signal,
    );
    const shows = response.results
      .map(toSeries)
      .filter((show) => show.poster_path && !show.genre_ids.includes(16));
    return Promise.all(shows.slice(0, 14).map((show) => withCatalogLogo(show, signal)));
  } catch (error) {
    if (isAbortError(error)) throw error;
    return [];
  }
}

export async function discoverSeries(
  page = 1,
  selectedGenreId?: number,
  sortBy = "popularity.desc",
  signal?: AbortSignal,
): Promise<MoviePage> {
  if (!TMDB_API_KEY) {
    return { page: 1, total_pages: 1, total_results: 0, results: [] };
  }
  const response = await tmdbRequest<TmdbSeriesPage>(
    "/discover/tv",
    {
      page,
      sort_by: sortBy,
      with_genres: selectedGenreId,
      without_genres: selectedGenreId === 16 ? undefined : 16,
      include_adult: false,
      "vote_count.gte": sortBy.startsWith("vote_average") ? 100 : undefined,
      "first_air_date.lte": sortBy.startsWith("first_air_date")
        ? new Date().toISOString().slice(0, 10)
        : undefined,
    },
    signal,
  );
  const results = response.results
    .map(toSeries)
    .filter((series) => selectedGenreId === 16 || !series.genre_ids.includes(16));
  const featured = await Promise.all(
    results.slice(0, 10).map((series) => withCatalogLogo(series, signal)),
  );
  return {
    page: response.page,
    total_pages: Math.min(response.total_pages, 500),
    total_results: response.total_results,
    results: [...featured, ...results.slice(10)],
  };
}

export async function searchMovies(query: string, signal?: AbortSignal): Promise<Movie[]> {
  const cleanQuery = query.trim();
  if (!TMDB_API_KEY) return searchCinemetaMovies(cleanQuery, signal);
  try {
    if (!cleanQuery) return [];
    const response = await tmdbRequest<TmdbPage>(
      "/search/movie",
      { query: cleanQuery, page: 1, include_adult: false },
      signal,
    );
    return response.results.map(toMovie).filter((movie) => movie.poster_path);
  } catch (error) {
    if (isAbortError(error)) throw error;
    return searchCinemetaMovies(cleanQuery, signal);
  }
}

export async function searchPeople(query: string, signal?: AbortSignal): Promise<PersonCredit[]> {
  const cleanQuery = query.trim();
  if (!TMDB_API_KEY) return [];
  try {
    const response = await tmdbRequest<TmdbPeoplePage>(
      cleanQuery ? "/search/person" : "/person/popular",
      cleanQuery
        ? { query: cleanQuery, page: 1, include_adult: false }
        : { page: 1 },
      signal,
    );
    return (response.results ?? [])
      .filter((person) => person.name?.trim())
      .map(toPerson);
  } catch (error) {
    if (isAbortError(error)) throw error;
    return [];
  }
}

const TOP_HOLLYWOOD_ACTOR_IDS = [
  976,    // Jason Statham
  18918,  // Dwayne Johnson
  2888,   // Will Smith
  51329,  // Kevin Hart
  500,    // Tom Cruise
  6193,   // Leonardo DiCaprio
  287,    // Brad Pitt
  3223,   // Robert Downey Jr.
  74568,  // Chris Hemsworth
  16828,  // Chris Evans
  2231,   // Samuel L. Jackson
  192,    // Morgan Freeman
  6384,   // Keanu Reeves
  85,     // Johnny Depp
  31,     // Tom Hanks
  10859,  // Ryan Reynolds
  18897,  // Mark Wahlberg
  3894,   // Christian Bale
  6968,   // Hugh Jackman
  1892,   // Matt Damon
];

export async function getTopHollywoodActors(signal?: AbortSignal): Promise<PersonCredit[]> {
  if (!TMDB_API_KEY) return [];
  const people = await Promise.all(TOP_HOLLYWOOD_ACTOR_IDS.map(async (id) => {
    try {
      const person = await tmdbRequest<TmdbPersonDetails>(`/person/${id}`, {}, signal);
      return person.name?.trim()
        ? toPerson({ id: person.id, name: person.name.trim(), profile_path: person.profile_path, character: "Actor" })
        : null;
    } catch (error) {
      if (isAbortError(error)) throw error;
      return null;
    }
  }));
  return people.filter((person): person is PersonCredit => Boolean(person));
}

export async function getPopularPeople(page = 2, signal?: AbortSignal): Promise<PersonCredit[]> {
  if (!TMDB_API_KEY) return [];
  try {
    const response = await tmdbRequest<TmdbPeoplePage>("/person/popular", { page: Math.max(1, page) }, signal);
    return (response.results ?? [])
      .filter((person) => person.name?.trim())
      .map(toPerson);
  } catch (error) {
    if (isAbortError(error)) throw error;
    return [];
  }
}

export type SearchScope = "all" | "movies" | "series" | "anime";

export async function searchCatalog(
  query: string,
  signal?: AbortSignal,
  scope: SearchScope = "all",
): Promise<Movie[]> {
  const cleanQuery = query.trim();
  if (!TMDB_API_KEY) {
    if (scope === "series") return [];
    const fallback = await searchCinemetaMovies(cleanQuery, signal);
    return scope === "anime" ? fallback.filter((movie) => movie.genre_ids.includes(16)) : fallback;
  }
  try {
    const request = (path: string, params: Record<string, string | number | boolean | undefined>) =>
      tmdbRequest<TmdbPage | TmdbSeriesPage>(path, params, signal);

    if (scope === "movies") {
      const movies = await request(
        cleanQuery ? "/search/movie" : "/movie/popular",
        cleanQuery ? { query: cleanQuery, page: 1, include_adult: false } : { page: 1 },
      ) as TmdbPage;
      return movies.results.map(toMovie).filter((item) => item.poster_path).slice(0, 40);
    }

    if (scope === "series") {
      const series = await request(
        cleanQuery ? "/search/tv" : "/tv/popular",
        cleanQuery ? { query: cleanQuery, page: 1, include_adult: false } : { page: 1 },
      ) as TmdbSeriesPage;
      return series.results.map(toSeries).filter((item) => item.poster_path).slice(0, 40);
    }

    const [movies, series] = cleanQuery
      ? await Promise.all([
          request("/search/movie", { query: cleanQuery, page: 1, include_adult: false }) as Promise<TmdbPage>,
          request("/search/tv", { query: cleanQuery, page: 1, include_adult: false }) as Promise<TmdbSeriesPage>,
        ])
      : await Promise.all([
          request("/movie/popular", { page: 1 }) as Promise<TmdbPage>,
          request("/tv/popular", { page: 1 }) as Promise<TmdbSeriesPage>,
        ]);
    const animeResults = scope === "anime"
      ? [
          ...movies.results
            .filter((movie) => movie.genre_ids?.includes(16) && movie.original_language === "ja")
            .map(toMovie),
          ...series.results
            .filter((show) => show.genre_ids?.includes(16) && show.original_language === "ja")
            .map(toSeries),
        ]
      : [...movies.results.map(toMovie), ...series.results.map(toSeries)];
    return animeResults
      .filter((item) => item.poster_path)
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, 40);
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (scope === "series") return [];
    const fallback = await searchCinemetaMovies(cleanQuery, signal);
    return scope === "anime" ? fallback.filter((movie) => movie.genre_ids.includes(16)) : fallback;
  }
}
