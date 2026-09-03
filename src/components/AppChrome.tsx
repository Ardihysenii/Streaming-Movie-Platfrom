"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
      <Link className="wordmark" href="/" aria-label="NOVA home">
        NOVA
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
  const items = [
    { href: "/", label: "Home", Icon: HomeIcon },
  ];

  return (
    <nav className="bottom-dock" aria-label="Quick navigation">
      {items.map(({ href, label, Icon }) => (
        <Link className={pathname === href ? "is-active" : ""} href={href} aria-label={label} key={label}>
          <Icon />
          <span>{label}</span>
        </Link>
      ))}
      <button
        className={agentOpen ? "is-active" : ""}
        type="button"
        onClick={() => setAgentOpen(true)}
        aria-label="Open NOVA Agent"
        aria-haspopup="dialog"
        aria-expanded={agentOpen}
      >
        <AgentIcon />
        <span>Agent</span>
      </button>
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
        <div className="browse-popover" role="dialog" aria-label="Browse NOVA">
          <div className="browse-popover-heading">
            <p className="eyebrow">Quick access</p>
            <h2>Browse</h2>
            <p>Jump into movies, shows, anime, or people.</p>
          </div>
          <div className="browse-popover-group">
            <p className="browse-popover-label">Content</p>
            <div className="browse-popover-grid">
              <a href="/movies/" onClick={() => setBrowseOpen(false)}><CompassIcon /><span>Movies</span></a>
              <a href="/series/" onClick={() => setBrowseOpen(false)}><GridIcon /><span>TV Shows</span></a>
              <a href="/movies/?type=anime" onClick={() => setBrowseOpen(false)}><StarIcon /><span>Anime</span></a>
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
      <NovaAgentPanel open={agentOpen} onClose={() => setAgentOpen(false)} />
    </nav>
  );
}
