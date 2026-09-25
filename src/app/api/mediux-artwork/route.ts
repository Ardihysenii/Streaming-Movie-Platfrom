import { NextResponse } from "next/server";

type MediuxFile = {
  id: string;
  title: string;
  fileType: string;
  textless: boolean;
};

const FILE = /"id":"([0-9a-f-]{36})","filename_disk":"[^"]+","title":"([^"]*)","fileType":"([^"]+)"/g;

export const revalidate = 86400;

function decodePage(html: string) {
  return html.replace(/\\"/g, '"');
}

function sectionBetween(page: string, startMarker: string, endMarker?: string) {
  const start = page.indexOf(startMarker);
  if (start < 0) return "";
  const from = start + startMarker.length;
  const end = endMarker ? page.indexOf(endMarker, from) : -1;
  return page.slice(from, end >= 0 ? end : page.length);
}

function filesFromSection(section: string) {
  const files: MediuxFile[] = [];
  const seen = new Set<string>();
  for (const match of section.matchAll(FILE)) {
    const id = match[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const tail = section.slice(match.index ?? 0, (match.index ?? 0) + 900);
    files.push({
      id,
      title: match[2],
      fileType: match[3],
      textless: /"textless":true/.test(tail),
    });
  }
  return files;
}

function chooseArtwork(page: string) {
  const currentSets = sectionBetween(page, '"sets":[', '],"collectionSets":[');
  const collectionSets = sectionBetween(page, '"collectionSets":[');
  const ownBackdrops = filesFromSection(currentSets).filter((file) => file.fileType === "backdrop");
  const collectionBackdrops = filesFromSection(collectionSets).filter((file) => file.fileType === "backdrop");
  const selected = ownBackdrops.find((file) => /-\s*backdrop$/i.test(file.title)) ?? ownBackdrops[0];
  if (selected) {
    return { id: selected.id, needsLogo: selected.textless || !/-\s*backdrop$/i.test(selected.title) };
  }
  const collectionFallback = collectionBackdrops[0];
  return collectionFallback ? { id: collectionFallback.id, needsLogo: true } : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tmdbId = url.searchParams.get("tmdb_id")?.trim() ?? "";
  const type = url.searchParams.get("type") === "tv" ? "tv" : "movie";

  if (!/^\d+$/.test(tmdbId)) {
    return NextResponse.json({ image_url: null, needs_logo: false }, { status: 400 });
  }

  try {
    const response = await fetch(
      "https://mediux.pro/" + (type === "tv" ? "shows" : "movies") + "/" + tmdbId,
      { headers: { accept: "text/html,application/xhtml+xml" }, next: { revalidate } },
    );
    if (!response.ok) return NextResponse.json({ image_url: null, needs_logo: false });

    const artwork = chooseArtwork(decodePage(await response.text()));
    return NextResponse.json({
      image_url: artwork ? "https://api.mediux.pro/assets/" + artwork.id : null,
      needs_logo: artwork?.needsLogo ?? false,
    });
  } catch {
    return NextResponse.json({ image_url: null, needs_logo: false });
  }
}
