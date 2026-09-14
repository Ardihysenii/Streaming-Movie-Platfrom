"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

type IntroStage = "brand" | "invite" | "name" | "greeting" | "returning";

const INTRO_KEY = "montana:intro-completed";
const NAME_KEY = "montana:user-name";
const AUDIO_SRC = "/audio/montana-intro.mpga";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [stage, setStage] = useState<IntroStage>("brand");
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let returningTimer: number | undefined;
    try {
      const storedName = window.localStorage.getItem(NAME_KEY)?.trim();
      if (window.localStorage.getItem(INTRO_KEY) === "true" && storedName) {
        setSavedName(storedName);
        setStage("returning");
        returningTimer = window.setTimeout(() => {
          setLeaving(true);
          window.setTimeout(() => setVisible(false), 850);
        }, 1800);
        return () => {
          if (returningTimer) window.clearTimeout(returningTimer);
        };
      }
    } catch {
      // Continue with the full intro when browser storage is unavailable.
    }

    const revealTimer = window.setTimeout(() => setStage("invite"), 3600);
    return () => window.clearTimeout(revealTimer);
  }, []);

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  const leaveIntro = () => {
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 850);
  };

  const enterCinema = async () => {
    if (!audioRef.current) {
      const audio = new Audio(AUDIO_SRC);
      audio.loop = true;
      audio.volume = 0.45;
      audioRef.current = audio;
    }

    try {
      await audioRef.current.play();
      setAudioError(false);
    } catch {
      setAudioError(true);
    }
    setStage("name");
  };

  const submitName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    try {
      window.localStorage.setItem(NAME_KEY, cleanName);
      window.localStorage.setItem(INTRO_KEY, "true");
    } catch {
      // The greeting still works for this visit when storage is unavailable.
    }

    setSavedName(cleanName);
    setStage("greeting");
    window.setTimeout(leaveIntro, 3000);
  };

  if (!visible) return null;

  return (
    <div className={"splash-screen montana-intro montana-intro-" + stage + (leaving ? " is-leaving" : "")} aria-label="MONTANA introduction">
      <div className="montana-intro-backdrop" aria-hidden="true">
        <div className="intro-grid" />
        <div className="intro-aperture"><span /></div>
        <div className="intro-frame-lines" />
        <div className="intro-light-sweep" />
        <p className="intro-timecode intro-timecode-left">MNT / 001</p>
        <p className="intro-timecode intro-timecode-right">24 FPS / 16:09</p>
      </div>
      <div className="montana-intro-scrim" aria-hidden="true" />

      {stage === "brand" || stage === "invite" ? (
        <div className="montana-branding">
          <div className="montana-index">01 <span>/</span> 04</div>
          <p className="montana-intro-kicker">A new world of cinema</p>
          <div className="splash-mark montana-logo" aria-label="MONTANA">
            {[..."MONTANA"].map((letter, index) => (
              <span key={letter + index} style={{ animationDelay: index * 110 + "ms" }}>{letter}</span>
            ))}
          </div>
          <div className="montana-logo-rule"><span>EST. 2026</span><i /></div>
          {stage === "invite" ? (
            <div className="montana-invite">
              <p>Stories begin when the house lights go down.</p>
              <button className="cinema-button" type="button" onClick={enterCinema}>
                <span className="cinema-button-index">01</span>
                <span>Begin screening</span>
                <span className="cinema-button-arrow" aria-hidden="true">↗</span>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {stage === "name" ? (
        <form className="montana-name-card" onSubmit={submitName}>
          <div className="montana-index">02 <span>/</span> 04</div>
          <p className="montana-intro-kicker">Audience registry</p>
          <h1>First name, please.</h1>
          <p className="montana-name-copy">Every great screening begins with an introduction.</p>
          <div className="montana-name-field">
            <label htmlFor="montana-name">Identification</label>
            <input autoFocus id="montana-name" name="name" onChange={(event) => setName(event.target.value)} placeholder="Type your name" value={name} />
          </div>
          <button className="cinema-button cinema-button-submit" type="submit">
            <span className="cinema-button-index">02</span>
            <span>Confirm identity</span>
            <span className="cinema-button-arrow" aria-hidden="true">↗</span>
          </button>
          {audioError ? <p className="montana-audio-note">The music could not start yet, but you can continue.</p> : null}
        </form>
      ) : null}

      {stage === "greeting" ? (
        <div className="montana-greeting">
          <div className="montana-index">03 <span>/</span> 04</div>
          <p className="montana-intro-kicker">Now showing</p>
          <h1><span>{savedName}</span><small>The house lights are down.</small></h1>
          <div className="greeting-rule"><span>ROLL CREDITS</span><i /></div>
        </div>
      ) : null}

      {stage === "returning" ? (
        <div className="montana-greeting montana-returning-greeting">
          <div className="montana-index">04 <span>/</span> 04</div>
          <p className="montana-intro-kicker">The screening continues</p>
          <h1><span>{savedName}</span><small>Welcome back to MONTANA.</small></h1>
          <div className="greeting-rule"><span>ROLL CREDITS</span><i /></div>
        </div>
      ) : null}
    </div>
  );
}
