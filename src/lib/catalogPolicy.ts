// Block only this film, not the Renegade Immortal series or other animation.
export function isBlockedTitle(item: { id?: string | number; tmdb_id?: string | number; moviedb_id?: string | number; media_type?: string; type?: string; title?: string; name?: string; original_title?: string; original_name?: string }) {
  const type = item.media_type ?? item.type;
  if ((item.title || item.original_title || item.tmdb_id || item.moviedb_id || type === "movie") && type !== "tv" && type !== "series" && type !== "person" && String(item.tmdb_id ?? item.moviedb_id ?? item.id ?? "") === "1599191") return true;
  return [item.title, item.name, item.original_title, item.original_name].some((title) => {
    const normalized = title?.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    return normalized === "renegadeimmortalbattleoftheimmortalslayer" || normalized === "仙逆剧场版弑仙之战";
  });
}

export function filterCatalogResponse<T>(value: T): T {
  if (Array.isArray(value)) return value.filter((item) => !item || typeof item !== "object" || !isBlockedTitle(item)).map(filterCatalogResponse) as T;
  if (value && typeof value === "object") {
    if (isBlockedTitle(value as Parameters<typeof isBlockedTitle>[0])) {
      const error = new Error("This title is unavailable.");
      error.name = "CatalogBlockedError";
      throw error;
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, item && typeof item === "object" ? filterCatalogResponse(item) : item])) as T;
  }
  return value;
}
