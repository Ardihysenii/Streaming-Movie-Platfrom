import type { ContinueWatchingItem, SeriesDetails } from "./types";

// Read-only hint: never changes saved progress, navigation, or player behavior.
export function getNextEpisode(
  series: Pick<SeriesDetails, "id" | "tmdb_id" | "seasons">,
  items: ContinueWatchingItem[],
): { seasonNumber: number; episodeNumber: number } | null {
  const seriesIds = new Set([String(series.id)]);
  if (series.tmdb_id !== undefined) seriesIds.add(String(series.tmdb_id));

  const latest = items
    .map((item) => ({ item, match: /^(.+):s(\d+)e(\d+)$/.exec(String(item.id)) }))
    .filter(({ item, match }) => match && seriesIds.has(match[1]) && item.watchedSeconds > 0)
    .sort((a, b) => b.item.updatedAt - a.item.updatedAt)[0];
  if (!latest?.match) return null;

  const { item, match } = latest;
  // Opening an episode (or only partly watching it) does not mark it finished.
  if (!Number.isFinite(item.estimatedDurationSeconds) || item.estimatedDurationSeconds <= 0
    || !Number.isFinite(item.watchedSeconds)
    || item.watchedSeconds / item.estimatedDurationSeconds < 0.95) return null;

  const seasonNumber = Number(match[2]);
  const episodeNumber = Number(match[3]);
  const currentSeason = series.seasons.find((season) => season.season_number === seasonNumber);
  if (!currentSeason || seasonNumber < 1 || episodeNumber < 1
    || episodeNumber > currentSeason.episode_count) return null;

  if (episodeNumber < currentSeason.episode_count) {
    return { seasonNumber, episodeNumber: episodeNumber + 1 };
  }

  const nextSeason = series.seasons
    .filter((season) => season.season_number > seasonNumber && season.episode_count > 0)
    .sort((a, b) => a.season_number - b.season_number)[0];
  return nextSeason ? { seasonNumber: nextSeason.season_number, episodeNumber: 1 } : null;
}
