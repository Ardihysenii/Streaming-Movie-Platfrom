import type { AccentName, Movie } from "@/lib/types";

export type PlayerProvider = "cinesrc" | "vidlink" | "vidcore" | "mapple" | "yapgrid" | "vidsrc";

type PlayerUrlOptions = {
  movie: Movie;
  autoplay: boolean;
  subtitleLanguage: string;
  resumeAt: number;
  accent: AccentName;
  seasonNumber?: number;
  episodeNumber?: number;
};

const accentHex: Record<AccentName, string> = {
  signal: "e21d2f",
  cobalt: "4e72ff",
  sage: "91ad9a",
};

const configuredProvider = process.env.NEXT_PUBLIC_PLAYER_PROVIDER?.trim().toLowerCase();

export const activePlayerProvider: PlayerProvider =
  configuredProvider === "cinesrc"
    ? "cinesrc"
    : configuredProvider === "vidlink"
    ? "vidlink"
    : configuredProvider === "vidcore"
      ? "vidcore"
      : configuredProvider === "vidsrc"
        ? "vidsrc"
    : configuredProvider === "mapple"
      ? "mapple"
      : configuredProvider === "yapgrid"
        ? "yapgrid"
        : "vidlink";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function buildVidLinkUrl({
  movie,
  autoplay,
  resumeAt,
  accent,
  seasonNumber,
  episodeNumber,
}: PlayerUrlOptions) {
  const tmdbId = movie.tmdb_id ?? (typeof movie.id === "number" ? movie.id : null);
  if (!tmdbId) return null;

  const base = trimTrailingSlash(
    process.env.NEXT_PUBLIC_VIDLINK_URL || "https://vidlink.pro",
  );
  const params = new URLSearchParams({
    primaryColor: accentHex[accent].toUpperCase(),
    secondaryColor: "170000",
    iconColor: "FFFFFF",
    icons: "default",
    player: "default",
    title: "false",
    poster: "true",
    autoplay: autoplay ? "true" : "false",
    startAt: String(Math.max(0, resumeAt)),
    nextbutton: "true",
  });

  if (movie.media_type === "tv") {
    if (!seasonNumber || !episodeNumber) return null;
    return `${base}/tv/${tmdbId}/${seasonNumber}/${episodeNumber}?${params.toString()}`;
  }
  return `${base}/movie/${tmdbId}?${params.toString()}`;
}

function buildVidCoreUrl({
  movie,
  autoplay,
  subtitleLanguage,
  resumeAt,
  accent,
  seasonNumber,
  episodeNumber,
}: PlayerUrlOptions) {
  const tmdbId = movie.tmdb_id ?? (typeof movie.id === "number" ? movie.id : null);
  if (!tmdbId) return null;

  const base = trimTrailingSlash(
    process.env.NEXT_PUBLIC_VIDCORE_URL || "https://vidcore.net",
  );
  const params = new URLSearchParams({
    theme: accentHex[accent].toUpperCase(),
    server: process.env.NEXT_PUBLIC_VIDCORE_SERVER?.trim() || "Premiere",
    autoPlay: autoplay ? "true" : "false",
    startAt: String(Math.max(0, resumeAt)),
    lang: subtitleLanguage,
  });

  if (movie.media_type === "tv") {
    if (!seasonNumber || !episodeNumber) return null;
    return `${base}/tv/${tmdbId}/${seasonNumber}/${episodeNumber}?${params.toString()}`;
  }
  return `${base}/movie/${tmdbId}?${params.toString()}`;
}

function buildMappleUrl({ movie, seasonNumber, episodeNumber }: PlayerUrlOptions) {
  const tmdbId = movie.tmdb_id ?? (typeof movie.id === "number" ? movie.id : null);
  if (!tmdbId) return null;

  const base = trimTrailingSlash(
    process.env.NEXT_PUBLIC_MAPPLE_URL || "https://mapple.rip",
  );
  if (movie.media_type === "tv") {
    if (!seasonNumber || !episodeNumber) return null;
    return `${base}/watch/tv/${tmdbId}/${seasonNumber}/${episodeNumber}`;
  }
  return `${base}/watch/movie/${tmdbId}`;
}

function buildYapGridUrl({ movie, autoplay, subtitleLanguage, seasonNumber, episodeNumber }: PlayerUrlOptions) {
  const tmdbId = movie.tmdb_id ?? (typeof movie.id === "number" ? movie.id : null);
  if (!tmdbId) return null;

  const base = trimTrailingSlash(
    process.env.NEXT_PUBLIC_YAPGRID_URL || "https://yapgrid.com",
  );
  const params = new URLSearchParams();

  if (autoplay) params.set("autoplay", "1");
  if (subtitleLanguage) params.set("lang", subtitleLanguage);

  const query = params.toString();
  const path = movie.media_type === "tv"
    ? seasonNumber && episodeNumber
      ? `/embed/tv/${tmdbId}/${seasonNumber}/${episodeNumber}`
      : null
    : `/embed/movie/${tmdbId}`;
  return path ? `${base}${path}${query ? `?${query}` : ""}` : null;
}

function buildVidSrcUrl({
  movie,
  autoplay,
  subtitleLanguage,
  resumeAt,
  accent,
  seasonNumber,
  episodeNumber,
}: PlayerUrlOptions) {
  const base = trimTrailingSlash(
    process.env.NEXT_PUBLIC_VIDEO_PROVIDER_URL || "https://vidsrc.sbs",
  );
  const providerMovieId = movie.tmdb_id ?? movie.id;
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    color: accentHex[accent],
    sub: subtitleLanguage,
    t: String(Math.max(0, resumeAt)),
  });

  if (movie.media_type === "tv") {
    if (!seasonNumber || !episodeNumber) return null;
    return `${base}/embed/tv/${providerMovieId}/${seasonNumber}/${episodeNumber}?${params.toString()}`;
  }
  return `${base}/embed/movie/${providerMovieId}?${params.toString()}`;
}

function buildCineSrcUrl({ movie, autoplay, resumeAt, seasonNumber, episodeNumber }: PlayerUrlOptions) {
  const tmdbId = movie.tmdb_id ?? (typeof movie.id === "number" ? movie.id : null);
  if (!tmdbId) return null;

  const base = trimTrailingSlash(
    process.env.NEXT_PUBLIC_VIDEO_PROVIDER_URL || "https://cinesrc.st",
  );
  const params = new URLSearchParams({
    controls: "false",
    autoplay: autoplay ? "true" : "false",
  });
  if (resumeAt > 0) params.set("t", String(Math.max(0, resumeAt)));

  if (movie.media_type === "tv") {
    if (!seasonNumber || !episodeNumber) return null;
    params.set("s", String(seasonNumber));
    params.set("e", String(episodeNumber));
    return `${base}/embed/tv/${tmdbId}?${params.toString()}`;
  }
  return `${base}/embed/movie/${tmdbId}?${params.toString()}`;
}

export function buildPlayerUrl(options: PlayerUrlOptions) {
  switch (activePlayerProvider) {
    case "cinesrc":
      return buildCineSrcUrl(options);
    case "vidlink":
      return buildVidLinkUrl(options);
    case "vidcore":
      return buildVidCoreUrl(options);
    case "vidsrc":
      return buildVidSrcUrl(options);
    case "yapgrid":
      return buildYapGridUrl(options);
    default:
      return buildMappleUrl(options);
  }
}

export const activePlayerName = activePlayerProvider === "cinesrc" ? "CineSrc" :
  activePlayerProvider === "vidlink" ? "VidLink" :
    activePlayerProvider === "vidcore" ? "VidCore" :
      activePlayerProvider === "vidsrc" ? "VidSrc" :
        activePlayerProvider === "yapgrid" ? "YapGrid" : "Mapple";
