import type { Movie } from "./types";
export const MOOD_LABELS = ["Intense Thrills", "Chill & Relax", "Action Packed", "Heartwarming", "Nighttime Vibes"];
// One best-fitting mood per title; no unrelated fallback results.
export function moodIndex(movie: Movie): number | null {
  const has = (...ids: number[]) => ids.some((id) => movie.genre_ids.includes(id));
  if (has(27, 9648)) return 4;
  if (has(53, 80) && !has(35, 10751)) return 0;
  if (has(28, 12) && !has(35, 10749, 10751)) return 2;
  if (has(10751, 10749) && !has(53, 80, 28)) return 3;
  if (has(35, 10402) && !has(53, 80, 28)) return 1;
  if (has(18) && !has(53, 80, 28, 878)) return 3;
  return null;
}
export function buildMoodChoices(movies: Movie[]) {
  const choices = MOOD_LABELS.map((label) => ({ label, movies: [] as Movie[] }));
  const seen = new Set<string>();
  for (const movie of movies) {
    const key = (movie.media_type ?? "movie") + ":" + (movie.tmdb_id ?? movie.id);
    if (seen.has(key) || !movie.poster_path || movie.adult) continue;
    seen.add(key);
    const index = moodIndex(movie);
    if (index !== null) choices[index].movies.push(movie);
  }
  return choices;
}
