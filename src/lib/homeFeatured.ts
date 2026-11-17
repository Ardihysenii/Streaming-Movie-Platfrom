import type { Movie } from "./types";
import { isFamousFeatured } from "./famousFeatured";

// Stable within a Budapest calendar week; automatically advances on Mondays.
// The caller supplies released titles from the refreshed catalog.
export function selectWeeklyFeatured(items: Movie[], calendarDate: string, limit = 10): Movie[] {
  const seen = new Set<string>();
  const pool = items.filter((item) => {
    const key = `${item.media_type ?? "movie"}:${item.tmdb_id ?? item.id}`;
    if (!isFamousFeatured(item) || seen.has(key) || item.adult || !item.genre_ids.length || item.genre_ids.includes(16)
      || !item.backdrop_path || !item.poster_path || item.title.trim().toLowerCase() === "runner") return false;
    seen.add(key);
    return true;
  }).sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)
    || b.vote_average - a.vote_average
    || String(a.tmdb_id ?? a.id).localeCompare(String(b.tmdb_id ?? b.id), "en"));
  if (!pool.length || limit <= 0) return [];
  const timestamp = Date.parse(calendarDate + "T00:00:00Z");
  const week = Number.isFinite(timestamp)
    ? Math.floor((timestamp - Date.UTC(2026, 0, 5)) / (7 * 86_400_000))
    : 0;
  // Move a whole selection forward, not just the opening hero. When the pool
  // is small, still rotate its ordering instead of freezing on the same lead.
  const count = Math.min(Math.floor(limit), pool.length);
  const step = count % pool.length || 1;
  const offset = ((week * step) % pool.length + pool.length) % pool.length;
  return Array.from({ length: count }, (_, index) => pool[(offset + index) % pool.length]);
}
