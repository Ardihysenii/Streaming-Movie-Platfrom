# NOVA playback migration and rollback record

## Active architecture — VidSrc iframe restored 2026-08-24

NOVA currently uses the licensed, frontend-only VidSrc iframe path. The watch page passes the selected TMDB movie ID to `src/lib/player-provider.ts`; it does not call the Cloudflare Worker or NOVA stream resolver.

The active data flow is:

```text
TMDB movie ID
        ↓
NOVA watch page
        ↓
VidSrc embed URL
        ↓
provider iframe
```

The provider controls video quality, subtitles, buffering, fullscreen behavior, and in-player presentation. TMDB search, artwork, details, recommendations, and the surrounding NOVA design remain unchanged.

## Files added or changed

- `src/components/NovaPlayer.tsx` — complete custom player interface
- `src/lib/stream-source.ts` — frontend manifest client and validation
- `src/lib/types.ts` — source, subtitle, and manifest types
- `src/app/watch/page.tsx` — active native-player integration
- `src/app/globals.css` — responsive player presentation
- `worker/` — Cloudflare resolver scaffold and source contract
- `.env.example` — `NEXT_PUBLIC_NOVA_STREAM_API_URL`

## Active playback configuration

1. Set `NEXT_PUBLIC_PLAYER_PROVIDER=vidsrc` or rely on the VidSrc default.
2. Optionally set `NEXT_PUBLIC_VIDEO_PROVIDER_URL` to the licensed VidSrc base URL.
3. Run or deploy the frontend normally. No Worker is required for this path.

## Return to the direct-source NOVA player

The custom HTML5/HLS player and resolver remain in the repository. To reactivate them later:

1. Restore the manifest version of `src/app/watch/page.tsx` from source control.
2. Deploy and configure the Worker described in `worker/README.md`.
3. Set `NEXT_PUBLIC_NOVA_STREAM_API_URL`.
4. Run `npm run lint` and `npm run build`.

Do not attempt to overlay or script a cross-origin iframe to remove advertising. Browser security prevents NOVA from safely controlling another site's player DOM, and provider behavior can change without notice.

## Previous provider observations

- YapGrid, VidCore, and VidPhantom exposed advertising during testing.
- Mapple was rejected during user testing and rejected a sandboxed iframe.
- VidSrc controlled its own UI, advertising, source resolution, buffering, and subtitles.
- ShahFlix's no-ad mode used its own backend resolver and custom HLS player; it was not a reusable frontend-only embed.

These observations explain why NOVA moved to the manifest-based player. They are historical test results, not guarantees about current provider behavior.

## Quality behavior

NOVA defaults HLS playback to adaptive quality. If a manifest contains a 4K rendition, users can select it, but forcing 4K on every connection creates buffering. Adaptive mode is the correct default because it raises quality when bandwidth and device decoding capacity allow it and falls back when they do not.
