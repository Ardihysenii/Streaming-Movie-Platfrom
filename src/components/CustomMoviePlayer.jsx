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
  PictureInPictureIcon,
  CastIcon,
  CaptionsIcon,
  SettingsIcon,
  BackIcon,
  GridIcon,
} from "@/components/Icons";
import { useNovaSettings } from "@/components/Providers";


const VidstuckPlayIcon = (props) => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="M7 4.8c0-1.1 1.2-1.8 2.2-1.2l10.1 6.4c.9.6.9 1.9 0 2.5L9.2 18.9C8.2 19.5 7 18.8 7 17.7V4.8Z" /></svg>;
const VidstuckPauseIcon = (props) => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><rect x="5" y="3" width="5" height="18" rx=".8" /><rect x="14" y="3" width="5" height="18" rx=".8" /></svg>;
const VidstuckSeekIcon = ({ forward = false, ...props }) => <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}><path d={forward ? "M18.5 7.2a9.8 9.8 0 1 1-5.1 1.4" : "M13.5 7.2a9.8 9.8 0 1 0 5.1 1.4"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d={forward ? "m18 4.8 1 4.2-4.2 1" : "m14 4.8-1 4.2 4.2 1"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><text x="16" y="19" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="currentColor">15</text></svg>;
const VidstuckNextIcon = (props) => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="M4 5.1c0-.9 1-1.5 1.8-1l9.2 6c.7.5.7 1.5 0 1.9l-9.2 6C5 18.5 4 18 4 17V5.1Z" /><rect x="17" y="4" width="3" height="16" rx=".7" /></svg>;
const VidstuckVolumeIcon = ({ muted = false, ...props }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M4 9H2v6h2l6 4V5L4 9Z" />{muted ? <><path d="m15 9 6 6M21 9l-6 6" /></> : <><path d="M14 9a4 4 0 0 1 0 6" /><path d="M17 6a8 8 0 0 1 0 12" /></>}</svg>;
const VidstuckCaptionsIcon = (props) => <svg viewBox="0 0 28 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><rect x="2" y="3" width="24" height="16" rx="1.5" /><path d="M7 9h5M7 13h4M16 9h5M16 13h4" /></svg>;
const VidstuckGearIcon = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><circle cx="12" cy="12" r="3.1" /><path d="M19.2 15a1.8 1.8 0 0 0 .3 1.9l.1.1-2.6 2.6-.1-.1a1.8 1.8 0 0 0-1.9-.3 1.8 1.8 0 0 0-1 1.6v.2h-4v-.2a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-1.9.3l-.1.1-2.6-2.6.1-.1a1.8 1.8 0 0 0 .3-1.9 1.8 1.8 0 0 0-1.6-1H3v-4h.2a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.3-1.9l-.1-.1L7 4.4l.1.1a1.8 1.8 0 0 0 1.9.3 1.8 1.8 0 0 0 1-1.6V3h4v.2a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 1.9-.3l.1-.1 2.6 2.6-.1.1a1.8 1.8 0 0 0-.3 1.9 1.8 1.8 0 0 0 1.6 1h.2v4h-.2a1.8 1.8 0 0 0-1.6 1Z" /></svg>;
const VidstuckFullscreenIcon = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" /></svg>;
const VidstuckEpisodesIcon = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><rect x="5" y="3" width="14" height="18" rx="1" /><path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" /><path d="M19 7h2v10h-2" /></svg>;
const VidstuckCloudIcon = (props) => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="M7.2 18.5h9.6a4.4 4.4 0 0 0 .7-8.7A6.1 6.1 0 0 0 6 8.5a5 5 0 0 0 1.2 10Z" /></svg>;

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
  const playerDisplayTitle = mediaType === "tv" && seasonNumber && episodeNumber
    ? `${title} S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`
    : title;

  const [subtitleOffset, setSubtitleOffset] = useState(0);
  const subtitleLanguageOptions = [["en", "English"], ["de", "Deutsch"], ["es", "Español"], ["fr", "Français"], ["it", "Italiano"], ["pt", "Português"], ["tr", "Türkçe"], ["sq", "Shqip"], ["ja", "日本語"], ["ru", "Русский"], ["ko", "한국어"], ["zh", "中文"], ["nl", "Nederlands"], ["pl", "Polski"], ["ar", "العربية"], ["hi", "हिन्दी"], ["ro", "Română"], ["cs", "Čeština"], ["uk", "Українська"], ["sv", "Svenska"], ["da", "Dansk"]];
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


































  const providerBase = (process.env.NEXT_PUBLIC_VIDEO_PROVIDER_URL || "https://cinesrc.st").replace(/\/+$/, "");
  const isCineSrc = /cinesrc\.st/i.test(providerBase);
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
  }, [activeId, cineSrcPreferencesReady, episodeNumber, isCineSrc, mediaType, providerBase, quality, seasonNumber, selectedServer, settings.autoplayPlayer]);

















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
















  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current !== null) window.clearTimeout(controlsTimerRef.current);
    if (isPlaying) {
      controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 4000);
    }
  }, [isPlaying]);
















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
    if (!isCineSrc) return undefined;
















    const handleMessage = (event) => {
      if (event.origin !== providerOrigin || event.source !== iframeRef.current?.contentWindow) return;
      const message = event.data;
      if (!message || typeof message.type !== "string") return;
      const payload = message.data ?? message;
















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
  }, [isCineSrc, onProgress, providerOrigin, resumeAt, sendCommand, settings.autoplayPlayer]);
















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
    const nextTime = Math.max(0, startTime + direction * 10 * count);
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
        title="NOVA video player"
        allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
        />
        {isCineSrc && !isReady ? (
          <div className="nova-source-loading montana-player-intro" role="status" aria-live="polite">
            <div className="montana-player-intro-sheen" aria-hidden="true" />
            <div className="montana-player-intro-content">
              <p className="montana-player-intro-kicker">Now screening</p>
              <div className="montana-player-intro-brand" aria-label="MONTANA">
                {[..."MONTANA"].map((letter, index) => (
                  <span key={letter + index} style={{ animationDelay: index * 95 + "ms" }}>{letter}</span>
                ))}
              </div>
              <div className="montana-player-intro-rule" aria-hidden="true"><span /> <i /></div>
              <strong>{mediaType === "tv" ? "Your episode is about to begin" : "Your movie is about to begin"}</strong>
              <span className="nova-source-loading-detail">{connectionSlow ? `Still waiting for ${cineSrcServerLabel(activeServer)}…` : "Connecting to your stream…"}</span>
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
          <div className="player-top-navigation" aria-label="Player navigation">
            <button type="button" onClick={() => window.history.back()} aria-label="Back">
              <BackIcon />
            </button>
          </div>
          {isReady ? (
            <div className="player-paused-overlay" aria-label="Paused movie information">
              <div className="player-paused-topline">
                {logoUrl ? (
                  <img
                    className="player-paused-topline-logo"
                    src={logoUrl}
                    alt={playerDisplayTitle}
                    width={logoWidth}
                    height={logoHeight}
                  />
                ) : <span>{playerDisplayTitle}</span>}
                <span className="player-paused-topline-mark" aria-hidden="true" />
              </div>
              <div className="player-paused-info">
                <p className="player-paused-eyebrow">You're Watching</p>
                {logoUrl ? (
                  <img
                    className="player-paused-title-logo"
                    src={logoUrl}
                    alt={playerDisplayTitle}
                    width={logoWidth}
                    height={logoHeight}
                  />
                ) : <h2>{playerDisplayTitle}</h2>}
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
                {mediaType === "tv" ? (
                  <button type="button" className="player-episodes-button" onClick={() => document.getElementById("episodes-section")?.scrollIntoView({ behavior: "smooth", block: "start" })} aria-label="Episodes">
                    <VidstuckEpisodesIcon />
                  </button>
                ) : null}
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
              <VidstuckSeekIcon forward />
            ) : centerFeedback === "back" ? (
              <VidstuckSeekIcon />
            ) : null}
          </button>
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
            <span className="player-time player-current-time">{formatTime(currentTime)}</span><span className="player-time player-duration-time">{formatTime(duration)}</span>
            </div>
            <div className="player-control-row">
              <button type="button" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <VidstuckPauseIcon /> : <VidstuckPlayIcon />}
              </button>
              <button type="button" onClick={() => seekBy(-15)} aria-label="Rewind 15 seconds"><RewindIcon /></button>
              <button type="button" onClick={() => seekBy(15)} aria-label="Forward 15 seconds"><ForwardIcon /></button>
              <div className="player-volume-control">
                <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
                  {muted ? <VidstuckVolumeIcon muted /> : <VidstuckVolumeIcon />}
                </button>
                <input
                  className="player-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={handleVolume}
                  aria-label="Volume"
                />
              </div>
              <span className="player-control-spacer" />
              <div className="player-subtitles-control">
                <button type="button" className="player-subtitles-button" onClick={() => { setSettingsOpen(true); setSettingsView("subtitles"); }} aria-label="Subtitles" aria-expanded={settingsOpen}>
                  <VidstuckCaptionsIcon />
                </button>
              </div>
              <div className="player-settings-control">
                <button type="button" className="player-settings-button" onClick={() => { setSettingsOpen((open) => !open); setSettingsView("root"); }} aria-label="Player settings" aria-expanded={settingsOpen}>
                  <VidstuckGearIcon className="player-setting-icon" />
                </button>
                {settingsOpen ? (
                  <div className="player-settings-panel" role="dialog" aria-label="Player settings">
                    <div className="player-settings-header">
                      {settingsView !== "root" ? <button type="button" onClick={() => setSettingsView("root")} aria-label="Back to settings">‹</button> : <span />}
                      <strong>{settingsView === "root" ? "Settings" : settingsView === "quality" ? "Quality" : settingsView === "subtitles" ? "Subtitles" : settingsView === "speed" ? "Playback speed" : settingsView === "subtitle-customize" ? "Customize subtitles" : "Playback settings"}</strong>
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
                    {settingsView === "quality" ? (
                      <div className="player-settings-body player-settings-list">{CINESRC_QUALITY_OPTIONS.map((option) => <button key={option} type="button" className={"player-settings-option" + (option === quality ? " is-selected" : "")} onClick={() => handleQualityChange(option)}><span>{cineSrcQualityLabel(option)}</span>{option === quality ? <b>✓</b> : null}</button>)}</div>
                    ) : null}
                    {settingsView === "subtitles" ? (
                      <div className="player-settings-body player-settings-subtitles">
                        <button type="button" className="player-settings-toggle" onClick={() => setSubtitlesEnabled((enabled) => !enabled)}><span>Subtitles</span><strong>{subtitlesEnabled ? "On" : "Off"}</strong></button>
                        <p className="player-settings-caption">{subtitleStatus === "loading" ? "Loading subtitles…" : subtitleStatus === "error" ? subtitleError : subtitleStatus === "ready" ? subtitleProviderLabel(subtitleProvider) + " • " + subtitleLanguage.toUpperCase() + " subtitle track" : "No subtitle track is available for this title."}</p>
                        <span className="player-settings-label-block">Source</span>
                        <div className="player-settings-language-grid">{SUBTITLE_PROVIDER_OPTIONS.map(([value, label]) => <button key={value} type="button" className={value === subtitleProvider ? "is-selected" : ""} onClick={() => setSubtitleProvider(value)}>{label}</button>)}</div>
                        <span className="player-settings-label-block">Language</span>
                        <div className="player-settings-language-grid">{subtitleLanguageOptions.map(([value, label]) => <button key={value} type="button" className={value === subtitleLanguage ? "is-selected" : ""} onClick={() => setSubtitleLanguage(value)}>{label}</button>)}</div>
                        <button type="button" className="player-settings-action" onClick={() => setSettingsView("subtitle-customize")}>Customize subtitles <b>›</b></button>
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
                <button type="button" className="player-server-button" onClick={() => setServerMenuOpen((open) => !open)} aria-haspopup="listbox" aria-expanded={serverMenuOpen} aria-label={"Server " + activeServer}>
                  <span className="player-server-cloud-icon" aria-hidden="true" />
                  <span className="player-setting-label">Server</span>
                  <strong>{cineSrcServerLabel(activeServer)}</strong>
                </button>
                {serverMenuOpen ? (
                  <div className="player-server-menu" role="listbox" aria-label="CineSrc server">
                    {CINESRC_SERVER_OPTIONS.map((option) => (
                      <button key={option.id} type="button" role="option" aria-selected={option.id === selectedServer} className={option.id === selectedServer ? "is-selected" : ""} onClick={() => handleServerChange(option.id)}>
                        <span>{option.label}</span>{option.id === activeServer ? <small>Active</small> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                <VidstuckFullscreenIcon />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
