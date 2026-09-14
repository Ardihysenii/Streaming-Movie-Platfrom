"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type IntroStage = "brand" | "invite" | "name" | "greeting" | "returning";

const INTRO_KEY = "montana:intro-completed";
const NAME_KEY = "montana:user-name";
const AUDIO_SRC = "/audio/montana-intro.mpga";
const FILM_FRAMES = ["MONTANA", "NOW PLAYING", "FEATURED", "REEL 01", "CINEMA", "THE NIGHT SHOW"];

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
    <div className={`splash-screen montana-intro montana-intro-${stage}${leaving ? " is-leaving" : ""}`} aria-label="MONTANA introduction">
      <div className="montana-intro-backdrop" aria-hidden="true">
        <div className="intro-film-strip intro-film-strip-top">
          {[...FILM_FRAMES, ...FILM_FRAMES].map((frame, index) => (
            <span className="intro-film-frame" key={`top-${frame}-${index}`}>{frame}</span>
          ))}
        </div>
        <div className="intro-film-strip intro-film-strip-bottom">
          {[...FILM_FRAMES, ...FILM_FRAMES].reverse().map((frame, index) => (
            <span className="intro-film-frame" key={`bottom-${frame}-${index}`}>{frame}</span>
          ))}
        </div>
        <div className="intro-light-sweep" />
      </div>
      <div className="montana-intro-scrim" aria-hidden="true" />

      {stage === "brand" || stage === "invite" ? (
        <div className="montana-branding">
          <p className="montana-intro-kicker">A new world of cinema</p>
          <div className="splash-mark montana-logo" aria-label="MONTANA">
            {[..."MONTANA"].map((letter, index) => (
              <span key={`${letter}-${index}`} style={{ animationDelay: `${index * 120}ms` }}>{letter}</span>
            ))}
          </div>
          <div className="splash-line" />
          {stage === "invite" ? (
            <div className="montana-invite">
              <p>Stories begin when you step inside.</p>
              <button className="cinema-button" type="button" onClick={enterCinema}>
                <span>Enter the Cinema</span>
                <span className="cinema-button-arrow" aria-hidden="true">→</span>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {stage === "name" ? (
        <form className="montana-name-card" onSubmit={submitName}>
          <p className="montana-intro-kicker">Before the opening scene</p>
          <h1>What should we call you?</h1>
          <p className="montana-name-copy">Your cinema is ready. Tell us your name and make this world yours.</p>
          <label htmlFor="montana-name">Your name</label>
          <input autoFocus id="montana-name" name="name" onChange={(event) => setName(event.target.value)} placeholder="Enter your name" value={name} />
          <button className="cinema-button cinema-button-submit" type="submit">
            <span>Continue</span>
            <span className="cinema-button-arrow" aria-hidden="true">→</span>
          </button>
          {audioError ? <p className="montana-audio-note">The music could not start yet, but you can continue.</p> : null}
        </form>
      ) : null}

      {stage === "greeting" ? (
        <div className="montana-greeting">
          <p className="montana-intro-kicker">Welcome to MONTANA</p>
          <h1>{savedName}, your story starts now.</h1>
          <div className="greeting-rule" />
        </div>
      ) : null}

      {stage === "returning" ? (
        <div className="montana-greeting montana-returning-greeting">
          <p className="montana-intro-kicker">Welcome back to MONTANA</p>
          <h1>{savedName}</h1>
          <div className="greeting-rule" />
        </div>
      ) : null}
    </div>
  );
}
