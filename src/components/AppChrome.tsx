"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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

function HeaderContent() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const { setSettingsOpen } = useNovaSettings();
  const [agentOpen, setAgentOpen] = useState(false);
  const [searchHref, setSearchHref] = useState("/search/");
  const urlFilter = pathname === "/" ? searchParams.get("type") : null;
  const [activeKey, setActiveKey] = useState<(typeof navigation)[number]["key"]>(() => {
    if (pathname.startsWith("/wishlist")) return "wishlist";
    return urlFilter === "movies" || urlFilter === "series" || urlFilter === "anime" ? urlFilter : "home";
  });
  const currentUrlKey = pathname.startsWith("/wishlist")
    ? "wishlist"
    : pathname === "/"
      ? urlFilter === "movies" || urlFilter === "series" || urlFilter === "anime" ? urlFilter : "home"
      : null;

  useEffect(() => {
    const type = pathname.startsWith("/series")
      ? "series"
      : pathname.startsWith("/movies")
        ? searchParams.get("type") === "anime" ? "anime" : "movies"
        : null;
    setSearchHref(type ? "/search/?type=" + type : "/search/");
    if (pathname.startsWith("/wishlist")) setActiveKey("wishlist");
    else if (pathname === "/") setActiveKey(urlFilter === "movies" || urlFilter === "series" || urlFilter === "anime" ? urlFilter : "home");
  }, [pathname, searchParams, urlFilter]);

  function isActive(key: (typeof navigation)[number]["key"]) {
    return (currentUrlKey ?? activeKey) === key;
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
                onClick={() => {
                  setActiveKey(key);
                  window.dispatchEvent(new CustomEvent("nova:home-filter", { detail: key }));
                }}
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

export function Header() {
  return (
    <Suspense fallback={null}>
      <HeaderContent />
    </Suspense>
  );
}
