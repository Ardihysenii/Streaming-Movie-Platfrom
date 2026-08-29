import type { Movie } from "./types";

const FANART_API_BASE = "https://webservice.fanart.tv/v3.2";
const fanartProjectKey = process.env.NEXT_PUBLIC_FANART_API_KEY?.trim();
const fanartPersonalKey = process.env.NEXT_PUBLIC_FANART_CLIENT_KEY?.trim();

type FanartLogo = {
  id: string;
  url: string;
  lang: string;
  likes: string;
  width?: string;
  height?: string;
};

type FanartMovieImages = {
  hdmovielogo?: FanartLogo[];
  movielogo?: FanartLogo[];
};

type FanartSeriesImages = {
  hdtvlogo?: FanartLogo[];
  tvlogo?: FanartLogo[];
  clearlogo?: FanartLogo[];
};

export const hasFanartKey = Boolean(
  (fanartProjectKey && fanartProjectKey !== "your_fanart_api_key") ||
    (fanartPersonalKey && fanartPersonalKey !== "your_fanart_personal_key"),
);

function logoScore(logo: FanartLogo) {
  const languageScore = logo.lang === "en" ? 1_000_000 : logo.lang === "00" ? 500_000 : 0;
  return languageScore + Number(logo.likes || 0) * 1_000 + Number(logo.width || 0);
}

export async function withFanartLogo<T extends Movie>(movie: T, signal?: AbortSignal): Promise<T> {
  if (!hasFanartKey) return movie;

  try {
    const collection = movie.media_type === "tv" ? "tv" : "movies";
    const url = new URL(`${FANART_API_BASE}/${collection}/${movie.id}`);
    if (fanartProjectKey && fanartProjectKey !== "your_fanart_api_key") {
      url.searchParams.set("api_key", fanartProjectKey);
    }
    if (fanartPersonalKey && fanartPersonalKey !== "your_fanart_personal_key") {
      url.searchParams.set("client_key", fanartPersonalKey);
    }
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal,
    });

    if (response.status === 404) return movie;
    if (!response.ok) throw new Error(`Fanart.tv request failed (${response.status})`);

    const images = (await response.json()) as FanartMovieImages & FanartSeriesImages;
    const logo = [
      ...(images.hdmovielogo ?? []),
      ...(images.movielogo ?? []),
      ...(images.hdtvlogo ?? []),
      ...(images.tvlogo ?? []),
      ...(images.clearlogo ?? []),
    ]
      .filter((asset) => asset.url)
      .sort((a, b) => logoScore(b) - logoScore(a))[0];

    if (!logo) return movie;
    return {
      ...movie,
      logo_url: logo.url.replace(/^http:/, "https:"),
      logo_width: Number(logo.width) || 800,
      logo_height: Number(logo.height) || 310,
    } as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return movie;
  }
}
