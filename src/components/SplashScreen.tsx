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
    <div className={`splash-screen${leaving ? " is-leaving" : ""}`} aria-label="MONTANA is loading">
      <div className="splash-mark" aria-label="MONTANA">
        {[..."MONTANA"].map((letter, index) => (
          <span key={`${letter}-${index}`} style={{ animationDelay: `${index * 75}ms` }}>
            {letter}
          </span>
        ))}
      </div>
      <div className="splash-line" />
    </div>
  );
}
