"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AgentIcon, SearchIcon, SettingsIcon } from "./Icons";
import { NovaAgentPanel } from "./NovaAgentPanel";
import { useNovaSettings } from "./Providers";

const navigation = [
  { href: "/", label: "Home", key: "home" },
  { href: "/?type=movies", label: "Movies", key: "movies" },
  { href: "/?type=series", label: "TV Shows", key: "series" },
  { href: "/?type=anime", label: "Anime", key: "anime" },
  { href: "/wishlist/", label: "My List", key: "wishlist" },
] as const;

export function Header() {
  const pathname = usePathname() ?? "";
  const { setSettingsOpen } = useNovaSettings();
  const [agentOpen, setAgentOpen] = useState(false);
  const [searchHref, setSearchHref] = useState("/search/");
  const [homeFilter, setHomeFilter] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = pathname.startsWith("/series")
      ? "series"
      : pathname.startsWith("/movies")
        ? params.get("type") === "anime" ? "anime" : "movies"
        : null;
    setSearchHref(type ? "/search/?type=" + type : "/search/");
    setHomeFilter(pathname === "/" ? params.get("type") : null);
  }, [pathname]);

  function isActive(key: (typeof navigation)[number]["key"]) {
    if (key === "home") return pathname === "/" && !homeFilter;
    if (key === "wishlist") return pathname.startsWith("/wishlist");
    return pathname === "/" && homeFilter === key;
  }

  return (
    <>
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="NIGHTOWL home">
          <img className="wordmark-image" src="/nightowl-logo.png" alt="NIGHTOWL" width={160} height={40} />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation.map(({ href, label, key }) => {
            const active = isActive(key);
            return (
              <Link
                className={active ? "is-active" : ""}
                href={href}
                aria-current={active ? "page" : undefined}
                key={key}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="header-actions">
          <Link className="icon-button" href={searchHref} aria-label="Search movies and series">
            <SearchIcon />
          </Link>
          <button
            className={agentOpen ? "icon-button is-active" : "icon-button"}
            onClick={() => setAgentOpen(true)}
            aria-label="Open NIGHTOWL AI"
            aria-haspopup="dialog"
            aria-expanded={agentOpen}
          >
            <AgentIcon />
          </button>
          <button className="icon-button settings-button" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
            <SettingsIcon />
          </button>
        </div>
      </header>
      <NovaAgentPanel open={agentOpen} onClose={() => setAgentOpen(false)} />
    </>
  );
}
