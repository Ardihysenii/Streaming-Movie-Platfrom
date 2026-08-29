import type {
  MovieDetails,
  PlaybackManifest,
  StreamKind,
  StreamSource,
  SubtitleTrack,
} from "@/lib/types";

type UnknownRecord = Record<string, unknown>;

export class StreamResolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreamResolverError";
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  } catch {
    return false;
  }
}

function inferKind(url: string, declared?: unknown): StreamKind {
  if (declared === "mp4" || /\.mp4(?:$|\?)/i.test(url)) return "mp4";
  return "hls";
}

function normalizeSource(value: unknown, index: number): StreamSource | null {
  if (typeof value === "string") {
    if (!isHttpsUrl(value)) return null;
    return {
      url: value,
      type: inferKind(value),
      label: index === 0 ? "Adaptive" : `Source ${index + 1}`,
    };
  }

  if (!isRecord(value) || !isHttpsUrl(value.url)) return null;
  const quality = typeof value.quality === "string" ? value.quality : undefined;
  const label = typeof value.label === "string"
    ? value.label
    : quality || (index === 0 ? "Adaptive" : `Source ${index + 1}`);

  return {
    url: value.url,
    type: inferKind(value.url, value.type),
    label,
    quality,
  };
}

function normalizeSubtitle(value: unknown): SubtitleTrack | null {
  if (!isRecord(value)) return null;
  const url = value.url ?? value.file;
  if (!isHttpsUrl(url)) return null;

  const language = typeof value.language === "string"
    ? value.language
    : typeof value.lang === "string"
      ? value.lang
      : "und";

  return {
    url,
    language,
    label: typeof value.label === "string" ? value.label : language.toUpperCase(),
    default: value.default === true,
  };
}

function normalizeManifest(value: unknown, movieId: string): PlaybackManifest {
  if (!isRecord(value)) throw new StreamResolverError("The source service returned invalid data.");

  const rawSources = Array.isArray(value.sources)
    ? value.sources
    : value.source
      ? [value.source]
      : value.url
        ? [value]
        : [];
  const sources = rawSources
    .map(normalizeSource)
    .filter((source): source is StreamSource => source !== null);

  if (!sources.length) {
    throw new StreamResolverError("No playable source is available for this movie.");
  }

  const subtitles = (Array.isArray(value.subtitles) ? value.subtitles : [])
    .map(normalizeSubtitle)
    .filter((track): track is SubtitleTrack => track !== null);

  return {
    movieId,
    sources,
    subtitles,
    expiresAt: typeof value.expiresAt === "string" ? value.expiresAt : undefined,
  };
}

export function hasNovaStreamService() {
  return Boolean(process.env.NEXT_PUBLIC_NOVA_STREAM_API_URL?.trim());
}

export async function resolveMovieStream(
  movie: MovieDetails,
  signal?: AbortSignal,
): Promise<PlaybackManifest> {
  const configuredBase = process.env.NEXT_PUBLIC_NOVA_STREAM_API_URL?.trim();
  if (!configuredBase) {
    throw new StreamResolverError(
      "The NOVA stream service is not configured. Add NEXT_PUBLIC_NOVA_STREAM_API_URL after deploying the Worker.",
    );
  }

  const movieId = String(movie.tmdb_id ?? movie.id);
  const endpoint = new URL(`/v1/movie/${encodeURIComponent(movieId)}`, `${configuredBase.replace(/\/+$/, "")}/`);
  endpoint.searchParams.set("imdbId", String(movie.id));

  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    let message = `The source service returned ${response.status}.`;
    try {
      const body = await response.json() as UnknownRecord;
      if (typeof body.error === "string") message = body.error;
    } catch {
      // Keep the status-based message when the service did not return JSON.
    }
    throw new StreamResolverError(message);
  }

  return normalizeManifest(await response.json(), movieId);
}
