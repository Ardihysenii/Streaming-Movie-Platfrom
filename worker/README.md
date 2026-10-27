# NOVA stream resolver

This Worker is the small manifest adapter used by NOVA's custom player. It never embeds or scrapes a third-party watch page. It returns authorized HTTPS HLS/MP4 sources and WebVTT subtitles in a stable JSON format.

## Source contract

`GET /v1/movie/{tmdbId}?imdbId={imdbId}` returns the shape in `example-manifest.json`.

The Worker resolves a movie in this order:

1. Cloudflare KV key `movie:{tmdbId}`
2. Cloudflare KV key `movie:imdb:{imdbId}`
3. An optional authorized upstream configured with `SOURCE_API_BASE_URL`

## Deploy

```bash
cd worker
npm install
npx wrangler login
npx wrangler kv namespace create STREAM_CATALOG
```

Add the returned namespace ID to `wrangler.toml`, update `ALLOWED_ORIGINS`, and then run:

```bash
npm run deploy
```

Set `NEXT_PUBLIC_NOVA_STREAM_API_URL` in the Next.js deployment to the resulting `https://nova-stream-resolver.<account>.workers.dev` URL and rebuild the frontend.

For an authorized catalog API instead of KV, add secrets/configuration with:

```bash
npx wrangler secret put SOURCE_API_TOKEN
npx wrangler secret put SOURCE_API_BASE_URL
```

The upstream must return the same manifest shape and its media host must allow cross-origin playback. A Worker cannot create movie rights or turn a metadata catalog into video streams; movie coverage is exactly the coverage of the licensed source catalog connected here.

## Subtitle providers

The Worker exposes GET /v1/subtitles and accepts provider=auto, provider=subdl, provider=opensubtitles, or provider=subsource. Automatic mode tries OpenSubtitles first and falls back to SubDL, then SubSource, when earlier providers have no usable track or return an error. The player defaults to OpenSubtitles; explicitly choosing SubDL remains supported.

Configure these Worker secrets for OpenSubtitles:

- OPEN_SUBTITLES_API_KEY
- OPEN_SUBTITLES_USERNAME
- OPEN_SUBTITLES_PASSWORD
- optional OPEN_SUBTITLES_USER_AGENT

The OpenSubtitles credentials are used only server-side. The Worker logs in and caches a short-lived session token, searches by TMDB/IMDb and TV season/episode, downloads SRT, and converts it to the same WebVTT response consumed by NOVA.

## SubSource (third subtitle provider)

Create a key from https://subsource.net/api-docs and store it only as a Worker secret:

```bash
npx wrangler secret put SUBSOURCE_API_KEY
```

Never put real keys in the repository or frontend. SubSource uses the existing provider and language controls; it does not change the OpenSubtitles default or existing saved choices. The adapter maps language codes to provider language names, searches by IMDb (or validated title/year), downloads ZIP archives and returns WebVTT. TV season packs are matched to the requested episode by filename; an ambiguous pack is rejected rather than guessed. Downloads and extraction are bounded. Search pagination is capped at three pages and at most three candidate ZIP downloads per request.

The `/health` response reports `subtitleProviders.subsource` without exposing secrets. Explicit `provider=subsource` uses only SubSource; `provider=auto` tries OpenSubtitles → SubDL → SubSource.

Run `npm ci`, `npm test` and `npm run typecheck` in `worker/`, then deploy the Worker with `npm run deploy`. The frontend also needs its normal build/deployment to show the new provider button. Adding source code alone does not activate the live Worker. Live searches require a configured key and title/language availability. Preserve subtitle translator credits; API access is not a blanket redistribution licence.
