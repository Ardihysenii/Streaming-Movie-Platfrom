import { test } from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import worker from "../src/index";
import { extractSubsourceTrack, matchesEpisode, subsourceLanguage } from "../src/subsource";

const srt = "1\n00:00:01,000 --> 00:00:03,000\nPërshëndetje!\n";
const archive = (files: Record<string, string>) => zipSync(Object.fromEntries(Object.entries(files).map(([name, text]) => [name, strToU8(text)])));

test("maps the existing player language choices, including Albanian", () => {
  assert.equal(subsourceLanguage("sq"), "albanian");
  assert.equal(subsourceLanguage("en"), "english");
  assert.equal(subsourceLanguage("de"), "german");
  assert.equal(subsourceLanguage("fr"), "french");
});
test("matches exact TV episodes without choosing neighbours or multi-episode releases", () => {
  assert.ok(matchesEpisode("Show.S01E02.1080p.srt", 1, 2));
  assert.ok(matchesEpisode("Show.1x02.srt", 1, 2));
  assert.equal(matchesEpisode("Show.S01E03.srt", 1, 2), false);
  assert.equal(matchesEpisode("Show.S01E020.srt", 1, 2), false);
  assert.equal(matchesEpisode("Show.S01E02E03.srt", 1, 2), false);
  assert.equal(matchesEpisode("Season 1 pack", 1, 2), false);
});
test("extracts UTF-8 movie subtitles and preserves diacritics", () => {
  assert.equal(extractSubsourceTrack(archive({ "movie.srt": srt }), false, 1, 1, ""), srt);
});
test("selects only the requested episode from a season pack", () => {
  assert.equal(extractSubsourceTrack(archive({ "Show.S01E01.srt": srt.replace("Përshëndetje", "wrong"), "Show.S01E02.srt": srt }), true, 1, 2, "Season 1"), srt);
});
test("accepts an unmarked single file only with an exact episode release", () => {
  assert.equal(extractSubsourceTrack(archive({ "subtitle.srt": srt }), true, 1, 2, "Show.S01E02"), srt);
  assert.throws(() => extractSubsourceTrack(archive({ "subtitle.srt": srt }), true, 1, 2, "Season 1"));
});
test("rejects missing episodes, unsupported formats, invalid subtitle text and oversize files", () => {
  assert.throws(() => extractSubsourceTrack(archive({ "Show.S01E01.srt": srt }), true, 1, 2, ""));
  assert.throws(() => extractSubsourceTrack(archive({ "movie.ass": srt }), false, 1, 1, ""));
  assert.throws(() => extractSubsourceTrack(archive({ "movie.srt": "<html>Error</html>" }), false, 1, 1, ""));
  assert.throws(() => extractSubsourceTrack(archive({ "movie.srt": "x".repeat(2 * 1024 * 1024 + 1) }), false, 1, 1, ""));
});
test("health exposes configuration, never the secret", async () => {
  const response = await worker.fetch(new Request("https://worker/health"), { SUBSOURCE_API_KEY: "test-secret" });
  const body = await response.json() as any;
  assert.equal(body.subtitleProviders.subsource, true);
  assert.equal(body.subtitles, true);
  assert.equal(JSON.stringify(body).includes("test-secret"), false);
});
test("explicit unconfigured SubSource never falls through to another provider", async () => {
  const response = await worker.fetch(new Request("https://worker/v1/subtitles?provider=subsource&imdbId=tt1375666"), {});
  assert.equal(response.status, 502);
});
test("mocked provider performs search, language filter, ZIP download and WebVTT conversion", async () => {
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input)); urls.push(url.href);
    assert.equal(new Headers(init?.headers).get("X-API-Key"), "test-secret");
    if (url.pathname.endsWith("/movies/search")) return Response.json({ data: [{ movieId: 123, imdbId: "tt1375666" }] });
    if (url.pathname.endsWith("/subtitles")) {
      assert.equal(url.searchParams.get("language"), "albanian");
      return Response.json({ data: [{ subtitleId: 456, language: "albanian", releaseInfo: ["WEB"] }], pagination: { pages: 1 } });
    }
    return new Response(archive({ "movie.srt": srt }) as BodyInit);
  }) as typeof fetch;
  try {
    const response = await worker.fetch(new Request("https://worker/v1/subtitles?provider=subsource&imdbId=tt1375666&language=sq"), { SUBSOURCE_API_KEY: "test-secret" });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("X-Subtitle-Source"), "subsource");
    assert.match(await response.text(), /^WEBVTT\n\n1\n00:00:01\.000/);
    assert.equal(urls.length, 3);
    assert.ok(urls.every(url => !url.includes("test-secret")));
  } finally { globalThis.fetch = original; }
});
test("auto mode reaches SubSource after unavailable existing providers", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/movies/search")) return Response.json({ data: [{ movieId: 123, imdbId: "tt1375666" }] });
    if (url.pathname.endsWith("/subtitles")) return Response.json({ data: [{ subtitleId: 456, language: "english" }] });
    return new Response(archive({ "movie.srt": srt }) as BodyInit);
  }) as typeof fetch;
  try {
    const response = await worker.fetch(new Request("https://worker/v1/subtitles?provider=auto&imdbId=tt1375666"), { SUBSOURCE_API_KEY: "test-secret" });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("X-Subtitle-Source"), "subsource");
  } finally { globalThis.fetch = original; }
});
