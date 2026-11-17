import type { Movie } from "./types";

// Editorial pool: deliberate, recognizable live-action picks, not trending filler.
// IDs are paired with live catalog identities so remakes/namesakes cannot slip in.
export const FAMOUS_FEATURED_TITLES = [
  {"imdbId":"tt1375666","tmdbId":27205,"type":"movie","title":"Inception"},
  {"imdbId":"tt0903747","tmdbId":1396,"type":"tv","title":"Breaking Bad"},
  {"imdbId":"tt1130884","tmdbId":11324,"type":"movie","title":"Shutter Island"},
  {"imdbId":"tt0773262","tmdbId":1405,"type":"tv","title":"Dexter"},
  {"imdbId":"tt0816692","tmdbId":157336,"type":"movie","title":"Interstellar"},
  {"imdbId":"tt3032476","tmdbId":60059,"type":"tv","title":"Better Call Saul"},
  {"imdbId":"tt0468569","tmdbId":155,"type":"movie","title":"The Dark Knight"},
  {"imdbId":"tt0944947","tmdbId":1399,"type":"tv","title":"Game of Thrones"},
  {"imdbId":"tt0137523","tmdbId":550,"type":"movie","title":"Fight Club"},
  {"imdbId":"tt11198330","tmdbId":94997,"type":"tv","title":"House of the Dragon"},
  {"imdbId":"tt0114369","tmdbId":807,"type":"movie","title":"Seven"},
  {"imdbId":"tt4574334","tmdbId":66732,"type":"tv","title":"Stranger Things"},
  {"imdbId":"tt0482571","tmdbId":1124,"type":"movie","title":"The Prestige"},
  {"imdbId":"tt2442560","tmdbId":60574,"type":"tv","title":"Peaky Blinders"},
  {"imdbId":"tt0407887","tmdbId":1422,"type":"movie","title":"The Departed"},
  {"imdbId":"tt0455275","tmdbId":2288,"type":"tv","title":"Prison Break"},
  {"imdbId":"tt0172495","tmdbId":98,"type":"movie","title":"Gladiator"},
  {"imdbId":"tt1196946","tmdbId":5920,"type":"tv","title":"The Mentalist"},
  {"imdbId":"tt0111161","tmdbId":278,"type":"movie","title":"The Shawshank Redemption"},
  {"imdbId":"tt1475582","tmdbId":19885,"type":"tv","title":"Sherlock"},
  {"imdbId":"tt0068646","tmdbId":238,"type":"movie","title":"The Godfather"},
  {"imdbId":"tt0141842","tmdbId":1398,"type":"tv","title":"The Sopranos"},
  {"imdbId":"tt0133093","tmdbId":603,"type":"movie","title":"The Matrix"},
  {"imdbId":"tt0306414","tmdbId":1438,"type":"tv","title":"The Wire"},
  {"imdbId":"tt1160419","tmdbId":438631,"type":"movie","title":"Dune"},
  {"imdbId":"tt2356777","tmdbId":46648,"type":"tv","title":"True Detective"},
  {"imdbId":"tt15239678","tmdbId":693134,"type":"movie","title":"Dune: Part Two"},
  {"imdbId":"tt7660850","tmdbId":76331,"type":"tv","title":"Succession"},
  {"imdbId":"tt15398776","tmdbId":872585,"type":"movie","title":"Oppenheimer"},
  {"imdbId":"tt1190634","tmdbId":76479,"type":"tv","title":"The Boys"},
  {"imdbId":"tt1877830","tmdbId":414906,"type":"movie","title":"The Batman"},
  {"imdbId":"tt0411008","tmdbId":4607,"type":"tv","title":"Lost"},
  {"imdbId":"tt1745960","tmdbId":361743,"type":"movie","title":"Top Gun: Maverick"},
  {"imdbId":"tt10366206","tmdbId":603692,"type":"movie","title":"John Wick: Chapter 4"},
  {"imdbId":"tt3659388","tmdbId":286217,"type":"movie","title":"The Martian"},
  {"imdbId":"tt1345836","tmdbId":49026,"type":"movie","title":"The Dark Knight Rises"},
  {"imdbId":"tt33764258","tmdbId":1368337,"type":"movie","title":"The Odyssey"},
] as const;

const famousIdentities = new Set<string>(FAMOUS_FEATURED_TITLES.flatMap((pick) => [
  pick.type + ":" + pick.imdbId,
  pick.type + ":" + pick.tmdbId,
]));

export function isFamousFeatured(item: Pick<Movie, "id" | "tmdb_id" | "media_type">) {
  const type = item.media_type ?? "movie";
  return famousIdentities.has(type + ":" + item.id)
    || (item.tmdb_id !== undefined && famousIdentities.has(type + ":" + item.tmdb_id));
}

export function famousPicksForWeek(calendarDate: string, type?: "movie" | "tv") {
  const pool = FAMOUS_FEATURED_TITLES.filter((pick) => !type || pick.type === type);
  const time = Date.parse(calendarDate + "T00:00:00Z");
  const week = Number.isFinite(time) ? Math.floor((time - Date.UTC(2026, 0, 5)) / (7 * 86_400_000)) : 0;
  const step = 10 % pool.length || 1;
  const start = ((week * step) % pool.length + pool.length) % pool.length;
  return pool.map((_, index) => pool[(start + index) % pool.length]);
}
