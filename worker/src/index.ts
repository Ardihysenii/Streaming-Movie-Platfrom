interface KVNamespace {
  get<T = unknown>(key: string, type: "json"): Promise<T | null>;
}

type WorkerHandler<Environment> = {
  fetch(request: Request, env: Environment): Promise<Response>;
};

type StreamSource = {
  url: string;
  type: "hls" | "mp4";
  label: string;
  quality?: string;
};

type SubtitleTrack = {
  url: string;
  label: string;
  language: string;
  default?: boolean;
};

type PlaybackManifest = {
  movieId: string;
  sources: StreamSource[];
  subtitles: SubtitleTrack[];
  expiresAt?: string;
};

interface Env {
  STREAM_CATALOG?: KVNamespace;
  SOURCE_API_BASE_URL?: string;
  SOURCE_API_TOKEN?: string;
  ALLOWED_ORIGINS?: string;
}

function json(body: unknown, status: number, origin: string | null, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type",
      Vary: "Origin",
      ...headers,
    },
  });
}

function allowedOrigin(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  if (!origin) return "*";
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function isSecureMediaUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeManifest(value: unknown, movieId: string): PlaybackManifest | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const rawSources = Array.isArray(record.sources) ? record.sources : [];
  const sources = rawSources.flatMap((entry, index): StreamSource[] => {
    if (!entry || typeof entry !== "object") return [];
    const source = entry as Record<string, unknown>;
    if (!isSecureMediaUrl(source.url)) return [];
    const type = source.type === "mp4" || /\.mp4(?:$|\?)/i.test(source.url) ? "mp4" : "hls";
    const quality = typeof source.quality === "string" ? source.quality : undefined;
    return [{
      url: source.url,
      type,
      label: typeof source.label === "string" ? source.label : quality || `Source ${index + 1}`,
      quality,
    }];
  });
  if (!sources.length) return null;

  const rawSubtitles = Array.isArray(record.subtitles) ? record.subtitles : [];
  const subtitles = rawSubtitles.flatMap((entry): SubtitleTrack[] => {
    if (!entry || typeof entry !== "object") return [];
    const subtitle = entry as Record<string, unknown>;
    const subtitleUrl = subtitle.url ?? subtitle.file;
    if (!isSecureMediaUrl(subtitleUrl)) return [];
    const language = typeof subtitle.language === "string"
      ? subtitle.language
      : typeof subtitle.lang === "string"
        ? subtitle.lang
        : "und";
    return [{
      url: subtitleUrl,
      language,
      label: typeof subtitle.label === "string" ? subtitle.label : language.toUpperCase(),
      default: subtitle.default === true,
    }];
  });

  return {
    movieId,
    sources,
    subtitles,
    expiresAt: typeof record.expiresAt === "string" ? record.expiresAt : undefined,
  };
}

async function readCatalog(env: Env, movieId: string, imdbId: string | null) {
  if (!env.STREAM_CATALOG) return null;
  const keys = [`movie:${movieId}`];
  if (imdbId) keys.push(`movie:imdb:${imdbId}`);
  for (const key of keys) {
    const manifest = await env.STREAM_CATALOG.get<unknown>(key, "json");
    if (manifest) return manifest;
  }
  return null;
}

async function readAuthorizedUpstream(env: Env, movieId: string, imdbId: string | null) {
  if (!env.SOURCE_API_BASE_URL) return null;
  const endpoint = new URL(`/v1/movie/${encodeURIComponent(movieId)}`, env.SOURCE_API_BASE_URL);
  if (imdbId) endpoint.searchParams.set("imdbId", imdbId);
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      ...(env.SOURCE_API_TOKEN ? { Authorization: `Bearer ${env.SOURCE_API_TOKEN}` } : {}),
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Authorized source provider returned ${response.status}.`);
  return response.json();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(request, env);
    if (!origin) return json({ error: "Origin is not allowed." }, 403, null);
    if (request.method === "OPTIONS") return json(null, 204, origin);
    if (request.method !== "GET") return json({ error: "Method not allowed." }, 405, origin);

    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json({ status: "UP", catalog: Boolean(env.STREAM_CATALOG), upstream: Boolean(env.SOURCE_API_BASE_URL) }, 200, origin);
    }

    const match = url.pathname.match(/^\/v1\/movie\/([^/]+)$/);
    if (!match) return json({ error: "Route not found." }, 404, origin);

    const movieId = decodeURIComponent(match[1]);
    const imdbId = url.searchParams.get("imdbId");
    try {
      const rawManifest = await readCatalog(env, movieId, imdbId)
        ?? await readAuthorizedUpstream(env, movieId, imdbId);
      if (!rawManifest) {
        return json({ error: "No licensed stream is configured for this movie." }, 404, origin);
      }
      const manifest = normalizeManifest(rawManifest, movieId);
      if (!manifest) {
        return json({ error: "The configured source manifest is invalid or contains no HTTPS media URL." }, 502, origin);
      }
      return json(manifest, 200, origin);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The source resolver failed.";
      return json({ error: message }, 502, origin);
    }
  },
} satisfies WorkerHandler<Env>;
