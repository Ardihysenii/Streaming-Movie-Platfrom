"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CaptionsIcon,
  FullscreenIcon,
  MutedIcon,
  PauseIcon,
  PlayIcon,
  RewindIcon,
  ForwardIcon,
  VolumeIcon,
} from "@/components/Icons";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

export default function CustomMoviePlayer({
  tmdbId,
  mediaType = "movie",
  seasonNumber,
  episodeNumber,
  resumeAt = 0,
  onProgress,
}) {
  const [isClient, setIsClient] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileFullscreen, setMobileFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [quality, setQuality] = useState("1080");
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const [subtitleNoticeVisible, setSubtitleNoticeVisible] = useState(false);
  const [subtitleMode, setSubtitleMode] = useState(false);
  const controlsTimerRef = useRef(null);
  const centerFeedbackTimerRef = useRef(null);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const resumeAppliedRef = useRef(false);
  const [centerFeedback, setCenterFeedback] = useState(null);
  const searchParams = useSearchParams();

  const queryId = searchParams ? searchParams.get("id") : null;
  const activeId = tmdbId || queryId || "";

  useEffect(() => {
    setIsClient(true);
  }, []);

  const providerBase = (process.env.NEXT_PUBLIC_VIDEO_PROVIDER_URL || "https://cinesrc.st").replace(/\/+$/, "");
  const isCineSrc = /cinesrc\.st/i.test(providerBase);
  const providerOrigin = useMemo(() => {
    try {
      return new URL(providerBase).origin;
    } catch {
      return "";
    }
  }, [providerBase]);

  const embedUrl = useMemo(() => {
    if (!activeId) return "";
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
    }
    if (isCineSrc) {
      // CineSrc owns subtitle tracks inside its iframe. Keep NOVA's controls
      // for normal playback, then expose the provider controls when the user
      // opens the captions button so its CC track picker is interactive.
      params.set("controls", subtitleMode ? "true" : "false");
      params.set("autoplay", "false");
      params.set("quality", quality);
    }
    const query = params.toString();
    return `${providerBase}${path}${query ? `?${query}` : ""}`;
  }, [activeId, episodeNumber, isCineSrc, mediaType, providerBase, quality, seasonNumber, subtitleMode]);

  useEffect(() => {
    resumeAppliedRef.current = false;
    setCurrentTime(0);
    setDuration(0);
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
  }, []);

  const sendCommand = useCallback((command, args = []) => {
    if (!isCineSrc || !providerOrigin || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "cinesrc:command", command, args },
      providerOrigin,
    );
  }, [isCineSrc, providerOrigin]);

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
          break;
        case "cinesrc:play":
          setIsPlaying(true);
          // If the source only accepts seeks after playback begins, apply the
          // saved movie position at that point as a reliable fallback.
          if (resumeAt > 0 && !resumeAppliedRef.current) {
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
            setCurrentTime(nextCurrentTime);
            onProgress?.(nextCurrentTime, Number(payload?.duration));
          }
          if (Number.isFinite(Number(payload?.duration))) setDuration(Number(payload.duration));
          break;
        case "cinesrc:volumechange":
          if (Number.isFinite(Number(payload?.volume))) setVolume(Number(payload.volume));
          if (typeof payload?.muted === "boolean") setMuted(payload.muted);
          break;
        case "cinesrc:response": {
          // CineSrc returns getter responses as { command, result }.
          const command = message.command ?? payload?.command;
          const result = message.result ?? payload?.result;
          if (command === "getDuration" && Number.isFinite(Number(result))) setDuration(Number(result));
          if (command === "getCurrentTime" && Number.isFinite(Number(result))) setCurrentTime(Number(result));
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
  }, [isCineSrc, onProgress, providerOrigin, resumeAt, sendCommand]);

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
    const player = playerRef.current;
    const iframe = iframeRef.current;
    const handleFullscreenChange = () => {
      const activeFullscreenElement = document.fullscreenElement;
      const active = activeFullscreenElement === player || activeFullscreenElement === iframe;
      setIsFullscreen(active);
      if (!active && !activeFullscreenElement) setMobileFullscreen(false);
    };
    const handleWebkitFullscreenChange = () => {
      const active = Boolean(
        player?.webkitDisplayingFullscreen
        || iframe?.webkitDisplayingFullscreen
        || document.fullscreenElement === player
        || document.fullscreenElement === iframe,
      );
      setIsFullscreen(active);
      if (!active) setMobileFullscreen(false);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleWebkitFullscreenChange);
    player?.addEventListener("webkitbeginfullscreen", handleWebkitFullscreenChange);
    player?.addEventListener("webkitendfullscreen", handleWebkitFullscreenChange);
    iframe?.addEventListener("webkitbeginfullscreen", handleWebkitFullscreenChange);
    iframe?.addEventListener("webkitendfullscreen", handleWebkitFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleWebkitFullscreenChange);
      player?.removeEventListener("webkitbeginfullscreen", handleWebkitFullscreenChange);
      player?.removeEventListener("webkitendfullscreen", handleWebkitFullscreenChange);
      iframe?.removeEventListener("webkitbeginfullscreen", handleWebkitFullscreenChange);
      iframe?.removeEventListener("webkitendfullscreen", handleWebkitFullscreenChange);
    };
  }, []);

  const showCenterFeedback = (nextPlaying) => {
    setCenterFeedback(nextPlaying ? "play" : "pause");
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
  const seekBy = (amount) => sendCommand("seek", [Math.max(0, currentTime + amount)]);
  const handleSeek = (event) => {
    const nextTime = Number(event.target.value);
    setCurrentTime(nextTime);
    sendCommand("seek", [nextTime]);
  };
  const handleVolume = (event) => {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);
    setMuted(nextVolume === 0);
    sendCommand("setVolume", [nextVolume]);
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

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const activeFullscreenElement = document.fullscreenElement;

    if (activeFullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    // A number of mobile webviews expose the fullscreen button but reject the
    // Fullscreen API for cross-origin iframes. Keep a reliable in-page fallback
    // so the player still expands to the viewport on those devices.
    if (isMobile && mobileFullscreen) {
      setMobileFullscreen(false);
      setIsFullscreen(false);
      return;
    }

    // Touch browsers can reject fullscreen on an absolutely-positioned wrapper
    // or require their prefixed request method. Keep the desktop path exactly
    // as-is, while trying the mobile-compatible targets only on mobile.
    if (isMobile) {
      setMobileFullscreen(true);
      setIsFullscreen(true);
      const mobileTarget = player;
      const requestFullscreen = mobileTarget.requestFullscreen || mobileTarget.webkitRequestFullscreen;
      if (requestFullscreen) {
        try {
          await requestFullscreen.call(mobileTarget, { navigationUI: "hide" });
          return;
        } catch {
          // Some mobile browsers only allow fullscreen on the embedded frame.
        }
      }

      const frame = iframeRef.current;
      const requestFrameFullscreen = frame?.requestFullscreen || frame?.webkitRequestFullscreen;
      if (frame && requestFrameFullscreen) {
        try {
          await requestFrameFullscreen.call(frame, { navigationUI: "hide" });
        } catch {
          // The in-page mobile fallback above remains active.
        }
        return;
      }
      return;
    }

    await player.requestFullscreen();
  };

  const handleQualityChange = (nextQuality) => {
    setQuality(nextQuality);
    setQualityMenuOpen(false);
    setIsReady(false);
    setControlsVisible(true);
  };

  if (!isClient || !activeId) {
    return <div className="w-full h-96 bg-zinc-950 rounded-xl" />;
  }

  return (
    <div
      ref={playerRef}
      className={`custom-movie-player${isCineSrc ? " custom-movie-player-cinesrc" : ""}${isCineSrc && !controlsVisible ? " custom-player-controls-hidden" : ""}${mobileFullscreen ? " is-mobile-fullscreen" : ""}${subtitleMode ? " native-subtitle-mode" : ""}`}
      onPointerMove={showControls}
      onPointerDown={showControls}
      onKeyDown={showControls}
      onFocusCapture={showControls}
    >
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="provider-player-frame"
        title="NOVA video player"
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture"
      />
      {isCineSrc ? (
        <div className="custom-player-ui">
          <button className="player-gesture-layer" type="button" onClick={togglePlay} aria-label={isPlaying ? "Pause movie" : "Play movie"} />
          <button
            className={`player-center-play${centerFeedback ? " is-visible" : ""}`}
            type="button"
            onClick={togglePlay}
            aria-hidden={!centerFeedback}
            tabIndex={centerFeedback ? 0 : -1}
            aria-label={centerFeedback === "play" ? "Play" : "Pause"}
          >
            {centerFeedback === "play" ? <PlayIcon /> : <PauseIcon />}
          </button>
          <div className={`nova-player-controls custom-provider-controls${controlsVisible ? "" : " controls-hidden"}`}>
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
            <div className="player-control-row">
              <button type="button" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button type="button" onClick={() => seekBy(-10)} aria-label="Rewind 10 seconds"><RewindIcon /></button>
              <button type="button" onClick={() => seekBy(10)} aria-label="Forward 10 seconds"><ForwardIcon /></button>
              <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
                {muted ? <MutedIcon /> : <VolumeIcon />}
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
              <span className="player-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
              <span className="player-control-spacer" />
              <div className="player-quality-control">
                <button
                  className="player-quality-button"
                  type="button"
                  onClick={() => setQualityMenuOpen((open) => !open)}
                  aria-haspopup="listbox"
                  aria-expanded={qualityMenuOpen}
                  aria-label={`Quality ${quality}p`}
                >
                  <span className="player-setting-label">Quality</span>
                  <strong>{quality}p</strong>
                </button>
                {qualityMenuOpen ? (
                  <div className="player-quality-menu" role="listbox" aria-label="Preferred quality">
                    {["1080", "720", "480"].map((option) => (
                      <button
                        className={option === quality ? "is-selected" : ""}
                        key={option}
                        type="button"
                        role="option"
                        aria-selected={option === quality}
                        onClick={() => handleQualityChange(option)}
                      >
                        {option}p
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubtitleMode(true);
                  setSubtitleNoticeVisible(true);
                  setControlsVisible(true);
                }}
                aria-label="Open subtitle controls"
                title="Open subtitle controls"
              >
                <CaptionsIcon />
              </button>
              <button type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                <FullscreenIcon />
              </button>
            </div>
            {subtitleNoticeVisible ? (
              <div className="player-subtitle-notice" role="status">
                Use the player’s CC control to choose an available subtitle track.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

