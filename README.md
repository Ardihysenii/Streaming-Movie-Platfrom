# NOVA Movie Platform

NOVA is a responsive Next.js movie discovery interface with a frontend-only licensed VidSrc embed. TMDB supplies movie metadata with Cinemeta as an automatic fallback; Fanart.tv can supply optional title logos; browser storage keeps settings and Continue Watching entries.

## Experience included

- Animated NOVA opening splash
- Weekly top-ten hero with automatic rotation and navigation arrows
- Search, genres, discovery filters, pagination, recommendations, and full movie detail pages
- Cast/director photography and original movie artwork
- Responsive desktop and mobile layouts with loaders at asynchronous boundaries
- Local settings for appearance, autoplay, subtitles, motion, density, and film texture
- Frontend-only VidSrc iframe playback using the selected TMDB movie ID
- Static frontend export; no Cloudflare Worker is required for the active player

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

Copy `.env.example` to `.env.local` and configure:

```env
NEXT_PUBLIC_FANART_CLIENT_KEY=your_optional_fanart_key
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_v3_api_key
NEXT_PUBLIC_PLAYER_PROVIDER=vidsrc
NEXT_PUBLIC_VIDEO_PROVIDER_URL=https://vidsrc.sbs
```

TMDB provides discovery and metadata, not movie video. NOVA uses Cinemeta automatically if the TMDB key is missing or TMDB is temporarily unavailable. Never place the longer TMDB API Read Access Token in a `NEXT_PUBLIC_` variable because those variables are compiled into browser code.

## Playback architecture

The watch page builds a provider embed URL from the selected TMDB movie ID and loads it directly in an iframe. The provider controls the in-player quality, subtitles, buffering, fullscreen behavior, and playback UI; NOVA keeps ownership of the surrounding design and metadata experience.

The optional direct-source Worker and custom HTML5/HLS player remain in the repository for a future migration, but they are inactive.

## Build

```bash
npm run lint
npm run build
```

The static site is generated in `out/` and can be deployed to Vercel or any static host. Add the same public environment variables in the hosting dashboard before building.

## Player controls

Playback controls and keyboard shortcuts are supplied by the configured iframe provider.

## Player migration record

The current iframe architecture and the optional direct-source NOVA player are documented in [`docs/PLAYER_PROVIDER_MIGRATION.md`](docs/PLAYER_PROVIDER_MIGRATION.md).
