"use client";

import { useEffect, useState } from "react";

// Shared start: 7 October 2026, when this countdown feature was requested.
export const RELEASE_FILL_START = Date.parse("2026-10-07T18:38:31+02:00");
const RELEASE_TIME_ZONE = "Europe/Budapest";

export function centralEuropeReleaseTime(releaseDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(releaseDate.trim());
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: RELEASE_TIME_ZONE, timeZoneName: "shortOffset" });
  const offsetAt = (time: number) => {
    const zone = formatter.formatToParts(new Date(time)).find((part) => part.type === "timeZoneName")?.value ?? "GMT";
    const offset = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(zone);
    return offset ? (offset[1] === "+" ? 1 : -1) * (Number(offset[2]) * 60 + Number(offset[3] ?? 0)) * 60_000 : 0;
  };
  const initial = utc - offsetAt(utc);
  return utc - offsetAt(initial);
}

export function releaseProgress(deadline: number, now: number): number {
  if (deadline <= RELEASE_FILL_START) return now >= deadline ? 100 : 0;
  return Math.min(100, Math.max(0, (now - RELEASE_FILL_START) / (deadline - RELEASE_FILL_START) * 100));
}

export function ReleaseCountdown({ releaseDate }: { releaseDate: string }) {
  const [now, setNow] = useState<number | null>(null);
  const deadline = centralEuropeReleaseTime(releaseDate);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [releaseDate]);
  if (deadline === null) return <button className="primary-button is-coming-soon" type="button" disabled>Coming Soon</button>;
  const remaining = now === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));
  const days = remaining === null ? 0 : Math.floor(remaining / 86400);
  const hours = remaining === null ? 0 : Math.floor(remaining % 86400 / 3600);
  const minutes = remaining === null ? 0 : Math.floor(remaining % 3600 / 60);
  const seconds = remaining === null ? 0 : remaining % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  const fill = now === null ? 0 : releaseProgress(deadline, now);
  return (
    <div className="detail-release-countdown">
      <button className="primary-button is-coming-soon release-countdown-button" type="button" disabled>
        <span className="release-countdown-fill" style={{ width: fill + "%", minWidth: fill > 0 ? "2px" : "0" }} aria-hidden="true" />
        <span className="release-countdown-label">Coming Soon</span>
      </button>
      <div className="release-countdown-copy">
        <span className="release-countdown-clock" role="timer" aria-live="off">{remaining === null ? "Preparing countdown…" : remaining === 0 ? "Release day" : days + "d " + pad(hours) + "h " + pad(minutes) + "m " + pad(seconds) + "s"}</span>
      </div>
    </div>
  );
}
