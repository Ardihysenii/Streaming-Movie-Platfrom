"use client";

import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  if (pathname === "/watch" || pathname === "/watch/") return null;

  return (
    <footer className="site-footer">
      <span className="wordmark wordmark-small"><img className="wordmark-image wordmark-image-small" src="/nightowl-logo.png" alt="NIGHTOWL" width={128} height={32} /></span>
      <p>
        This product uses the TMDB API but is not endorsed or certified by TMDB.
        Cinemeta remains available as a catalog fallback.
      </p>
      <p>Streaming availability and playback quality depend on the configured source.</p>
    </footer>
  );
}
