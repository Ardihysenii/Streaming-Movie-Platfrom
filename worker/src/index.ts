import { unzipSync } from "fflate";

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
  SUBDL_API_KEY?: string;
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


function toWebVtt(value: string) {
  if (/^\uFEFF?WEBVTT/i.test(value.trim())) return value;
  const normalized = value.replace(/\r\n?/g, "\n");
  const converted = normalized.replace(
    /(\d{2}:\d{2}:\d{2}),(\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}),(\d{3})/g,
    "$1.$2 --> $3.$4",
  );
  return `WEBVTT\n\n${converted}`;
}


function subtitleDownloadUrl(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  try {
    return new URL(value, "https://dl.subdl.com/").toString();
  } catch {
    return null;
  }
}


const PODNAPISI_LANGUAGE_IDS: Record<string, number> = {
  en: 2,
  de: 14,
  fr: 8,
  es: 28,
  it: 9,
  pt: 26,
  sl: 1,
  hr: 38,
  sr: 36,
  bs: 42,
  cs: 7,
  sk: 37,
  pl: 23,
  hu: 20,
  ro: 13,
  bg: 33,
  tr: 30,
  el: 16,
  nl: 15,
  sv: 25,
  da: 24,
  no: 22,
  fi: 17,
  ru: 27,
  ar: 12,
  ja: 11,
  zh: 17,
};


function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}


function podnapisiField(block: string, name: string) {
  const match = block.match(new RegExp("<" + name + "\\b[^>]*>([\\s\\S]*?)</" + name + ">", "i"));
  return match ? decodeXml(match[1]) : "";
}


function parsePodnapisiResults(xml: string, language: string) {
  const languageId = String(PODNAPISI_LANGUAGE_IDS[language] || "");
  const blocks = xml.match(/<subtitle\b[\s\S]*?<\/subtitle>/gi) || [];
  return blocks.flatMap((block) => {
    const pid = podnapisiField(block, "pid") || podnapisiField(block, "id");
    const rawLanguage = podnapisiField(block, "language").toLowerCase();
    if (!pid) return [];
    if (rawLanguage && languageId && rawLanguage !== languageId && rawLanguage !== language && !rawLanguage.includes(language)) return [];
    return [{ pid }];
  });
}


function subtitleTextFromBytes(bytes: Uint8Array) {
  try {
    const files = unzipSync(bytes);
    const entries = Object.entries(files)
      .filter(([name, content]) => /\.(srt|vtt)$/i.test(name) && content.length > 0)
      .sort(([a], [b]) => {
        const aSrt = /\.srt$/i.test(a) ? 0 : 1;
        const bSrt = /\.srt$/i.test(b) ? 0 : 1;
        return aSrt - bSrt || a.length - b.length;
      });
    if (entries.length) return new TextDecoder().decode(entries[0][1]);
  } catch {
    // Podnapisi normally returns ZIP, but some responses are raw subtitle text.
  }
  const raw = new TextDecoder().decode(bytes);
  return raw.includes("-->") ? raw : null;
}

async function readPodnapisiSubtitle(request: Request) {
  const requestUrl = new URL(request.url);
  const title = requestUrl.searchParams.get("title")?.trim();
  if (!title) return null;
  const language = (requestUrl.searchParams.get("language") || "en").trim().toLowerCase().split(/[-_]/)[0];
  const endpoint = new URL("https://podnapisi.net/subtitles/search/old");
  endpoint.searchParams.set("sXML", "1");
  endpoint.searchParams.set("sK", title);
  endpoint.searchParams.set("sL", String(PODNAPISI_LANGUAGE_IDS[language] || PODNAPISI_LANGUAGE_IDS.en));
  const type = requestUrl.searchParams.get("type") === "tv" ? "tv" : "movie";
  if (type === "tv") {
    endpoint.searchParams.set("sTS", requestUrl.searchParams.get("season") || "1");
    endpoint.searchParams.set("sTE", requestUrl.searchParams.get("episode") || "1");
  }
  const year = requestUrl.searchParams.get("year")?.trim();
  if (year) endpoint.searchParams.set("sY", year);

  try {
    const searchResponse = await fetch(endpoint, {
      headers: { Accept: "application/xml, text/xml, */*" },
    });
    if (!searchResponse.ok) return null;
    const results = parsePodnapisiResults(await searchResponse.text(), language).slice(0, 5);
    for (const result of results) {
      const response = await fetch("https://podnapisi.net/subtitles/" + encodeURIComponent(result.pid) + "/download");
      if (!response.ok) continue;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 15_000_000) continue;
      const text = subtitleTextFromBytes(bytes);
      if (text) return text;
    }
  } catch {
    return null;
  }
  return null;
}


async function readSubdlSubtitle(request: Request, env: Env) {
  const apiKey = env.SUBDL_API_KEY?.trim();
  if (!apiKey) return new Response("Subtitle service is not configured.", { status: 503 });
  const requestUrl = new URL(request.url);
  const tmdbId = requestUrl.searchParams.get("tmdbId")?.trim();
  const imdbId = requestUrl.searchParams.get("imdbId")?.trim();
  const type = requestUrl.searchParams.get("type") === "tv" ? "tv" : "movie";
  const language = (requestUrl.searchParams.get("language") || "en").trim().toUpperCase();
  if (!tmdbId && !imdbId) return new Response("A title identifier is required.", { status: 400 });

  const endpoint = new URL("https://api.subdl.com/api/v1/subtitles");
  endpoint.searchParams.set("api_key", apiKey);
  if (tmdbId) endpoint.searchParams.set("tmdb_id", tmdbId);
  if (imdbId) endpoint.searchParams.set("imdb_id", imdbId);
  endpoint.searchParams.set("type", type);
  endpoint.searchParams.set("languages", language);
  endpoint.searchParams.set("subs_per_page", "30");
  endpoint.searchParams.set("unpack", "1");
  endpoint.searchParams.set("client", "custom_integration");
  if (type === "tv") {
    endpoint.searchParams.set("season_number", requestUrl.searchParams.get("season") || "1");
    endpoint.searchParams.set("episode_number", requestUrl.searchParams.get("episode") || "1");
  }

  const searchResponse = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!searchResponse.ok) return new Response("Subtitle search failed.", { status: 502 });
  const payload = await searchResponse.json() as { subtitles?: Array<Record<string, unknown>> };
  const season = Number(requestUrl.searchParams.get("season") || 1);
  const episode = Number(requestUrl.searchParams.get("episode") || 1);
  const candidates = (payload.subtitles || []).flatMap((subtitle) => {
    const unpacked = Array.isArray(subtitle.unpack_files) ? subtitle.unpack_files : [];
    return (unpacked.length ? unpacked : [subtitle]).map((file) => ({ ...subtitle, ...(file as Record<string, unknown>) }));
  });
  const selected = candidates.find((candidate) => {
    const candidateLanguage = String(candidate.language || "").toUpperCase();
    const candidateSeason = Number(candidate.season || 0);
    const candidateEpisode = Number(candidate.episode || 0);
    return candidateLanguage === language
      && (type === "movie" || ((!candidateSeason || candidateSeason === season) && (!candidateEpisode || candidateEpisode === episode)));
  });
  const downloadUrl = subtitleDownloadUrl(selected?.url);
  if (!downloadUrl) return new Response("No subtitle track is available.", { status: 404 });
  let subtitleResponse = await fetch(downloadUrl);
  if (!subtitleResponse.ok) {
    subtitleResponse = await fetch(downloadUrl, { headers: { "x-api-key": apiKey } });
  }
  if (!subtitleResponse.ok) return new Response("Subtitle download failed.", { status: 502 });
  const text = await subtitleResponse.text();
  if (/\\.ass\\b|\\[Script Info\\]/i.test(String(selected?.format || "") + text.slice(0, 200))) {
    return new Response("This subtitle format is not supported.", { status: 415 });
  }
  return new Response(toWebVtt(text), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "text/vtt; charset=utf-8",
    },
  });
}


async function readSubtitle(request: Request, env: Env) {
  const podnapisiText = await readPodnapisiSubtitle(request);
  if (podnapisiText) {
    return new Response(toWebVtt(podnapisiText), {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Content-Type": "text/vtt; charset=utf-8",
      },
    });
  }
  return readSubdlSubtitle(request, env);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(request, env);
    if (!origin) return json({ error: "Origin is not allowed." }, 403, null);
    if (request.method === "OPTIONS") return json(null, 204, origin);
    if (request.method !== "GET") return json({ error: "Method not allowed." }, 405, origin);


    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json({ status: "UP", catalog: Boolean(env.STREAM_CATALOG), upstream: Boolean(env.SOURCE_API_BASE_URL), subtitles: Boolean(env.SUBDL_API_KEY) }, 200, origin);
    }


    if (url.pathname === "/v1/subtitles") {
      try {
        const response = await readSubtitle(request, env);
        response.headers.set("Access-Control-Allow-Origin", origin || "*");
        response.headers.set("Vary", "Origin");
        return response;
      } catch {
        return new Response("Subtitle service unavailable.", {
          status: 502,
          headers: { "Access-Control-Allow-Origin": origin || "*", Vary: "Origin" },
        });
      }
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
