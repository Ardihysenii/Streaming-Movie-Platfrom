import type { Movie } from "./types";

type TitleLogoOverride = {
  url: string;
  width: number;
  height: number;
};

// A small override table covers titles whose catalog provider has no usable
// transparent logo. The key may be either the TMDB id or the IMDb id.
const TITLE_LOGO_OVERRIDES: Record<string, TitleLogoOverride> = {
  "1323244": {
    url: "/title-logos/rage-of-stars.svg",
    width: 1200,
    height: 280,
  },
  tt29512655: {
    url: "/title-logos/rage-of-stars.svg",
    width: 1200,
    height: 280,
  },
};

export function applyTitleLogoOverride<T extends Movie>(movie: T): T {
  const override = TITLE_LOGO_OVERRIDES[String(movie.tmdb_id ?? movie.id)];
  return override
    ? { ...movie, logo_url: override.url, logo_width: override.width, logo_height: override.height }
    : movie;
}

