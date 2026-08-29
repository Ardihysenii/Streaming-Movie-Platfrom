"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_SETTINGS, readSettings, writeSettings } from "@/lib/storage";
import type { NovaSettings } from "@/lib/types";

type SettingsContextValue = {
  settings: NovaSettings;
  updateSettings: (patch: Partial<NovaSettings>) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setSettings(readSettings());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = settings.accent;
    root.dataset.density = settings.density;
    root.dataset.motion = settings.reduceMotion ? "reduced" : "full";
    root.dataset.grain = settings.showFilmGrain ? "visible" : "hidden";
    writeSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<NovaSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings, settingsOpen, setSettingsOpen }),
    [settings, updateSettings, settingsOpen],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useNovaSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useNovaSettings must be used inside Providers");
  return context;
}
