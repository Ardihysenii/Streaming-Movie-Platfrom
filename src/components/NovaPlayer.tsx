"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  CaptionsIcon,
  ForwardIcon,
  FullscreenIcon,
  MinimizeIcon,
  MutedIcon,
  PauseIcon,
  PictureInPictureIcon,
  PlayIcon,
  RewindIcon,
  VolumeIcon,
} from "@/components/Icons";
import { LoadingSpinner } from "@/components/Loading";
import type { PlaybackManifest } from "@/lib/types";

type QualityLevel = {
  index: number;
  label: string;
};

type NovaPlayerProps = {
  manifest: PlaybackManifest;
  title: string;
  poster?: string;
  autoplay: boolean;
  preferredSubtitleLanguage: string;
  resumeAt: number;
  onProgress: (currentTime: number, duration: number) => void;
  onEnded: (duration: number) => void;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = Math.floor(seconds % 60);
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`
    : `${minutes.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
}

export function NovaPlayer({
  manifest,
  title,
  poster,
  autoplay,
  preferredSubtitleLanguage,
  resumeAt,
  onProgress,
  onEnded,
}: NovaPlayerProps) {
  const shellRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const currentTimeRef = useRef(Math.max(0, resumeAt));
  const selectedSubtitleRef = useRef(-1);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(-1);
  const [selectedSubtitle, setSelectedSubtitle] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(Math.max(0, resumeAt));
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = manifest.sources[activeSourceIndex] ?? manifest.sources[0];

  const preferredSubtitleIndex = useMemo(() => {
    const normalized = preferredSubtitleLanguage.toLowerCase();
    const exact = manifest.subtitles.findIndex(
      (track) => track.language.toLowerCase() === normalized,
    );
    if (exact >= 0) return exact;
    return manifest.subtitles.findIndex((track) => track.default);
  }, [manifest.subtitles, preferredSubtitleLanguage]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    if (playing) {
      controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2800);
    }
  }, [playing]);

  const applySubtitle = useCallback((index: number) => {
    const video = videoRef.current;
    if (!video) return;
    for (let trackIndex = 0; trackIndex < video.textTracks.length; trackIndex += 1) {
      video.textTracks[trackIndex].mode = trackIndex === index ? "showing" : "disabled";
    }
  }, []);

  useEffect(() => {
    setActiveSourceIndex(0);
    setSelectedSubtitle(preferredSubtitleIndex);
    selectedSubtitleRef.current = preferredSubtitleIndex;
    currentTimeRef.current = Math.max(0, resumeAt);
    setCurrentTime(Math.max(0, resumeAt));
  }, [manifest.movieId, preferredSubtitleIndex, resumeAt]);

  useEffect(() => {
    selectedSubtitleRef.current = selectedSubtitle;
    applySubtitle(selectedSubtitle);
  }, [applySubtitle, selectedSubtitle]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;
    let cancelled = false;

    setError(null);
    setWaiting(true);
    setQualityLevels([]);
    setSelectedLevel(-1);
    hlsRef.current?.destroy();
    hlsRef.current = null;
    video.pause();
    video.removeAttribute("src");
    video.load();

    const startPlayback = () => {
      if (cancelled) return;
      const target = Math.min(currentTimeRef.current, Math.max(0, video.duration - 1));
      if (Number.isFinite(target) && target > 0) video.currentTime = target;
      applySubtitle(selectedSubtitleRef.current);
      setWaiting(false);
      if (autoplay) void video.play().catch(() => undefined);
    };

    const load = async () => {
      if (source.type === "mp4" || video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = source.url;
        video.addEventListener("loadedmetadata", startPlayback, { once: true });
        video.load();
        return;
      }

      const { default: Hls, Events } = await import("hls.js");
      if (cancelled) return;
      if (!Hls.isSupported()) {
        setWaiting(false);
        setError("This browser cannot play the available HLS stream.");
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        capLevelToPlayerSize: true,
        startLevel: -1,
        maxBufferLength: 30,
        backBufferLength: 60,
      });
      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.on(Events.MEDIA_ATTACHED, () => hls.loadSource(source.url));
      hls.on(Events.MANIFEST_PARSED, () => {
        setQualityLevels(
          hls.levels.map((level, index) => ({
            index,
            label: level.height
              ? `${level.height}p`
              : level.bitrate
                ? `${Math.round(level.bitrate / 1000)} kbps`
                : `Level ${index + 1}`,
          })),
        );
        startPlayback();
      });
      hls.on(Events.LEVEL_SWITCHED, (_event, data) => {
        if (hls.autoLevelEnabled) setSelectedLevel(-1);
        else setSelectedLevel(data.level);
      });
      hls.on(Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        setWaiting(false);
        setError("The video source stopped responding. Try again or choose another source.");
      });
    };

    void load().catch(() => {
      if (!cancelled) {
        setWaiting(false);
        setError("NOVA could not initialize this video source.");
      }
    });

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", startPlayback);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [applySubtitle, autoplay, source]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      const nextTime = video.currentTime || 0;
      const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;
      currentTimeRef.current = nextTime;
      setCurrentTime(nextTime);
      setDuration(nextDuration);
      if (nextDuration > 0) onProgress(nextTime, nextDuration);
    };
    const updateBuffered = () => {
      if (!video.duration || !video.buffered.length) return setBuffered(0);
      setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
    };
    const handlePlay = () => {
      setPlaying(true);
      setWaiting(false);
    };
    const handlePause = () => {
      setPlaying(false);
      setControlsVisible(true);
    };
    const handleVolume = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };
    const handleWaiting = () => setWaiting(true);
    const handleCanPlay = () => setWaiting(false);
    const handleEnded = () => {
      setPlaying(false);
      onEnded(video.duration || 0);
    };

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("durationchange", updateTime);
    video.addEventListener("progress", updateBuffered);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("playing", handlePlay);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("volumechange", handleVolume);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("durationchange", updateTime);
      video.removeEventListener("progress", updateBuffered);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("playing", handlePlay);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("volumechange", handleVolume);
      video.removeEventListener("ended", handleEnded);
    };
  }, [onEnded, onProgress]);

  useEffect(() => {
    const handleFullscreen = () => setIsFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  useEffect(() => () => {
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
  }, []);

  async function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) await video.play().catch(() => undefined);
    else video.pause();
    showControls();
  }

  function seekTo(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(0, seconds), video.duration || 0);
    currentTimeRef.current = video.currentTime;
    showControls();
  }

  function changeVolume(nextVolume: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = nextVolume;
    video.muted = false;
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }

  async function toggleFullscreen() {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.requestFullscreen({ navigationUI: "hide" });
    } catch {
      setError("Fullscreen is unavailable on this device.");
    }
  }

  async function togglePictureInPicture() {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      // Device policy can disable picture-in-picture.
    }
  }

  function handleQuality(value: string) {
    if (value.startsWith("source:")) {
      currentTimeRef.current = videoRef.current?.currentTime || currentTimeRef.current;
      setActiveSourceIndex(Number(value.slice(7)));
      return;
    }
    const level = Number(value);
    setSelectedLevel(level);
    if (hlsRef.current) hlsRef.current.currentLevel = level;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (["INPUT", "SELECT", "BUTTON"].includes(target.tagName)) return;
    if (event.key === " " || event.key.toLowerCase() === "k") {
      event.preventDefault();
      void togglePlay();
    } else if (event.key === "ArrowLeft" || event.key.toLowerCase() === "j") {
      event.preventDefault();
      seekTo(currentTimeRef.current - 10);
    } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "l") {
      event.preventDefault();
      seekTo(currentTimeRef.current + 10);
    } else if (event.key.toLowerCase() === "m") {
      toggleMute();
    } else if (event.key.toLowerCase() === "f") {
      void toggleFullscreen();
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const rangeStyle = {
    "--played": `${progress}%`,
    "--buffered": `${Math.max(progress, buffered)}%`,
  } as CSSProperties;
  const qualityValue = qualityLevels.length
    ? String(selectedLevel)
    : `source:${activeSourceIndex}`;

  return (
    <section
      className={`player-shell nova-player${controlsVisible ? " controls-visible" : ""}`}
      ref={shellRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerMove={showControls}
      onPointerDown={showControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      aria-label={`${title} NOVA player`}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        onClick={() => void togglePlay()}
      >
        {manifest.subtitles.map((track) => (
          <track
            key={`${track.language}-${track.url}`}
            kind="subtitles"
            src={track.url}
            srcLang={track.language}
            label={track.label}
          />
        ))}
      </video>

      <div className="player-brand" aria-hidden="true">
        <strong>NOVA</strong>
        <span>{source.label}</span>
      </div>

      {waiting ? (
        <div className="player-loader">
          <LoadingSpinner label="Buffering video" />
          <p>Preparing the clean stream…</p>
        </div>
      ) : null}

      {error ? (
        <div className="player-error-state" role="alert">
          <p className="eyebrow">Playback interrupted</p>
          <strong>{error}</strong>
          <button type="button" onClick={() => window.location.reload()}>Retry source</button>
        </div>
      ) : null}

      {!playing && !waiting && !error ? (
        <button className="player-center-play" type="button" onClick={() => void togglePlay()} aria-label="Play">
          <PlayIcon />
        </button>
      ) : null}

      <div className="nova-player-controls" aria-hidden={!controlsVisible}>
        <input
          className="player-progress"
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          style={rangeStyle}
          onChange={(event) => seekTo(Number(event.target.value))}
          aria-label="Seek through movie"
        />

        <div className="player-control-row">
          <button type="button" onClick={() => void togglePlay()} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button type="button" onClick={() => seekTo(currentTime - 10)} aria-label="Back 10 seconds">
            <RewindIcon />
          </button>
          <button type="button" onClick={() => seekTo(currentTime + 10)} aria-label="Forward 10 seconds">
            <ForwardIcon />
          </button>
          <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
            {muted || volume === 0 ? <MutedIcon /> : <VolumeIcon />}
          </button>
          <input
            className="player-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={(event) => changeVolume(Number(event.target.value))}
            aria-label="Volume"
          />
          <span className="player-time">{formatTime(currentTime)} / {formatTime(duration)}</span>

          <span className="player-control-spacer" />

          {manifest.subtitles.length ? (
            <label className="player-select-control" title="Subtitles">
              <CaptionsIcon />
              <select
                value={selectedSubtitle}
                onChange={(event) => setSelectedSubtitle(Number(event.target.value))}
                aria-label="Subtitles"
              >
                <option value={-1}>Off</option>
                {manifest.subtitles.map((track, index) => (
                  <option key={`${track.language}-${track.url}`} value={index}>{track.label}</option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="player-select-control player-quality-control" title="Quality">
            <select value={qualityValue} onChange={(event) => handleQuality(event.target.value)} aria-label="Quality">
              {qualityLevels.length ? (
                <>
                  <option value={-1}>Auto</option>
                  {qualityLevels.map((level) => (
                    <option key={level.index} value={level.index}>{level.label}</option>
                  ))}
                </>
              ) : manifest.sources.map((streamSource, index) => (
                <option key={`${streamSource.url}-${index}`} value={`source:${index}`}>
                  {streamSource.quality || streamSource.label}
                </option>
              ))}
            </select>
          </label>

          <button type="button" onClick={() => void togglePictureInPicture()} aria-label="Picture in picture">
            <PictureInPictureIcon />
          </button>
          <button type="button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
            {isFullscreen ? <MinimizeIcon /> : <FullscreenIcon />}
          </button>
        </div>
      </div>
    </section>
  );
}
