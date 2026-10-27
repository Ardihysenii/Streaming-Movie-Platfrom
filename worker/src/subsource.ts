import { unzipSync } from "fflate";

const BASE = "https://api.subsource.net/api/v1";
const MAX_ARCHIVE = 4 * 1024 * 1024;
const MAX_FILE = 2 * 1024 * 1024;
type Row = Record<string, unknown>;

function rows(payload: unknown): Row[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as Row).data;
  return Array.isArray(data) ? data.filter((row): row is Row => !!row && typeof row === "object") : [];
}

export function subsourceLanguage(value: string) {
  const code = value.trim().toLowerCase().replace(/_/g, "-");
  const aliases: Record<string, string> = { sq: "albanian", sqi: "albanian", alb: "albanian", albanian: "albanian", en: "english", pt: "portuguese", "pt-br": "brazilian-portuguese", zh: "chinese" };
  if (aliases[code]) return aliases[code];
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(code);
    if (name && name !== code) return name.toLowerCase();
  } catch { /* Reject unknown language tags rather than silently returning English. */ }
  throw new Error("Unsupported SubSource subtitle language.");
}

export function matchesEpisode(value: string, season: number, episode: number) {
  const names = [...value.matchAll(/(?:^|[^a-z0-9])s(\d{1,2})[ ._-]*e(\d{1,3})(?!\d)/gi)];
  const cross = [...value.matchAll(/(?:^|[^a-z0-9])(\d{1,2})x(\d{1,3})(?!\d)/gi)];
  const matches = [...names, ...cross];
  // Never treat an unmarked season pack or a multi-episode release as one episode.
  if (/e\d{1,3}[ ._-]*(?:e\d|[-+]\d)/i.test(value)) return false;
  return matches.length > 0 && matches.every((m) => Number(m[1]) === season && Number(m[2]) === episode);
}

async function limitedBody(response: Response, maximum: number) {
  if (Number(response.headers.get("content-length")) > maximum) throw new Error("SubSource archive is too large.");
  if (!response.body) throw new Error("SubSource returned an empty archive.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximum) throw new Error("SubSource archive is too large.");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

export function extractSubsourceTrack(archive: Uint8Array, tv: boolean, season: number, episode: number, release: string) {
  let total = 0;
  let count = 0;
  const files = unzipSync(archive, { filter: (file) => {
    count++;
    total += file.originalSize;
    if (count > 200 || total > 16 * MAX_FILE) throw new Error("SubSource archive exceeds safe extraction limits.");
    return /\.(srt|vtt)$/i.test(file.name) && file.originalSize <= MAX_FILE;
  } });
  const candidates = Object.entries(files).filter(([name]) => !/\/__MACOSX\/|^__MACOSX\/|(?:^|\/)\._/.test(name));
  const exact = tv ? candidates.filter(([name]) => matchesEpisode(name, season, episode)) : candidates;
  const selected = exact.length ? exact : tv && candidates.length === 1 && matchesEpisode(release, season, episode) ? candidates : [];
  if (!selected.length) throw new Error("No matching SubSource subtitle file is available.");
  const bytes = selected[0][1];
  let text: string;
  if (bytes[0] === 0xff && bytes[1] === 0xfe) text = new TextDecoder("utf-16le").decode(bytes);
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) text = new TextDecoder("utf-16be").decode(bytes);
  else {
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch { text = new TextDecoder("windows-1252").decode(bytes); }
  }
  if (!/\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s+-->\s+\d{1,2}:\d{2}:\d{2}[,.]\d{3}/.test(text)) throw new Error("SubSource returned an invalid subtitle track.");
  return text;
}

export async function readSubsource(request: Request, env: { SUBSOURCE_API_KEY?: string }, toWebVtt: (text: string) => string) {
  const key = env.SUBSOURCE_API_KEY?.trim();
  if (!key) throw new Error("SubSource is not configured on the server.");
  const params = new URL(request.url).searchParams;
  const imdb = params.get("imdbId")?.trim();
  const tmdb = params.get("tmdbId")?.trim();
  const title = params.get("title")?.trim();
  const year = params.get("year")?.trim();
  const tv = params.get("type") === "tv";
  const season = Number(params.get("season") || 1), episode = Number(params.get("episode") || 1);
  if (tv && (!Number.isInteger(season) || season < 0 || !Number.isInteger(episode) || episode < 1)) throw new Error("Invalid SubSource episode.");
  const language = subsourceLanguage(params.get("language") || "en");
  if (!imdb && !title) throw new Error("SubSource requires an IMDb ID or title.");
  if (imdb && !/^tt\d+$/i.test(imdb)) throw new Error("Invalid IMDb identifier.");
  async function api(path: string, binary = false): Promise<Response> {
    const response = await fetch(BASE + path, { headers: { "X-API-Key": key!, Accept: binary ? "application/zip" : "application/json" }, signal: AbortSignal.timeout(15000), redirect: "error" });
    if (!response.ok) throw new Error(`SubSource request failed (${response.status}).`);
    return response;
  }
  const search = new URLSearchParams(imdb ? { searchType: "imdb", imdb } : { searchType: "text", q: title! });
  search.set("type", tv ? "series" : "movie");
  if (tv) search.set("season", String(season));
  if (year) search.set("year", year);
  const movies = rows(await (await api("/movies/search?" + search)).json());
  const movie = movies.find((row) => {
    if (tv && Number(row.season) !== season) return false;
    if (imdb) return String(row.imdbId).toLowerCase() === imdb.toLowerCase();
    if (tmdb && row.tmdbId) return String(row.tmdbId) === tmdb;
    return !!year && String(row.releaseYear) === year && String(row.title).toLowerCase() === title!.toLowerCase();
  });
  if (!movie || !Number.isSafeInteger(Number(movie.movieId)) || Number(movie.movieId) <= 0) throw new Error("No matching SubSource title is available.");
  const query = new URLSearchParams({ movieId: String(movie.movieId), language, limit: "100", sort: "popular" });
  // Bound pagination and candidate downloads so a missing episode cannot exhaust the account quota.
  let attempts = 0;
  for (let page = 1; page <= 3; page++) {
    query.set("page", String(page));
    const payload = await (await api("/subtitles?" + query)).json() as Row;
    const tracks = rows(payload).filter((row) => String(row.language).toLowerCase() === language);
    for (const row of tracks) {
      const id = Number(row.subtitleId);
      if (!Number.isSafeInteger(id) || id <= 0) continue;
      const release = Array.isArray(row.releaseInfo) ? row.releaseInfo.join(" ") : String(row.releaseInfo || "");
      // Known single-episode releases must match. Unmarked season packs are inspected by filename.
      if (tv && /s\d+[ ._-]*e\d+|\d+x\d+/i.test(release) && !matchesEpisode(release, season, episode)) continue;
      if (++attempts > 3) throw new Error("No usable SubSource track found within the download limit.");
      const download = await api(`/subtitles/${id}/download`, true);
      const archive = await limitedBody(download, MAX_ARCHIVE);
      try {
        const text = extractSubsourceTrack(archive, tv, season, episode, release);
        return new Response(toWebVtt(text), { headers: { "Cache-Control": "public, max-age=300", "Content-Type": "text/vtt; charset=utf-8", "X-Subtitle-Source": "subsource", "Access-Control-Expose-Headers": "X-Subtitle-Source" } });
      } catch { /* Try the next release when a pack has no matching supported file. */ }
    }
    const pagination = payload.pagination as Row | undefined;
    if (!pagination || page >= Number(pagination.pages || 1)) break;
  }
  throw new Error("No SubSource track is available in the selected language.");
}
