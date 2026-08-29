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
