type SubtitleFile = Record<string, unknown>;

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number, headers?: HeadersInit) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function subtitleDownloadUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return new URL(value, "https://dl.subdl.com/").toString();
  } catch {
    return null;
  }
}

function normalizeLanguage(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/[-_].*$/, "")
    .toUpperCase();
}

function toWebVtt(value: string) {
  const normalized = value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim();

  if (/^WEBVTT(?:\s|$)/i.test(normalized)) return `${normalized}\n`;

  const converted = normalized.replace(
    /(^|\n)(\d{1,2}:\d{2}:\d{2}),([0-9]{3})\s+-->\s+(\d{1,2}:\d{2}:\d{2}),([0-9]{3})/g,
    "$1$2.$3 --> $4.$5",
  );
  return `WEBVTT\n\n${converted}\n`;
}

function isSupportedSubtitle(format: unknown, text: string) {
  return !/\.ass\b|\.ssa\b|\[Script Info\]/i.test(`${String(format || "")} ${text.slice(0, 300)}`);
}

function pickSubtitle(
  subtitles: SubtitleFile[],
  language: string,
  type: string,
  season: number,
  episode: number,
) {
  const candidates = subtitles.flatMap((subtitle) => {
    const unpacked = Array.isArray(subtitle.unpack_files) ? subtitle.unpack_files : [];
    return (unpacked.length ? unpacked : [subtitle]).map((file) => ({
      ...subtitle,
      ...(file as SubtitleFile),
    }));
  });

  return candidates.find((candidate) => {
    const candidateSeason = Number(candidate.season || 0);
    const candidateEpisode = Number(candidate.episode || 0);
    return normalizeLanguage(candidate.language || candidate.lang) === language
      && (type !== "tv"
        || ((!candidateSeason || candidateSeason === season)
          && (!candidateEpisode || candidateEpisode === episode)));
  });
}

export async function GET(request: Request) {
  const apiKey = process.env.SUBDL_API_KEY?.trim();
  if (!apiKey) return errorResponse("SubDL is not configured on the server.", 503);

  const requestUrl = new URL(request.url);
  const tmdbId = requestUrl.searchParams.get("tmdbId")?.trim();
  const imdbId = requestUrl.searchParams.get("imdbId")?.trim();
  const type = requestUrl.searchParams.get("type") === "tv" ? "tv" : "movie";
  const language = normalizeLanguage(requestUrl.searchParams.get("language") || "en");
  const season = Number(requestUrl.searchParams.get("season") || 1);
  const episode = Number(requestUrl.searchParams.get("episode") || 1);

  if (!tmdbId && !imdbId) return errorResponse("A title identifier is required.", 400);

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
    endpoint.searchParams.set("season_number", String(season));
    endpoint.searchParams.set("episode_number", String(episode));
  }

  let searchResponse: Response;
  try {
    searchResponse = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return errorResponse("SubDL could not be reached.", 502);
  }
  if (!searchResponse.ok) return errorResponse("SubDL subtitle search failed.", 502);

  const payload = await searchResponse.json() as {
    status?: boolean;
    subtitles?: SubtitleFile[];
  };
  if (payload.status === false) return errorResponse("SubDL rejected the subtitle search.", 502);

  const selected = pickSubtitle(payload.subtitles || [], language, type, season, episode);
  const downloadUrl = subtitleDownloadUrl(selected?.url);
  if (!downloadUrl) return errorResponse("No English subtitle track is available for this title.", 404);

  let subtitleResponse: Response;
  try {
    subtitleResponse = await fetch(downloadUrl, {
      cache: "no-store",
    });
  } catch {
    return errorResponse("SubDL subtitle download failed.", 502);
  }
  if (!subtitleResponse.ok) {
    if (subtitleResponse.status === 429) {
      return errorResponse(
        "SubDL’s anonymous subtitle-download limit has been reached. Please try again later.",
        429,
        { "Retry-After": subtitleResponse.headers.get("retry-after") || "" },
      );
    }
    return errorResponse("SubDL subtitle download failed.", 502);
  }

  const text = await subtitleResponse.text();
  if (!isSupportedSubtitle(selected?.format, text)) {
    return errorResponse("SubDL returned an unsupported subtitle format.", 415);
  }

  return new Response(toWebVtt(text), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "text/vtt; charset=utf-8",
    },
  });
}
