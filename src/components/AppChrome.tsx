"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AgentIcon, BookmarkIcon, CompassIcon, GridIcon, HistoryIcon, HomeIcon, InfoIcon, SearchIcon, SettingsIcon, StarIcon } from "./Icons";
import { NovaAgentPanel } from "./NovaAgentPanel";
import { useNovaSettings } from "./Providers";

export function Header() {
  const pathname = usePathname() ?? "";
  const { setSettingsOpen } = useNovaSettings();
  const [searchHref, setSearchHref] = useState("/search/");

  useEffect(() => {
    const type = pathname.startsWith("/series")
      ? "series"
      : pathname.startsWith("/movies")
        ? new URLSearchParams(window.location.search).get("type") === "anime" ? "anime" : "movies"
        : null;
    setSearchHref(type ? `/search/?type=${type}` : "/search/");
  }, [pathname]);

  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="NIGHTOWL home">
        <img className="wordmark-image" src="/nightowl-logo.png" alt="NIGHTOWL" width={160} height={40} />
      </Link>
      <div className="header-actions">
        <Link className="icon-button" href={searchHref} aria-label="Search movies and series">
          <SearchIcon />
        </Link>
        <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
          <SettingsIcon />
        </button>
      </div>
    </header>
  );
}

export function BottomDock() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { setSettingsOpen } = useNovaSettings();
  const [browseOpen, setBrowseOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [searchHref, setSearchHref] = useState("/search/");

  useEffect(() => {
    const type = pathname.startsWith("/series")
      ? "series"
      : pathname.startsWith("/movies")
        ? new URLSearchParams(window.location.search).get("type") === "anime" ? "anime" : "movies"
        : null;
    setSearchHref(type ? `/search/?type=${type}` : "/search/");
  }, [pathname]);
  function selectHomeFilter(filter: "movies" | "series" | "anime") {
    setBrowseOpen(false);
    const target = filter === "movies" ? "/?type=movies" : filter === "series" ? "/?type=series" : "/?type=anime";
    if (pathname === "/" || pathname === "") {
      window.history.pushState({}, "", target);
      window.dispatchEvent(new CustomEvent("nova:home-filter", { detail: filter }));
    } else {
      router.push(target);
    }
  }

  const items = [
    { href: "/", label: "Home", Icon: HomeIcon },
  ];

  return (
    <>
      <nav className="bottom-dock" aria-label="Quick navigation">
      {items.map(({ href, label, Icon }) => (
        <Link className={pathname === href ? "is-active" : ""} href={href} aria-label={label} key={label}>
          <Icon />
          <span>{label}</span>
        </Link>
      ))}
      <div className="agent-launcher">
        <button
          className={agentOpen ? "is-active" : ""}
          type="button"
          onClick={() => {
            setAgentOpen(true);
          }}
          aria-label="Open NIGHTOWL Agent"
          aria-haspopup="dialog"
          aria-expanded={agentOpen}
        >
          <AgentIcon />
          <span>Agent</span>
        </button>
      </div>
      <button
        className={browseOpen ? "is-active" : ""}
        type="button"
        onClick={() => setBrowseOpen((open) => !open)}
        aria-label="Open browse menu"
        aria-expanded={browseOpen}
      >
        <GridIcon />
        <span>Browse</span>
      </button>
      <Link className={pathname === "/search/" ? "is-active" : ""} href={searchHref} aria-label="Search movies and series">
        <SearchIcon />
        <span>Search</span>
      </Link>
      <button onClick={() => setSettingsOpen(true)} aria-label="Settings">
        <SettingsIcon />
        <span>Settings</span>
      </button>
      {browseOpen ? (
        <div className="browse-popover" role="dialog" aria-label="Browse NIGHTOWL">
          <div className="browse-popover-heading">
            <p className="eyebrow">Quick access</p>
            <h2>Browse</h2>
            <p>Jump into movies, shows, anime, or people.</p>
          </div>
          <div className="browse-popover-group">
            <p className="browse-popover-label">Content</p>
            <div className="browse-popover-grid">
              <button type="button" onClick={() => selectHomeFilter("movies")}><CompassIcon /><span>Movies</span></button>
              <button type="button" onClick={() => selectHomeFilter("series")}><GridIcon /><span>TV Shows</span></button>
              <button type="button" onClick={() => selectHomeFilter("anime")}><StarIcon /><span>Anime</span></button>
              <a href="/actors/" onClick={() => setBrowseOpen(false)}><InfoIcon /><span>Actors</span></a>
            </div>
          </div>
          <div className="browse-popover-group">
            <p className="browse-popover-label">Other</p>
            <div className="browse-popover-grid browse-popover-grid-single">
              <a href="/history/" onClick={() => setBrowseOpen(false)}><HistoryIcon /><span>History</span></a>
              <a href="/wishlist/" onClick={() => setBrowseOpen(false)}><BookmarkIcon /><span>Wishlist</span></a>
            </div>
          </div>
        </div>
      ) : null}
      </nav>
      <NovaAgentPanel open={agentOpen} onClose={() => setAgentOpen(false)} />
    </>
  );
}
