"use client";

import { useEffect, useState } from "react";

const SPLASH_KEY = "nova:splash-shown";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(SPLASH_KEY)) {
      setVisible(false);
      return;
    }

    window.sessionStorage.setItem(SPLASH_KEY, "true");
    const leaveTimer = window.setTimeout(() => setLeaving(true), 1200);
    const hideTimer = window.setTimeout(() => setVisible(false), 1800);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`splash-screen${leaving ? " is-leaving" : ""}`} aria-label="NOVA is loading">
      <div className="splash-mark">
        <span>N</span>
        <span>O</span>
        <span>V</span>
        <span>A</span>
      </div>
      <div className="splash-line" />
    </div>
  );
}
