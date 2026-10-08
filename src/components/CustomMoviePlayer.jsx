"use client";
















import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FullscreenIcon,
  MutedIcon,
  PauseIcon,
  PlayIcon,
  RewindIcon,
  ForwardIcon,
  VolumeIcon,
  CastIcon,
  SettingsIcon,
} from "@/components/Icons";
import { useNovaSettings } from "@/components/Providers";

const CINESRC_SERVER_OPTIONS = [
  { id: "auto", label: "Auto" },
  { id: "nebula", label: "Nebula" },
  { id: "surge", label: "Surge" },
  { id: "spark", label: "Spark" },
  { id: "storm", label: "Storm" },
  { id: "aurora", label: "Aurora" },
  { id: "rush", label: "Rush" },
  { id: "lisbon", label: "Lisbon" },
  { id: "blizzard", label: "Blizzard" },
  { id: "mist", label: "Mist" },
  { id: "thunder", label: "Thunder" },
  { id: "flux", label: "Flux" },
  { id: "wave", label: "Wave" },
  { id: "sturm", label: "Sturm" },
  { id: "brisa", label: "Brisa (ES/LAT)" },
];

const CINESRC_QUALITY_OPTIONS = ["auto", "1080", "720", "480"];
const PLAYER_SOURCE_OPTIONS = [
  { id: "cinesrc", label: "CineSrc" },
  { id: "vidstuck", label: "VidStuck" },
];
const SUBTITLE_PROVIDER_OPTIONS = [["auto", "Auto (SubDL first)"], ["subdl", "SubDL"], ["opensubtitles", "OpenSubtitles"]];

function readSubtitleProviderPreference() {
  if (typeof window === "undefined") return "auto";
  try {
    const value = window.localStorage.getItem("nova-subtitle-provider-v1");
    return SUBTITLE_PROVIDER_OPTIONS.some(([id]) => id === value) ? value : "auto";
  } catch { return "auto"; }
}
function subtitleProviderLabel(value) {
  return SUBTITLE_PROVIDER_OPTIONS.find(([id]) => id === value)?.[1] || "Auto (SubDL first)";
}
const CINESRC_PREFERENCES_STORAGE_KEY = "nova-cinesrc-preferences-v1";

function getCineSrcPreferenceKey(id, mediaType, seasonNumber, episodeNumber) {
  const titleId = String(id || "unknown");
  const season = mediaType === "tv" ? String(seasonNumber ?? 1) : "";
  const episode = mediaType === "tv" ? String(episodeNumber ?? 1) : "";
  return [mediaType, titleId, season, episode].join(":");
}

function readCineSrcPreferences(key) {
  if (typeof window === "undefined") return {};
  try {
    const stored = JSON.parse(window.localStorage.getItem(CINESRC_PREFERENCES_STORAGE_KEY) || "{}");
    const value = stored?.[key];
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function writeCineSrcPreferences(key, updates) {
  if (typeof window === "undefined") return;
  try {
    const stored = JSON.parse(window.localStorage.getItem(CINESRC_PREFERENCES_STORAGE_KEY) || "{}");
    stored[key] = { ...(stored[key] || {}), ...updates };
    window.localStorage.setItem(CINESRC_PREFERENCES_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Preference storage is optional and must never interrupt playback.
  }
}

function normalizeCineSrcServer(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return CINESRC_SERVER_OPTIONS.some((option) => option.id === normalized) ? normalized : "";
}

function cineSrcServerLabel(value) {
  return CINESRC_SERVER_OPTIONS.find((option) => option.id === value)?.label || value || "Auto";
}

function normalizeCineSrcQuality(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return CINESRC_QUALITY_OPTIONS.includes(normalized) ? normalized : "auto";
}

function cineSrcQualityLabel(value) {
  if (value === "auto") return "Auto";
  if (value === "1080") return "Prefer 1080p";
  return `${value}p`;
}

function getDefaultCineSrcServer(id, mediaType, seasonNumber, episodeNumber) {
  const cleanId = String(id || "");
  const season = Number(seasonNumber ?? 1);
  const episode = Number(episodeNumber ?? 0);
  if (mediaType === "movie" && cleanId === "1083381") return "surge";
  if (mediaType === "tv" && cleanId === "247718" && season === 1 && episode >= 2 && episode <= 10) return "surge";
  return "auto";
}

function formatRuntimeLabel(minutes) {
  if (!Number.isFinite(Number(minutes)) || Number(minutes) <= 0) return "";
  const total = Math.round(Number(minutes));
  const hours = Math.floor(total / 60);
  const remaining = total % 60;
  return hours ? hours + "h " + remaining + "m" : remaining + "m";
}
















function parseSubtitleCues(value) {
  return value
    .replace(/^\uFEFF?WEBVTT[^\n]*\n/i, "")
    .split(/\n\s*\n/)
    .flatMap((block) => {
      const match = block.match(/((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})\s+-->\s+((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})/);
      if (!match) return [];
      const toSeconds = (timestamp) => {
        const parts = timestamp.replace(",", ".").split(":").map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      };
      const text = block
        .slice(match.index + match[0].length)
        .replace(/^\s*\n/, "")
        .replace(/<[^>]+>/g, "")
        .trim();
      return text ? [{ start: toSeconds(match[1]), end: toSeconds(match[2]), text }] : [];
    });
}
















function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

















function NightowlReferenceIcon({ name }) {
  switch (name) {
    case "Pause": return (<svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M96 448h106.7V64H96v384zM309.3 64v384H416V64H309.3z"></path></svg>);
    case "Backward 15s": return (<svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C17.5228 2 22 6.47715 22 12 22 17.5228 17.5228 22 12 22 6.47715 22 2 17.5228 2 12H4C4 16.4183 7.58172 20 12 20 16.4183 20 20 16.4183 20 12 20 7.58172 16.4183 4 12 4 9.53614 4 7.33243 5.11383 5.86492 6.86543L8 9H2V3L4.44656 5.44648C6.28002 3.33509 8.9841 2 12 2ZM8.5 8.5H10V15.5H8.5V8.5ZM16.75 8.5H12V12.75H14.875C15.2202 12.75 15.5 13.0298 15.5 13.375 15.5 13.7202 15.2202 14 14.875 14H12V15.5H14.875C16.0486 15.5 17 14.5486 17 13.375 17 12.2014 16.0486 11.25 14.875 11.25H13.5V10H16.75V8.5Z"></path></svg>);
    case "Forward 15s": return (<svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.47715 2 2 6.47715 2 12 2 17.5228 6.47715 22 12 22 17.5228 22 22 17.5228 22 12H20C20 16.4183 16.4183 20 12 20 7.58172 20 4 16.4183 4 12 4 7.58172 7.58172 4 12 4 14.4639 4 16.6676 5.11383 18.1351 6.86543L16.5001 8.5H12V12.75H14.875C15.2202 12.75 15.5 13.0298 15.5 13.375 15.5 13.7202 15.2202 14 14.875 14H12V15.5H14.875C16.0486 15.5 17 14.5486 17 13.375 17 12.2014 16.0486 11.25 14.875 11.25H13.5V10H16.75V9H22V3L19.5534 5.44648C17.72 3.33509 15.0159 2 12 2ZM8.5 8.5H10V15.5H8.5V8.5Z"></path></svg>);
    case "Volume": return (<svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M2 16.0001H5.88889L11.1834 20.3319C11.2727 20.405 11.3846 20.4449 11.5 20.4449C11.7761 20.4449 12 20.2211 12 19.9449V4.05519C12 3.93977 11.9601 3.8279 11.887 3.73857C11.7121 3.52485 11.3971 3.49335 11.1834 3.66821L5.88889 8.00007H2C1.44772 8.00007 1 8.44778 1 9.00007V15.0001C1 15.5524 1.44772 16.0001 2 16.0001ZM23 12C23 15.292 21.5539 18.2463 19.2622 20.2622L17.8445 18.8444C19.7758 17.1937 21 14.7398 21 12C21 9.26016 19.7758 6.80629 17.8445 5.15557L19.2622 3.73779C21.5539 5.75368 23 8.70795 23 12ZM18 12C18 10.0883 17.106 8.38548 15.7133 7.28673L14.2842 8.71584C15.3213 9.43855 16 10.64 16 12C16 13.36 15.3213 14.5614 14.2842 15.2841L15.7133 16.7132C17.106 15.6145 18 13.9116 18 12Z"></path></svg>);
    case "Audio": return (<svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 640 512" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M0 128C0 92.7 28.7 64 64 64l192 0 48 0 16 0 256 0c35.3 0 64 28.7 64 64l0 256c0 35.3-28.7 64-64 64l-256 0-16 0-48 0L64 448c-35.3 0-64-28.7-64-64L0 128zm320 0l0 256 256 0 0-256-256 0zM178.3 175.9c-3.2-7.2-10.4-11.9-18.3-11.9s-15.1 4.7-18.3 11.9l-64 144c-4.5 10.1 .1 21.9 10.2 26.4s21.9-.1 26.4-10.2l8.9-20.1 73.6 0 8.9 20.1c4.5 10.1 16.3 14.6 26.4 10.2s14.6-16.3 10.2-26.4l-64-144zM160 233.2L179 276l-38 0 19-42.8zM448 164c11 0 20 9 20 20l0 4 44 0 16 0c11 0 20 9 20 20s-9 20-20 20l-2 0-1.6 4.5c-8.9 24.4-22.4 46.6-39.6 65.4c.9 .6 1.8 1.1 2.7 1.6l18.9 11.3c9.5 5.7 12.5 18 6.9 27.4s-18 12.5-27.4 6.9l-18.9-11.3c-4.5-2.7-8.8-5.5-13.1-8.5c-10.6 7.5-21.9 14-34 19.4l-3.6 1.6c-10.1 4.5-21.9-.1-26.4-10.2s.1-21.9 10.2-26.4l3.6-1.6c6.4-2.9 12.6-6.1 18.5-9.8l-12.2-12.2c-7.8-7.8-7.8-20.5 0-28.3s20.5-7.8 28.3 0l14.6 14.6 .5 .5c12.4-13.1 22.5-28.3 29.8-45L448 228l-72 0c-11 0-20-9-20-20s9-20 20-20l52 0 0-4c0-11 9-20 20-20z"></path></svg>);
    case "Subtitle": return (<svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0z"></path><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2M4 12h4v2H4zm10 6H4v-2h10zm6 0h-4v-2h4zm0-4H10v-2h10z"></path></svg>);
    case "Settings": return (<svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M5.33409 4.54491C6.3494 3.63637 7.55145 2.9322 8.87555 2.49707C9.60856 3.4128 10.7358 3.99928 12 3.99928C13.2642 3.99928 14.3914 3.4128 15.1245 2.49707C16.4486 2.9322 17.6506 3.63637 18.6659 4.54491C18.2405 5.637 18.2966 6.90531 18.9282 7.99928C19.5602 9.09388 20.6314 9.77679 21.7906 9.95392C21.9279 10.6142 22 11.2983 22 11.9993C22 12.7002 21.9279 13.3844 21.7906 14.0446C20.6314 14.2218 19.5602 14.9047 18.9282 15.9993C18.2966 17.0932 18.2405 18.3616 18.6659 19.4536C17.6506 20.3622 16.4486 21.0664 15.1245 21.5015C14.3914 20.5858 13.2642 19.9993 12 19.9993C10.7358 19.9993 9.60856 20.5858 8.87555 21.5015C7.55145 21.0664 6.3494 20.3622 5.33409 19.4536C5.75952 18.3616 5.7034 17.0932 5.0718 15.9993C4.43983 14.9047 3.36862 14.2218 2.20935 14.0446C2.07212 13.3844 2 12.7002 2 11.9993C2 11.2983 2.07212 10.6142 2.20935 9.95392C3.36862 9.77679 4.43983 9.09388 5.0718 7.99928C5.7034 6.90531 5.75952 5.637 5.33409 4.54491ZM13.5 14.5974C14.9349 13.7689 15.4265 11.9342 14.5981 10.4993C13.7696 9.0644 11.9349 8.57277 10.5 9.4012C9.06512 10.2296 8.5735 12.0644 9.40192 13.4993C10.2304 14.9342 12.0651 15.4258 13.5 14.5974Z"></path></svg>);
    case "Fullscreen": return (<svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M17.5858 5H14V3H21V10H19V6.41421L14.7071 10.7071L13.2929 9.29289L17.5858 5ZM3 14H5V17.5858L9.29289 13.2929L10.7071 14.7071L6.41421 19H10V21H3V14Z"></path></svg>);
    case "Servers": return (<svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M123.4 183c.4-.1.8-.1 1.2-.2-.5.1-.8.2-1.2.2z"></path><path d="M393.2 219.2C380.5 154.6 323.9 106 256 106c-39.7 0-76 14-100.9 45.4 34.3 2.6 66.1 15.2 90.7 39.8 18.2 18.2 31 40.5 37.4 64.8h-33.5c-15.3-43.7-56-75-105.7-75-6 0-14.3.7-20.6 2C70 194 32 238.4 32 293.5 32 355.6 82.2 406 144 406h242.7c51.5 0 93.3-42 93.3-93.8 0-49.4-38.3-89.6-86.8-93z"></path></svg>);
    default: return (<svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M96 48v416l352-208z" /></svg>);
  }
}

export default function CustomMoviePlayer({
  tmdbId,
  imdbId,
  mediaType = "movie",
  seasonNumber,
  episodeNumber,
  resumeAt = 0,
  onProgress,
  title = "Now playing",
  overview = "",
  releaseYear = "",
  runtimeMinutes = 0,
  rating = 0,
  backdropUrl = "",
  posterUrl = "",
  logoUrl = "",
  logoWidth = 800,
  logoHeight = 310,
}) {
  const { settings } = useNovaSettings();
  const [isReady, setIsReady] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [connectionSlow, setConnectionSlow] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileFullscreen, setMobileFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [quality, setQuality] = useState("auto");
  const [reportedQuality, setReportedQuality] = useState("");
  const [selectedSource, setSelectedSource] = useState("cinesrc");
  const [sourceResumeAt, setSourceResumeAt] = useState(resumeAt);
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const initialServer = getDefaultCineSrcServer(tmdbId, mediaType, seasonNumber, episodeNumber);
  const [selectedServer, setSelectedServer] = useState(initialServer);
  const [activeServer, setActiveServer] = useState(initialServer);
  const [cineSrcPreferencesReady, setCineSrcPreferencesReady] = useState(false);
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState("root");
  const [soundBoost, setSoundBoost] = useState(100);
  const [videoFit, setVideoFit] = useState("fit");
  const [brightness, setBrightness] = useState(100);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [subtitleCues, setSubtitleCues] = useState([]);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [subtitleStatus, setSubtitleStatus] = useState("idle");
  const [subtitleError, setSubtitleError] = useState("");
  const [subtitleLanguage, setSubtitleLanguage] = useState("en");
  const [subtitleProvider, setSubtitleProvider] = useState(readSubtitleProviderPreference);
  const [subtitleFontSize, setSubtitleFontSize] = useState(1.3);
  const [subtitleLarge, setSubtitleLarge] = useState(true);
  const [subtitleFontFamily, setSubtitleFontFamily] = useState("Verdana, sans-serif");
  const [subtitlePosition, setSubtitlePosition] = useState(8);

  const [subtitleOffset, setSubtitleOffset] = useState(0);
  const subtitleLanguageOptions = [["en", "English"], ["de", "Deutsch"], ["es", "Español"], ["fr", "Français"], ["it", "Italiano"], ["pt", "Português"], ["tr", "Türkçe"], ["sq", "Albanian"], ["ja", "日本語"], ["ru", "Русский"], ["ko", "한국어"], ["zh", "中文"], ["nl", "Nederlands"], ["pl", "Polski"], ["ar", "العربية"], ["hi", "हिन्दी"], ["ro", "Română"], ["cs", "Čeština"], ["uk", "Українська"], ["sv", "Svenska"], ["da", "Dansk"]].sort(([, a], [, b]) => a.localeCompare(b, "en", { sensitivity: "base" }));
  const subtitleFontFamilyOptions = [["var(--font-sans)", "System UI"], ["Arial, sans-serif", "Arial"], ["Trebuchet MS, sans-serif", "Trebuchet"], ["Georgia, serif", "Georgia"], ["Verdana, sans-serif", "Verdana"], ["Courier New, monospace", "Courier"]];
  const controlsTimerRef = useRef(null);
  const centerFeedbackTimerRef = useRef(null);
  const gestureClickTimerRef = useRef(null);
  const seekFeedbackTimerRef = useRef(null);
  const seekGestureRef = useRef({ direction: 0, count: 0, baseTime: 0, lastTime: null, lastGestureAt: 0, timer: null });
  const touchTapRef = useRef({ time: 0, x: 0 });
  const touchSuppressRef = useRef(false);
  const ignoreDoubleClickRef = useRef(false);
  const iframeRef = useRef(null);
  const presentationConnectionRef = useRef(null);
  const [castState, setCastState] = useState("idle");
  const playerRef = useRef(null);
  const resumeAppliedRef = useRef(false);
  const pendingServerSeekRef = useRef(null);
  const pendingServerPlayRef = useRef(false);
  const currentTimeRef = useRef(0);
  const mobileFullscreenRef = useRef(false);
















  const setMobileFullscreenState = (next) => {
    mobileFullscreenRef.current = next;
    setMobileFullscreen(next);
  };
  const [centerFeedback, setCenterFeedback] = useState(null);
  const [seekFeedback, setSeekFeedback] = useState(null);
  const searchParams = useSearchParams();
















  const queryId = searchParams ? searchParams.get("id") : null;
  const activeId = tmdbId || queryId || "";
  const activeSubtitle = useMemo(
    () => subtitlesEnabled
      ? subtitleCues.find((cue) => currentTime + subtitleOffset >= cue.start && currentTime + subtitleOffset <= cue.end)
      : null,
    [currentTime, subtitleCues, subtitlesEnabled, subtitleOffset],
  );
  const cineSrcPreferenceKey = useMemo(
    () => getCineSrcPreferenceKey(activeId, mediaType, seasonNumber, episodeNumber),
    [activeId, episodeNumber, mediaType, seasonNumber],
  );


































  // CineSrc remains the default source. VidStuck is available only through the
  // manual source picker and never activates automatically.
  const configuredProviderBase = (process.env.NEXT_PUBLIC_VIDEO_PROVIDER_URL || "https://cinesrc.st").replace(/\/+$/, "");
  const isVidStuck = selectedSource === "vidstuck";
  const providerBase = isVidStuck ? "https://vidstuck.xyz" : configuredProviderBase;
  const isCineSrc = !isVidStuck && /cinesrc\.st/i.test(providerBase);
  const providerOrigin = useMemo(() => {
    try {
      return new URL(providerBase).origin;
    } catch {
      return "";
    }
  }, [providerBase]);
  useEffect(() => {
    if (!isCineSrc) {
      setCineSrcPreferencesReady(true);
      return undefined;
    }
    const stored = readCineSrcPreferences(cineSrcPreferenceKey);
    const storedServer = normalizeCineSrcServer(stored.server);
    const storedQuality = normalizeCineSrcQuality(stored.quality);
    setSelectedServer(storedServer || initialServer);
    setActiveServer(storedServer || initialServer);
    setQuality(storedQuality);
    setCineSrcPreferencesReady(true);
    return undefined;
  }, [cineSrcPreferenceKey, initialServer, isCineSrc]);

















  const embedUrl = useMemo(() => {
    if (!activeId || !cineSrcPreferencesReady) return "";
    const cleanId = String(activeId);
    const path = mediaType === "tv"
      ? isCineSrc
        ? `/embed/tv/${encodeURIComponent(cleanId)}`
        : `/embed/tv/${encodeURIComponent(cleanId)}/${seasonNumber ?? 1}/${episodeNumber ?? 1}`
      : `/embed/movie/${encodeURIComponent(cleanId)}`;
    const params = new URLSearchParams();
    if (mediaType === "tv" && isCineSrc) {
      params.set("s", String(seasonNumber ?? 1));
      params.set("e", String(episodeNumber ?? 1));
      params.set("prioritize", "true");
      const season = Number(seasonNumber ?? 1);
      const episode = Number(episodeNumber ?? 0);
      const isMobLandSurgeEpisode = cleanId === "247718" && season === 1 && episode >= 2 && episode <= 10;
      if (isMobLandSurgeEpisode) {
        params.set("lastserver", "surge");
      }
    }
    if (isVidStuck) {
      params.set("branding", "NIGHTOWL");
      params.set("color", "ff003c");
      params.set("subtitle", subtitleLanguage === "en" ? "english" : subtitleLanguage);
      if (sourceResumeAt > 0) params.set("progress", String(Math.max(0, Math.floor(sourceResumeAt))));
    }
    if (isCineSrc) {
      // CineSrc only honors lastserver when prioritize is enabled. Keep the
      // remembered working server first, while still allowing CineSrc to
      // fall back automatically if that server is unavailable.
      params.set("prioritize", "true");
      const isBackroomsSurgeMovie = mediaType === "movie" && cleanId === "1083381";
      if (isBackroomsSurgeMovie) {
        params.set("lastserver", "surge");
      }
      if (selectedServer !== "auto") params.set("lastserver", selectedServer);
      params.set("controls", "false");
      params.set("autoplay", settings.autoplayPlayer ? "true" : "false");
      if (quality !== "auto") params.set("quality", quality);
      params.set("color", "#ff003c");
    }
    const query = params.toString();
    return `${providerBase}${path}${query ? `?${query}` : ""}`;
  }, [activeId, cineSrcPreferencesReady, episodeNumber, isCineSrc, isVidStuck, mediaType, providerBase, quality, seasonNumber, selectedServer, selectedSource, settings.autoplayPlayer, sourceResumeAt, subtitleLanguage]);

















  useEffect(() => {
    // Keep NOVA's visible subtitle layer enabled for the embedded provider.
    // The provider iframe does not expose its native caption visibility to the
    // parent page, so relying on it alone can leave users with no subtitles.
    if (!activeId) return undefined;
    const subtitleService = process.env.NEXT_PUBLIC_NOVA_STREAM_API_URL?.trim();
    if (!subtitleService) {
      setSubtitleCues([]);
      setSubtitlesEnabled(true);
      setSubtitleStatus("empty");
      return undefined;
    }
    const controller = new AbortController();
    const query = new URLSearchParams({
      tmdbId: String(activeId),
      type: mediaType,
      language: subtitleLanguage || "en",
    });
    query.set("provider", subtitleProvider);
    if (imdbId) query.set("imdbId", String(imdbId));
    if (title) query.set("title", String(title));
    if (releaseYear) query.set("year", String(releaseYear));
    if (mediaType === "tv") {
      query.set("season", String(seasonNumber ?? 1));
      query.set("episode", String(episodeNumber ?? 1));
    }
    setSubtitleStatus("loading");
    setSubtitleError("");
    setSubtitleCues([]);
    fetch(`${subtitleService.replace(/\/+$/, "")}/v1/subtitles?${query.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.text();
        if (!response.ok) {
          let message = "Subtitle service unavailable";
          try {
            const payload = JSON.parse(body);
            message = payload.error || message;
          } catch {
            // Keep a stable user-facing message for non-JSON upstream errors.
          }
          throw new Error(message);
        }
        return parseSubtitleCues(body);
      })
      .then((cues) => {
        if (controller.signal.aborted) return;
        setSubtitleCues(cues);
        setSubtitlesEnabled(true);
        setSubtitleStatus(cues.length ? "ready" : "empty");
        setSubtitleError("");
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setSubtitleCues([]);
          setSubtitlesEnabled(true);
          setSubtitleStatus("error");
          setSubtitleError(error instanceof Error ? error.message : "Subtitle service unavailable");
        }
      });
    return () => controller.abort();
  }, [activeId, episodeNumber, imdbId, mediaType, seasonNumber, subtitleLanguage, subtitleProvider]);
















  useEffect(() => {
    try { window.localStorage.setItem("nova-subtitle-provider-v1", subtitleProvider); } catch {}
  }, [subtitleProvider]);

  useEffect(() => {
    resumeAppliedRef.current = false;
    setIsReady(false);
    setConnectionSlow(false);
    setDuration(0);
    setReportedQuality("");
    const timer = window.setTimeout(() => setConnectionSlow(true), 5000);
    return () => window.clearTimeout(timer);
  }, [embedUrl]);

  useEffect(() => {
    setIntroFinished(false);
    if (!isCineSrc) return undefined;
    const timer = window.setTimeout(() => setIntroFinished(true), 1800);
    return () => window.clearTimeout(timer);
  }, [embedUrl, isCineSrc]);
















  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current !== null) window.clearTimeout(controlsTimerRef.current);
    if (isPlaying && !settingsOpen && !serverMenuOpen) {
      controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 4000);
    }
  }, [isPlaying, settingsOpen, serverMenuOpen]);
















  useEffect(() => {
    showControls();
    return () => {
      if (controlsTimerRef.current !== null) window.clearTimeout(controlsTimerRef.current);
    };
  }, [isPlaying, showControls]);
















  useEffect(() => () => {
    if (centerFeedbackTimerRef.current !== null) window.clearTimeout(centerFeedbackTimerRef.current);
    if (gestureClickTimerRef.current !== null) window.clearTimeout(gestureClickTimerRef.current);
    if (seekFeedbackTimerRef.current !== null) window.clearTimeout(seekFeedbackTimerRef.current);
    if (seekGestureRef.current.timer !== null) window.clearTimeout(seekGestureRef.current.timer);
  }, []);
















  const sendCommand = useCallback((command, args = []) => {
    if (!isCineSrc || !providerOrigin || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "cinesrc:command", command, args },
      providerOrigin,
    );
  }, [isCineSrc, providerOrigin]);


  const handleCast = useCallback(async () => {
    if (!isCineSrc || typeof window === "undefined") return;
    if (typeof window.PresentationRequest !== "function") {
      setCastState("unsupported");
      return;
    }
    const remoteUrl = new URL(embedUrl);
    remoteUrl.searchParams.set("controls", "true");
    remoteUrl.searchParams.set("autoplay", "true");
    remoteUrl.searchParams.set("start", String(Math.max(0, Math.floor(currentTimeRef.current || 0))));
    setCastState("connecting");
    try {
      const connection = await new window.PresentationRequest([remoteUrl.toString()]).start();
      presentationConnectionRef.current = connection;
      setCastState("connected");
      sendCommand("pause");
      const reset = () => {
        if (presentationConnectionRef.current === connection) presentationConnectionRef.current = null;
        setCastState("idle");
      };
      connection.addEventListener("close", reset, { once: true });
      connection.addEventListener("terminate", reset, { once: true });
    } catch {
      setCastState("idle");
    }
  }, [embedUrl, isCineSrc, sendCommand]);

















  useEffect(() => {
    if (!isCineSrc && !isVidStuck) return undefined;
















    const handleMessage = (event) => {
      if (event.origin !== providerOrigin || event.source !== iframeRef.current?.contentWindow) return;
      const message = event.data;
      if (!message || typeof message.type !== "string") return;
      const payload = message.data ?? message;

      if (isVidStuck) {
        if (message.type === "VIDEO_PROGRESS") {
          const progress = message.payload ?? {};
          if (progress.tmdbId && String(progress.tmdbId) !== String(activeId)) return;
          const nextCurrentTime = Number(progress.currentTime);
          const nextDuration = Number(progress.duration);
          if (Number.isFinite(nextCurrentTime)) {
            currentTimeRef.current = nextCurrentTime;
            setCurrentTime(nextCurrentTime);
            onProgress?.(nextCurrentTime, nextDuration);
          }
          if (Number.isFinite(nextDuration) && nextDuration > 0) setDuration(nextDuration);
          setIsReady(true);
        } else if (message.type === "VIDEO_ENDED") {
          setIsPlaying(false);
        }
        return;
      }
















      switch (message.type) {
        case "cinesrc:ready":
          setIsReady(true);
          if (settings.autoplayPlayer) sendCommand("play");
          break;
        case "cinesrc:play":
          setIsPlaying(true);
          if (pendingServerSeekRef.current !== null) {
            const pendingTarget = Math.max(0, Number(pendingServerSeekRef.current) || 0);
            pendingServerSeekRef.current = null;
            resumeAppliedRef.current = true;
            sendCommand("seek", [pendingTarget]);
            if (!pendingServerPlayRef.current) sendCommand("pause");
            pendingServerPlayRef.current = false;
          } else if (resumeAt > 0 && !resumeAppliedRef.current) {
            resumeAppliedRef.current = true;
            sendCommand("seek", [Math.max(0, resumeAt)]);
          }
          break;
        case "cinesrc:pause":
        case "cinesrc:ended":
          setIsPlaying(false);
          break;
        case "cinesrc:loadedmetadata":
          if (Number.isFinite(Number(payload?.duration))) setDuration(Number(payload.duration));
          break;
        case "cinesrc:timeupdate":
          if (Number.isFinite(Number(payload?.currentTime))) {
            const nextCurrentTime = Number(payload.currentTime);
            currentTimeRef.current = nextCurrentTime;
            setCurrentTime(nextCurrentTime);
            onProgress?.(nextCurrentTime, Number(payload?.duration));
          }
          if (Number.isFinite(Number(payload?.duration))) setDuration(Number(payload.duration));
          break;
        case "cinesrc:volumechange":
          if (Number.isFinite(Number(payload?.volume))) setVolume(Number(payload.volume));
          if (typeof payload?.muted === "boolean") setMuted(payload.muted);
          break;
        case "cinesrc:sourceused": {
          const sourceId = normalizeCineSrcServer(payload?.sourceId ?? message.sourceId);
          if (sourceId) {
            setActiveServer(sourceId);
            // Reuse the source that actually returned a playable stream on the
            // next launch instead of making Auto retry the same slow servers.
            writeCineSrcPreferences(cineSrcPreferenceKey, { server: sourceId });
          }
          break;
        }
        case "cinesrc:qualitychange":
        case "cinesrc:resolutionchange":
        case "cinesrc:variantchange": {
          const reported = payload?.quality ?? payload?.resolution ?? payload?.height ?? message.quality ?? message.resolution ?? message.height;
          if (reported !== undefined && reported !== null && String(reported).trim()) {
            const value = String(reported).trim();
            setReportedQuality(/^[0-9]+$/.test(value) ? `${value}p` : value);
          }
          break;
        }
        case "cinesrc:response": {
          // CineSrc returns getter responses as { command, result }.
          const command = message.command ?? payload?.command;
          const result = message.result ?? payload?.result;
          if (command === "getDuration" && Number.isFinite(Number(result))) setDuration(Number(result));
          if (command === "getCurrentTime" && Number.isFinite(Number(result))) {
            currentTimeRef.current = Number(result);
            setCurrentTime(Number(result));
          }
          if (command === "getPaused" && typeof result === "boolean") setIsPlaying(!result);
          if (command === "getVolume" && Number.isFinite(Number(result))) setVolume(Number(result));
          if (command === "getMuted" && typeof result === "boolean") setMuted(result);
          break;
        }
        default:
          break;
      }
    };
















    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [activeId, isCineSrc, isVidStuck, onProgress, providerOrigin, resumeAt, sendCommand, settings.autoplayPlayer]);
















  useEffect(() => {
    if (!isCineSrc || !isReady) return;
    sendCommand("getDuration");
    sendCommand("getCurrentTime");
    sendCommand("getPaused");
    sendCommand("getVolume");
    sendCommand("getMuted");
  }, [isCineSrc, isReady, sendCommand]);
















  useEffect(() => {
    // CineSrc can announce readiness before the selected movie has loaded its
    // metadata. Waiting for a real duration makes the seek reliable for films
    // as well as episodes instead of letting the source start at 0:00.
    if (!isCineSrc || !isReady || duration <= 0 || resumeAppliedRef.current || resumeAt <= 0) return;
    resumeAppliedRef.current = true;
    sendCommand("seek", [Math.max(0, resumeAt)]);
  }, [duration, isCineSrc, isReady, resumeAt, sendCommand]);

  useEffect(() => {
    if (!isCineSrc || !isReady || duration <= 0 || pendingServerSeekRef.current === null) return;
    sendCommand("play");
  }, [duration, isCineSrc, isReady, sendCommand]);















  useEffect(() => {
    const player = playerRef.current;
    const iframe = iframeRef.current;
    const handleFullscreenChange = () => {
      const activeFullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
      const active = activeFullscreenElement === player || activeFullscreenElement === iframe;
      
    };
    const handleWebkitFullscreenChange = () => {
      const active = Boolean(
        player?.webkitDisplayingFullscreen
        || iframe?.webkitDisplayingFullscreen
        || document.fullscreenElement === player
        || document.fullscreenElement === iframe
        || document.webkitFullscreenElement === player
        || document.webkitFullscreenElement === iframe,
      );
      
    };
















    const keepMobileFullscreen = () => {
      if (!mobileFullscreenRef.current) return;
      setMobileFullscreen(true);
      setIsFullscreen(true);
    };
















    window.addEventListener("orientationchange", keepMobileFullscreen);
    window.addEventListener("resize", keepMobileFullscreen);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    player?.addEventListener("webkitbeginfullscreen", handleWebkitFullscreenChange);
    player?.addEventListener("webkitendfullscreen", handleWebkitFullscreenChange);
    iframe?.addEventListener("webkitbeginfullscreen", handleWebkitFullscreenChange);
    iframe?.addEventListener("webkitendfullscreen", handleWebkitFullscreenChange);
















    return () => {
      window.removeEventListener("orientationchange", keepMobileFullscreen);
      window.removeEventListener("resize", keepMobileFullscreen);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      player?.removeEventListener("webkitbeginfullscreen", handleWebkitFullscreenChange);
      player?.removeEventListener("webkitendfullscreen", handleWebkitFullscreenChange);
      iframe?.removeEventListener("webkitbeginfullscreen", handleWebkitFullscreenChange);
      iframe?.removeEventListener("webkitendfullscreen", handleWebkitFullscreenChange);
    };
  }, []);
















  const showCenterFeedback = (nextPlaying) => {
    setCenterFeedback(nextPlaying === true ? "play" : nextPlaying === false ? "pause" : nextPlaying);
    if (centerFeedbackTimerRef.current !== null) window.clearTimeout(centerFeedbackTimerRef.current);
    centerFeedbackTimerRef.current = window.setTimeout(() => {
      setCenterFeedback(null);
      centerFeedbackTimerRef.current = null;
    }, 500);
  };
















  const togglePlay = () => {
    const nextPlaying = !isPlaying;
    showCenterFeedback(nextPlaying);
    sendCommand(nextPlaying ? "play" : "pause");
  };
  const showSeekFeedback = (amount) => {
    const seconds = Math.abs(amount);
    setSeekFeedback((amount > 0 ? "+" : "−") + seconds + "s");
    if (seekFeedbackTimerRef.current !== null) window.clearTimeout(seekFeedbackTimerRef.current);
    seekFeedbackTimerRef.current = window.setTimeout(() => {
      setSeekFeedback(null);
      seekFeedbackTimerRef.current = null;
    }, 720);
  };
















  const seekBy = (amount) => {
    const nextTime = Math.max(0, currentTime + amount);
    showSeekFeedback(amount);
    sendCommand("seek", [nextTime]);
  };

  const gestureSequenceWindow = 2000;

  const getGestureDirection = (clientX, rect) => {
    const relativeX = clientX - rect.left;
    const sideWidth = rect.width * 0.32;
    if (relativeX > sideWidth && relativeX < rect.width - sideWidth) return 0;
    return relativeX <= sideWidth ? -1 : 1;
  };

  const seekByGesture = (direction) => {
    if (direction === 0) return;
    const previous = seekGestureRef.current;
    const now = Date.now();
    const sameSequence = previous.direction === direction
      && previous.count > 0
      && now - previous.lastGestureAt < gestureSequenceWindow;
    const count = sameSequence ? previous.count + 1 : 1;
    // Each gesture applies its full counted amount to the current movie position.
    // Example: +10, then +20 means the movie moves +10 and then another +20.
    const startTime = Number.isFinite(previous.lastTime) ? previous.lastTime : currentTime;
    const nextTime = Math.max(0, startTime + direction * 15 * count);
    if (previous.timer !== null) window.clearTimeout(previous.timer);
    seekGestureRef.current = {
      direction,
      count,
      baseTime: startTime,
      lastTime: nextTime,
      lastGestureAt: now,
      timer: window.setTimeout(() => {
        seekGestureRef.current = { direction: 0, count: 0, baseTime: 0, lastTime: null, lastGestureAt: 0, timer: null };
      }, gestureSequenceWindow),
    };
    setCurrentTime(nextTime);
    showSeekFeedback(direction * 10 * count);
    sendCommand("seek", [nextTime]);
  };
















  const handleGestureClick = (event) => {
    if (touchSuppressRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (getGestureDirection(event.clientX, rect) !== 0) return;
    if (gestureClickTimerRef.current !== null) window.clearTimeout(gestureClickTimerRef.current);
    gestureClickTimerRef.current = window.setTimeout(() => {
      gestureClickTimerRef.current = null;
      togglePlay();
    }, 240);
  };
















  const handleGestureTouchEnd = (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    event.preventDefault();
    event.stopPropagation();
    touchSuppressRef.current = true;
    window.setTimeout(() => { touchSuppressRef.current = false; }, 560);
    const now = Date.now();
    const previous = touchTapRef.current;
    const isDoubleTap = previous.time > 0 && now - previous.time < 340 && Math.abs(touch.clientX - previous.x) < 88;
    if (gestureClickTimerRef.current !== null) {
      window.clearTimeout(gestureClickTimerRef.current);
      gestureClickTimerRef.current = null;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const direction = getGestureDirection(touch.clientX, rect);
    if (isDoubleTap) {
      touchTapRef.current = { time: 0, x: 0 };
      ignoreDoubleClickRef.current = true;
      window.setTimeout(() => { ignoreDoubleClickRef.current = false; }, 460);
      seekByGesture(direction);
      return;
    }
    if (direction !== 0) {
      touchTapRef.current = { time: 0, x: 0 };
      return;
    }
    touchTapRef.current = { time: now, x: touch.clientX };
    gestureClickTimerRef.current = window.setTimeout(() => {
      gestureClickTimerRef.current = null;
      touchTapRef.current = { time: 0, x: 0 };
      togglePlay();
    }, 270);
  };
















  const handleGestureDoubleClick = (event) => {
    if (ignoreDoubleClickRef.current) {
      ignoreDoubleClickRef.current = false;
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (gestureClickTimerRef.current !== null) {
      window.clearTimeout(gestureClickTimerRef.current);
      gestureClickTimerRef.current = null;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    seekByGesture(getGestureDirection(event.clientX, rect));
  };
  const handleSeek = (event) => {
    const nextTime = Number(event.target.value);
    setCurrentTime(nextTime);
    sendCommand("seek", [nextTime]);
  };
  const handleVolume = (event) => {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);
    setMuted(nextVolume === 0);
    sendCommand("setVolume", [Math.min(1, nextVolume * (soundBoost / 100))]);
    if (nextVolume > 0 && muted) sendCommand("setMuted", [false]);
  };
  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    sendCommand("setMuted", [nextMuted]);
  };
  const toggleFullscreen = async () => {
    const player = playerRef.current;
    if (!player) return;
















    // Use input capability as well as width so a phone in landscape keeps the
    // mobile fallback path (landscape iPhones are wider than 767px).
    const isMobile = window.innerWidth <= 1024
      && (window.matchMedia("(max-width: 767px), (pointer: coarse)").matches
        || navigator.maxTouchPoints > 0);
    const activeFullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
















    if (activeFullscreenElement) {
      const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
      mobileFullscreenRef.current = false;
      setMobileFullscreen(false);
      if (exitFullscreen) await exitFullscreen.call(document);
      return;
    }
















    // A number of mobile webviews expose the fullscreen button but reject the
    // Fullscreen API for cross-origin iframes. Keep a reliable in-page fallback
    // so the player still expands to the viewport on those devices.
    if (isMobile && mobileFullscreenRef.current) {
      setMobileFullscreenState(false);
      setIsFullscreen(false);
      return;
    }
















    // Keep mobile fullscreen inside NOVA instead of invoking the native
    // fullscreen layer. iOS Safari can dismiss native iframe fullscreen on
    // rotation or touch, which makes the player appear to leave fullscreen.
    // The fixed NOVA layer stays active until the user taps this button again.
    if (isMobile) {
      setMobileFullscreenState(true);
      setIsFullscreen(true);
      return;
    }

    await player.requestFullscreen();
  };
















  const handleSourceChange = (nextSource) => {
    if (!PLAYER_SOURCE_OPTIONS.some((option) => option.id === nextSource) || nextSource === selectedSource) {
      setSourceMenuOpen(false);
      return;
    }
    const nextResumeAt = nextSource === "vidstuck"
      ? Math.max(0, Number(currentTimeRef.current || currentTime) || 0)
      : Math.max(0, Number(resumeAt) || 0);
    setSourceResumeAt(nextResumeAt);
    setSelectedSource(nextSource);
    setSourceMenuOpen(false);
    setSettingsOpen(false);
    setServerMenuOpen(false);
    setIsReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setControlsVisible(true);
  };

  const handleQualityChange = (nextQuality) => {
    const normalizedQuality = normalizeCineSrcQuality(nextQuality);
    setQuality(normalizedQuality);
    writeCineSrcPreferences(cineSrcPreferenceKey, { quality: normalizedQuality });
    setSettingsView("root");
    setIsReady(false);
    setControlsVisible(true);
  };

  const handleServerChange = (nextServer) => {
    if (!isCineSrc || !nextServer || nextServer === selectedServer) {
      setServerMenuOpen(false);
      return;
    }
    pendingServerSeekRef.current = currentTimeRef.current || currentTime;
    pendingServerPlayRef.current = isPlaying;
    const normalizedServer = normalizeCineSrcServer(nextServer) || "auto";
    setSelectedServer(normalizedServer);
    setActiveServer(normalizedServer);
    writeCineSrcPreferences(cineSrcPreferenceKey, { server: normalizedServer });
    setServerMenuOpen(false);
    setIsReady(false);
    setControlsVisible(true);
  };
















  if (!activeId) {
    return <div className="w-full h-96 bg-zinc-950 rounded-xl" />;
  }
















  return (
    <div
      ref={playerRef}
      className={`custom-movie-player${isCineSrc ? " custom-movie-player-cinesrc" : ""}${isCineSrc && !controlsVisible ? " custom-player-controls-hidden" : ""}${mobileFullscreen ? " is-mobile-fullscreen" : ""}`}
      onPointerMove={showControls}
      onPointerDown={showControls}
      onKeyDown={showControls}
      onFocusCapture={showControls}
      >
        <iframe
        ref={iframeRef}
        src={embedUrl}
        className={"provider-player-frame player-fit-" + videoFit}
        style={{ filter: "brightness(" + (brightness / 100) + ")" }}
        title="NIGHTOWL video player"
        allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
        />
        {!isCineSrc ? (
        <div className="player-source-control">
          <button type="button" className="player-source-button" style={{ display: "flex", marginBottom: 8, justifyContent: "center", width: "100%" }} onClick={() => handleSourceChange(isVidStuck ? "cinesrc" : "vidstuck")} aria-label={isVidStuck ? "Play with CineSrc" : "Play with VidStuck"}>
            <strong>{isVidStuck ? "Play with CineSrc" : "Play with VidStuck"}</strong>
          </button>
          <button type="button" className="player-source-button" onClick={() => setSourceMenuOpen((open) => !open)} aria-haspopup="listbox" aria-expanded={sourceMenuOpen} aria-label={"Source " + (isVidStuck ? "VidStuck" : "CineSrc")}>
            <span className="player-setting-label">Source</span>
            <strong>{isVidStuck ? "VidStuck" : "CineSrc"}</strong>
          </button>
          {sourceMenuOpen ? (
            <div className="player-source-menu" role="listbox" aria-label="Playback source">
              {PLAYER_SOURCE_OPTIONS.map((option) => (
                <button key={option.id} type="button" role="option" aria-selected={option.id === selectedSource} className={option.id === selectedSource ? "is-selected" : ""} onClick={() => handleSourceChange(option.id)}>
                  <span>{option.label}</span>{option.id === selectedSource ? <small>Active</small> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        ) : null}
        {isCineSrc && (!isReady || !introFinished) ? (
          <div className="nova-source-loading montana-player-intro" role="status" aria-live="polite">
            <div className="montana-player-intro-sheen" aria-hidden="true" />
            <div className="nightowl-reference-intro">
              <div className="nightowl-reference-wordmark" aria-label="NIGHTOWL"><span>NIGHTOWL</span><span className="nightowl-reference-fill" aria-hidden="true">NIGHTOWL</span><span className="nightowl-reference-glow" aria-hidden="true">NIGHTOWL</span></div>
              <p className="nightowl-reference-connection">Connecting to {cineSrcServerLabel(activeServer)}<span aria-hidden="true">_</span></p>
            </div>
          </div>
        ) : null}
      {activeSubtitle ? (
        <div className="custom-subtitle-overlay" aria-live="polite" style={{ fontFamily: subtitleFontFamily, fontSize: (subtitleFontSize * (subtitleLarge ? 1.35 : 1)) + "rem", bottom: `${subtitlePosition}%` }}>
          {activeSubtitle.text}
        </div>
      ) : null}
      {isCineSrc && isReady ? (
        <div className="custom-player-ui">
          {!isPlaying && isReady ? (
            <div className="player-paused-overlay" aria-label="Paused movie information">
              <div className="player-paused-topline">
                {logoUrl ? (
                  <img
                    className="player-paused-topline-logo"
                    src={logoUrl}
                    alt={title}
                    width={logoWidth}
                    height={logoHeight}
                  />
                ) : <span>{title}</span>}
              </div>
              <div className="player-paused-info">
                <p className="player-paused-eyebrow">You are watching</p>
                {logoUrl ? (
                  <img
                    className="player-paused-title-logo"
                    src={logoUrl}
                    alt={title}
                    width={logoWidth}
                    height={logoHeight}
                  />
                ) : <h2>{title}</h2>}
                <div className="player-paused-meta">
                  {releaseYear ? <span>{releaseYear}</span> : null}
                  {formatRuntimeLabel(runtimeMinutes) ? <span>{formatRuntimeLabel(runtimeMinutes)}</span> : null}
                  {Number(rating) > 0 ? <span className="player-paused-rating">★ {Number(rating).toFixed(1)}</span> : null}
                </div>
                {overview ? <p className="player-paused-overview">{overview}</p> : null}
              </div>
            </div>
          ) : null}
              <div className="player-paused-actions">
                <button
                  className="player-cast-button"
                  type="button"
                  onClick={(event) => { event.stopPropagation(); void handleCast(); }}
                  onPointerDown={(event) => event.stopPropagation()}
                  aria-label={castState === "connected" ? "Casting" : "Cast to device"}
                  title={castState === "connected" ? "Casting" : castState === "connecting" ? "Connecting to device" : castState === "unsupported" ? "Casting is not supported in this browser" : "Cast to device"}
                  disabled={castState === "connecting"}
                >
                  <CastIcon className="player-cast-icon" />
                </button>
              </div>
          <button className="player-gesture-layer" type="button" onClick={handleGestureClick} onTouchEnd={handleGestureTouchEnd} onDoubleClick={handleGestureDoubleClick} aria-label={isPlaying ? "Pause movie" : "Play movie"} />
          <button
            className={`player-center-play${centerFeedback ? " is-visible" : ""}${centerFeedback === "play" ? " is-play" : centerFeedback === "pause" ? " is-pause" : " is-seek"}`}
            type="button"
            onClick={togglePlay}
            aria-hidden={!centerFeedback}
            tabIndex={centerFeedback ? 0 : -1}
            aria-label={centerFeedback === "play" ? "Play" : centerFeedback === "pause" ? "Pause" : "Seek"}
          >
            {centerFeedback === "play" || centerFeedback === "pause" ? (
              <span className="nova-center-glyph" aria-hidden="true" />
            ) : centerFeedback === "forward" ? (
              <NightowlReferenceIcon name="Forward 15s" />
            ) : centerFeedback === "back" ? (
              <NightowlReferenceIcon name="Backward 15s" />
            ) : null}
          </button>
          <div className={"nightowl-mobile-center" + (controlsVisible && !settingsOpen && !serverMenuOpen ? " is-visible" : "")}>
            <button type="button" onClick={() => seekBy(-15)} aria-label="Backward 15s"><NightowlReferenceIcon name="Backward 15s" /></button>
            <button type="button" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>{isPlaying ? <NightowlReferenceIcon name="Pause" /> : <NightowlReferenceIcon name="Play" />}</button>
            <button type="button" onClick={() => seekBy(15)} aria-label="Forward 15s"><NightowlReferenceIcon name="Forward 15s" /></button>
          </div>
          {seekFeedback ? (
            <div key={seekFeedback} className={`player-seek-feedback ${seekFeedback.startsWith("+") ? "is-forward" : "is-back"}`} role="status" aria-live="polite">
              <strong>{seekFeedback}</strong>
            </div>
          ) : null}
          <div className={`nova-player-controls custom-provider-controls${controlsVisible ? "" : " controls-hidden"}`}>
            <div className="player-progress-row">
            <input
              className="player-progress"
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(currentTime, duration || currentTime)}
              style={{ "--played": `${duration ? (currentTime / duration) * 100 : 0}%` }}
              onChange={handleSeek}
              aria-label="Seek"
            />
            <span className="player-time player-time-progress"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></span>
            </div>
            <div className="player-control-row">
              <button type="button" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <NightowlReferenceIcon name="Pause" /> : <NightowlReferenceIcon name="Play" />}
              </button>
              <button type="button" onClick={() => seekBy(-15)} aria-label="Backward 15s"><NightowlReferenceIcon name="Backward 15s" /></button>
              <button type="button" onClick={() => seekBy(15)} aria-label="Forward 15s"><NightowlReferenceIcon name="Forward 15s" /></button>
              <div className="player-volume-control">
                <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
                  {muted ? <MutedIcon /> : <NightowlReferenceIcon name="Volume" />}
                </button>
                <input
                  className="player-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  style={{ "--volume-level": `${(muted ? 0 : volume) * 100}%` }}
                  onChange={handleVolume}
                  aria-label="Volume"
                />
              </div>
              
<span className="player-control-spacer" />
<button type="button" aria-label="Audio" onClick={() => { setSettingsOpen(true); setSettingsView("audio"); setServerMenuOpen(false); }}><NightowlReferenceIcon name="Audio" /></button>
<button type="button" aria-label="Subtitles" onClick={() => { setSettingsOpen(true); setSettingsView("subtitles"); setServerMenuOpen(false); }}><NightowlReferenceIcon name="Subtitle" /></button>
              <div className="player-settings-control">
                <button type="button" className="player-settings-button" onClick={() => { setSettingsOpen((open) => !open); setSettingsView("root"); }} aria-label="Player settings" aria-expanded={settingsOpen}>
                  <NightowlReferenceIcon name="Settings" />
                </button>
                {settingsOpen ? (
                  <div className={"player-settings-panel" + (["subtitles", "subtitle-customize"].includes(settingsView) ? " player-settings-panel-subtitles" : "")} role="dialog" aria-label="Player settings">
                    <div className="player-settings-header">
                      {settingsView !== "root" ? <button type="button" onClick={() => setSettingsView("root")} aria-label="Back to settings">‹</button> : <span />}
                      <strong>{settingsView === "root" ? "Settings" : settingsView === "audio" ? "Audio" : settingsView === "quality" ? "Quality" : settingsView === "subtitles" ? "Subtitles" : settingsView === "speed" ? "Playback speed" : settingsView === "subtitle-customize" ? "Customize subtitles" : "Playback settings"}</strong>
                      <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button>
                    </div>
                    {settingsView === "root" ? (
                      <div className="player-settings-body">
                        <div className="player-settings-card">
                          <button type="button" className="player-settings-row" onClick={() => setSettingsView("quality")}><span>Quality</span><span>{reportedQuality ? `${reportedQuality} actual` : cineSrcQualityLabel(quality)}<b>›</b></span></button>
                          <button type="button" className="player-settings-row" onClick={() => setSettingsView("subtitles")}><span>Subtitles</span><span>{subtitlesEnabled ? subtitleProviderLabel(subtitleProvider) : "Off"}<b>›</b></span></button>
                          <div className="player-settings-row is-disabled"><span>Audio</span><span>Original</span></div>
                          <button type="button" className="player-settings-row" onClick={() => setSettingsView("speed")}><span>Playback speed</span><span>{playbackRate}x<b>›</b></span></button>
                        </div>
                        <button type="button" className="player-settings-row player-settings-card player-settings-single" onClick={() => setSettingsView("playback")}><span>Playback settings</span><b>›</b></button>
                      </div>
                    ) : null}
                    {settingsView === "audio" ? (<div className="player-settings-body"><div className="player-settings-option is-selected"><span>Original audio</span><b>✓</b></div><p className="player-settings-caption">Audio tracks are supplied by the selected CineSrc server.</p></div>) : null}
                    {settingsView === "quality" ? (
                      <div className="player-settings-body player-settings-list">{CINESRC_QUALITY_OPTIONS.map((option) => <button key={option} type="button" className={"player-settings-option" + (option === quality ? " is-selected" : "")} onClick={() => handleQualityChange(option)}><span>{cineSrcQualityLabel(option)}</span>{option === quality ? <b>✓</b> : null}</button>)}</div>
                    ) : null}
                    {settingsView === "subtitles" ? (
                      <div className="player-settings-body player-settings-subtitles">
                        <button type="button" className="player-settings-toggle" onClick={() => setSubtitlesEnabled((enabled) => !enabled)}><span>Subtitles</span><strong>{subtitlesEnabled ? "On" : "Off"}</strong></button>
                        <p className="player-settings-caption">{subtitleStatus === "loading" ? "Loading subtitles…" : subtitleStatus === "error" ? subtitleError : subtitleStatus === "ready" ? (subtitleProvider === "auto" ? "" : subtitleProviderLabel(subtitleProvider) + " • ") + subtitleLanguage.toUpperCase() + " subtitle track" : "No subtitle track is available for this title."}</p>
                        <span className="player-settings-label-block">Subtitle provider</span>
                        <div className="player-settings-language-grid">{SUBTITLE_PROVIDER_OPTIONS.filter(([value]) => value !== "auto").map(([value, label]) => <button key={value} type="button" className={value === subtitleProvider ? "is-selected" : ""} onClick={() => setSubtitleProvider(value)}>{label}</button>)}</div>
                        <span className="player-settings-label-block">Language</span>
                        <div className="nightowl-subtitle-track-list">{subtitleLanguageOptions.map(([value, label]) => <button key={value} type="button" className={value === subtitleLanguage ? "is-selected" : ""} onClick={() => setSubtitleLanguage(value)}><span>{label}</span>{value === subtitleLanguage ? <b>✓</b> : null}</button>)}</div>
                        <button type="button" className="player-settings-action" onClick={() => setSettingsView("subtitle-customize")}>Style &amp; delay <b>›</b></button>
                      </div>
                    ) : null}
                    {settingsView === "subtitle-customize" ? (
                      <div className="player-settings-body player-settings-subtitles">
                        <button className={"player-settings-toggle" + (subtitleLarge ? " is-selected" : "")} type="button" onClick={() => setSubtitleLarge((large) => !large)}><span>Watch Closer</span><strong>{subtitleLarge ? "On" : "Off"}</strong></button>
                        <span className="player-settings-label-block">Font family</span>
                        <div className="player-settings-language-grid">{subtitleFontFamilyOptions.map(([value, label]) => <button key={value} type="button" style={{ fontFamily: value }} className={value === subtitleFontFamily ? "is-selected" : ""} onClick={() => setSubtitleFontFamily(value)}>{label}</button>)}</div>
                        <label className="player-settings-slider-row">Font size <span>{subtitleFontSize.toFixed(1)}x</span><input type="range" min="0.8" max="2" step="0.1" value={subtitleFontSize} onChange={(event) => setSubtitleFontSize(Number(event.target.value))} /></label>
                        <label className="player-settings-slider-row">Position <span>{subtitlePosition}%</span><input type="range" min="8" max="76" step="1" value={subtitlePosition} onChange={(event) => setSubtitlePosition(Number(event.target.value))} /></label>
                        <label className="player-settings-slider-row">Sync <span>{subtitleOffset > 0 ? "+" : ""}{subtitleOffset.toFixed(1)}s</span><input type="range" min="-25" max="25" step="0.5" value={subtitleOffset} onChange={(event) => setSubtitleOffset(Number(event.target.value))} /></label>
                      </div>
                    ) : null}
                    {settingsView === "speed" ? (
                      <div className="player-settings-body player-settings-list">{[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => <button key={rate} type="button" className={"player-settings-option" + (rate === playbackRate ? " is-selected" : "")} onClick={() => { setPlaybackRate(rate); sendCommand("setPlaybackRate", [rate]); setSettingsView("root"); }}><span>{rate}x</span>{rate === playbackRate ? <b>✓</b> : null}</button>)}</div>
                    ) : null}
                    {settingsView === "playback" ? (
                      <div className="player-settings-body player-settings-playback">
                        <div className="player-settings-feature"><div className="player-settings-feature-title"><span>Sound Booster</span><strong>{soundBoost}%</strong></div><input type="range" min="100" max="300" step="10" value={soundBoost} onChange={(event) => { const next = Number(event.target.value); setSoundBoost(next); sendCommand("setVolume", [Math.min(1, volume * (next / 100))]); }} /><div className="player-settings-range-labels"><span>100%</span><span>300%</span></div></div>
                        <div className="player-settings-feature"><div className="player-settings-feature-title"><span>Video fit</span><strong>{videoFit[0].toUpperCase() + videoFit.slice(1)}</strong></div><div className="player-settings-fit-grid">{["fit", "fill", "stretch"].map((fit) => <button key={fit} type="button" className={videoFit === fit ? "is-selected" : ""} onClick={() => setVideoFit(fit)}>{fit[0].toUpperCase() + fit.slice(1)}</button>)}</div></div>
                        <label className="player-settings-slider-row">Brightness <span>{brightness}%</span><input type="range" min="40" max="160" step="1" value={brightness} onChange={(event) => setBrightness(Number(event.target.value))} /></label>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="player-server-control">
                <button type="button" className="player-server-button" onClick={() => setServerMenuOpen((open) => !open)} aria-haspopup="listbox" aria-expanded={serverMenuOpen} aria-label={"Sources and servers, current server " + activeServer}>
                  <NightowlReferenceIcon name="Servers" />
                  <span className="nightowl-server-label">Sources</span>
                </button>
                {serverMenuOpen ? (
                  <div className="player-server-menu" role="listbox" aria-label="Playback sources and CineSrc servers">
<h3 className="nightowl-menu-heading">Playback source</h3>
{PLAYER_SOURCE_OPTIONS.map((option) => (<button key={option.id} type="button" role="option" aria-selected={option.id === selectedSource} className={option.id === selectedSource ? "is-selected" : ""} onClick={() => handleSourceChange(option.id)}><span>{option.label}</span><small>{option.id === selectedSource ? "Active" : "Switch"}</small></button>))}
<h3 className="nightowl-menu-heading">CineSrc servers</h3>
                    {CINESRC_SERVER_OPTIONS.map((option) => (
                      <button key={option.id} type="button" role="option" aria-selected={option.id === selectedServer} className={option.id === selectedServer ? "is-selected" : ""} onClick={() => handleServerChange(option.id)}>
                        <span>{option.label}</span>{option.id === activeServer ? <small>Active</small> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                <NightowlReferenceIcon name="Fullscreen" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
