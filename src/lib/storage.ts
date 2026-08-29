import type { ContinueWatchingItem, Movie, NovaSettings, WishlistItem } from "./types";

const SETTINGS_KEY = "nova:settings:v1";
const CONTINUE_KEY = "nova:continue-watching:v1";
const WISHLIST_KEY = "nova:wishlist:v1";

export const DEFAULT_SETTINGS: NovaSettings = {
  accent: "signal",
  density: "cinematic",
  heroInterval: 8,
  autoplayHero: true,
  autoplayPlayer: false,
  subtitleLanguage: "en",
  reduceMotion: false,
  showFilmGrain: true,
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readSettings(): NovaSettings {
  if (!canUseStorage()) return DEFAULT_SETTINGS;
  try {
    const saved = window.localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settings: NovaSettings) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function readContinueWatching(): ContinueWatchingItem[] {
  if (!canUseStorage()) return [];
  try {
    const saved = window.localStorage.getItem(CONTINUE_KEY);
    const parsed = saved ? (JSON.parse(saved) as ContinueWatchingItem[]) : [];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12);
  } catch {
    return [];
  }
}

export function saveWatchProgress(
  movie: Movie,
  watchedSeconds: number,
  estimatedDurationSeconds = 7200,
) {
  if (!canUseStorage()) return;
  const items = readContinueWatching().filter((item) => item.id !== movie.id);
  const nextItem: ContinueWatchingItem = {
    ...movie,
    watchedSeconds: Math.max(1, Math.round(watchedSeconds)),
    estimatedDurationSeconds,
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(CONTINUE_KEY, JSON.stringify([nextItem, ...items].slice(0, 12)));
  window.dispatchEvent(new CustomEvent("nova:continue-updated"));
}

export function removeContinueWatching(id: string | number) {
  if (!canUseStorage()) return;
  const items = readContinueWatching().filter((item) => item.id !== id);
  window.localStorage.setItem(CONTINUE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("nova:continue-updated"));
}

export function clearContinueWatching() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(CONTINUE_KEY);
  window.dispatchEvent(new CustomEvent("nova:continue-updated"));
}

export function getSavedProgress(id: string | number) {
  // Movie IDs are stored as numbers from TMDB but arrive from the watch URL
  // as strings. Compare their normalized values so movie resumes work just
  // like the namespaced series episode keys.
  const normalizedId = String(id);
  return readContinueWatching().find((item) => String(item.id) === normalizedId)?.watchedSeconds ?? 0;
}

function wishlistIdentity(movie: Pick<Movie, "id" | "tmdb_id" | "media_type">) {
  return `${movie.media_type ?? "movie"}:${movie.tmdb_id ?? movie.id}`;
}

export function readWishlist(): WishlistItem[] {
  if (!canUseStorage()) return [];
  try {
    const saved = window.localStorage.getItem(WISHLIST_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed
      .filter((item): item is WishlistItem => item && typeof item === "object" && (typeof item.id === "string" || typeof item.id === "number"))
      .map((item) => ({ ...item, addedAt: Number(item.addedAt) || 0 }))
      .sort((a, b) => b.addedAt - a.addedAt)
      .filter((item) => {
        const identity = wishlistIdentity(item);
        if (seen.has(identity)) return false;
        seen.add(identity);
        return true;
      });
  } catch {
    return [];
  }
}

export function isInWishlist(movie: Pick<Movie, "id" | "tmdb_id" | "media_type">) {
  const identity = wishlistIdentity(movie);
  return readWishlist().some((item) => wishlistIdentity(item) === identity);
}

export function toggleWishlist(movie: Movie) {
  if (!canUseStorage()) return false;
  const identity = wishlistIdentity(movie);
  const items = readWishlist();
  const exists = items.some((item) => wishlistIdentity(item) === identity);
  const nextItems = exists
    ? items.filter((item) => wishlistIdentity(item) !== identity)
    : [{ ...movie, addedAt: Date.now() }, ...items];
  window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(nextItems));
  window.dispatchEvent(new CustomEvent("nova:wishlist-updated"));
  return !exists;
}

export function removeWishlist(movie: Pick<Movie, "id" | "tmdb_id" | "media_type">) {
  if (!canUseStorage()) return;
  const identity = wishlistIdentity(movie);
  const nextItems = readWishlist().filter((item) => wishlistIdentity(item) !== identity);
  window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(nextItems));
  window.dispatchEvent(new CustomEvent("nova:wishlist-updated"));
}

export function clearWishlist() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(WISHLIST_KEY);
  window.dispatchEvent(new CustomEvent("nova:wishlist-updated"));
}
