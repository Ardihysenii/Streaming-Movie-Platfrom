import type { HomeData, Movie } from "./types";

function mediaKey(item: Movie) {
  const type = item.media_type ?? "movie";
  const year = item.release_date?.slice(0, 4) ?? "";
  const title = item.title.trim().toLowerCase();
  return item.tmdb_id ? `${type}:tmdb:${item.tmdb_id}` : `${type}:${title}:${year}`;
}

function byNewest(a: Movie, b: Movie) {
  return (Date.parse(b.release_date) || 0) - (Date.parse(a.release_date) || 0)
    || (b.popularity ?? 0) - (a.popularity ?? 0);
}

function byRating(a: Movie, b: Movie) {
  return b.vote_average - a.vote_average
    || (b.vote_count ?? 0) - (a.vote_count ?? 0)
    || (b.popularity ?? 0) - (a.popularity ?? 0);
}

function byPopularity(a: Movie, b: Movie) {
  return (b.popularity ?? 0) - (a.popularity ?? 0)
    || b.vote_average - a.vote_average;
}

function takeDistinct(
  items: Movie[],
  seen: Set<string>,
  limit: number,
  compare?: (a: Movie, b: Movie) => number,
) {
  const source = compare ? [...items].sort(compare) : items;
  const result: Movie[] = [];
  for (const item of source) {
    if (!item.poster_path || item.adult) continue;
    const key = mediaKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length === limit) break;
  }
  return result;
}

export function organizeHomeData(data: HomeData): HomeData {
  const movies = new Set<string>();
  const series = new Set<string>();

  return {
    ...data,
    trending: takeDistinct(data.trending, movies, 10),
    nowPlaying: takeDistinct(data.nowPlaying, movies, 14, byNewest),
    topRated: takeDistinct(data.topRated, movies, 14, byRating),
    action: takeDistinct(
      data.action.filter((item) => item.genre_ids.includes(28)),
      movies,
      14,
      byPopularity,
    ),
    trendingSeries: takeDistinct(data.trendingSeries, series, 14, byPopularity),
    airingSeries: takeDistinct(data.airingSeries, series, 14, byNewest),
    topRatedSeries: takeDistinct(data.topRatedSeries, series, 14, byRating),
  };
}

export function distinctRecommendations(items: Movie[], limit = 14) {
  return takeDistinct(items, new Set<string>(), limit);
}
