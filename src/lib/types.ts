export type Movie = {
  id: string | number;
  tmdb_id?: number;
  media_type?: "movie" | "tv";
  series_id?: string | number;
  season_number?: number;
  episode_number?: number;
  title: string;
  original_title?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  logo_url?: string | null;
  logo_width?: number;
  logo_height?: number;
  trailer_key?: string;
  /** Optional source-provided release quality, for example HD or CAM. */
  quality?: string;
  release_date: string;
  vote_average: number;
  vote_count?: number;
  popularity?: number;
  genre_ids: number[];
  adult?: boolean;
};

export type Genre = {
  id: number;
  name: string;
};

export type PersonCredit = {
  id: number;
  name: string;
  profile_path: string | null;
  profile_url?: string | null;
  character?: string;
};

export type PersonDetails = {
  id: number;
  name: string;
  biography: string;
  birthday?: string;
  place_of_birth?: string;
  profile_path: string | null;
  known_for_department?: string;
  known_for: Movie[];
};

export type MovieDetails = Movie & {
  runtime: number;
  genres: Genre[];
  cast: PersonCredit[];
  directors: PersonCredit[];
  tagline?: string;
  status?: string;
};

export type SeasonSummary = {
  id: number;
  name: string;
  overview: string;
  air_date: string;
  episode_count: number;
  poster_path: string | null;
  season_number: number;
};

export type Episode = {
  id: number;
  name: string;
  overview: string;
  air_date: string;
  episode_number: number;
  season_number: number;
  runtime: number;
  still_path: string | null;
  vote_average: number;
};

export type SeasonDetails = SeasonSummary & {
  episodes: Episode[];
};

export type SeriesDetails = Movie & {
  runtime: number;
  genres: Genre[];
  cast: PersonCredit[];
  creators: PersonCredit[];
  seasons: SeasonSummary[];
  number_of_seasons: number;
  number_of_episodes: number;
  tagline?: string;
  status?: string;
};

export type MoviePage = {
  page: number;
  total_pages: number;
  total_results: number;
  results: Movie[];
};

export type HomeData = {
  trending: Movie[];
  nowPlaying: Movie[];
  topRated: Movie[];
  action: Movie[];
  trendingSeries: Movie[];
  airingSeries: Movie[];
  topRatedSeries: Movie[];
  usingFallback: boolean;
};

export type ContinueWatchingItem = Movie & {
  watchedSeconds: number;
  estimatedDurationSeconds: number;
  updatedAt: number;
};

export type WishlistItem = Movie & {
  addedAt: number;
};

export type AccentName = "signal" | "cobalt" | "sage";
export type DensityName = "cinematic" | "compact";

export type NovaSettings = {
  accent: AccentName;
  density: DensityName;
  heroInterval: number;
  autoplayHero: boolean;
  autoplayPlayer: boolean;
  subtitleLanguage: string;
  reduceMotion: boolean;
  showFilmGrain: boolean;
};

export type StreamKind = "hls" | "mp4";

export type StreamSource = {
  url: string;
  type: StreamKind;
  label: string;
  quality?: string;
};

export type SubtitleTrack = {
  url: string;
  label: string;
  language: string;
  default?: boolean;
};

export type PlaybackManifest = {
  movieId: string;
  sources: StreamSource[];
  subtitles: SubtitleTrack[];
  expiresAt?: string;
};
