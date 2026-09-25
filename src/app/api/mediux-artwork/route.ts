import { NextResponse } from "next/server";

const ASSET_ID = /\\"id\\":\\"([0-9a-f-]{36})\\"[^{}]{0,1400}?\\"fileType\\":\\"backdrop\\"/g;

export const revalidate = 86400;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tmdbId = url.searchParams.get("tmdb_id")?.trim() ?? "";
  const type = url.searchParams.get("type") === "tv" ? "tv" : "movie";

  if (!/^\d+$/.test(tmdbId)) {
    return NextResponse.json({ image_url: null }, { status: 400 });
  }

  try {
    const response = await fetch(`https://mediux.pro/${type === "tv" ? "shows" : "movies"}/${tmdbId}`, {
      headers: { accept: "text/html,application/xhtml+xml" },
      next: { revalidate },
    });
    if (!response.ok) return NextResponse.json({ image_url: null });

    const html = await response.text();
    const match = ASSET_ID.exec(html);
    ASSET_ID.lastIndex = 0;
    return NextResponse.json({
      image_url: match ? `https://api.mediux.pro/assets/${match[1]}` : null,
    });
  } catch {
    ASSET_ID.lastIndex = 0;
    return NextResponse.json({ image_url: null });
  }
}
