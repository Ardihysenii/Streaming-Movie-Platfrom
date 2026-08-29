"use client";

import { CloseIcon } from "./Icons";
import { useNovaSettings } from "./Providers";
import type { AccentName, DensityName } from "@/lib/types";

const accentOptions: { value: AccentName; label: string; color: string }[] = [
  { value: "signal", label: "Signal red", color: "#e21d2f" },
  { value: "cobalt", label: "Cobalt", color: "#4e72ff" },
  { value: "sage", label: "Sage", color: "#91ad9a" },
];

export function SettingsPanel() {
  const { settings, updateSettings, settingsOpen, setSettingsOpen } = useNovaSettings();

  return (
    <div className={`settings-layer${settingsOpen ? " is-open" : ""}`} aria-hidden={!settingsOpen}>
      <button
        className="settings-backdrop"
        aria-label="Close settings"
        onClick={() => setSettingsOpen(false)}
        tabIndex={settingsOpen ? 0 : -1}
      />
      <aside className="settings-panel" aria-label="NOVA settings">
        <header>
          <div>
            <p className="eyebrow">Personalize NOVA</p>
            <h2>Settings</h2>
          </div>
          <button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
            <CloseIcon />
          </button>
        </header>

        <section className="settings-section">
          <div className="setting-heading">
            <div>
              <h3>Accent color</h3>
              <p>Used sparingly for controls and progress.</p>
            </div>
          </div>
          <div className="swatch-options">
            {accentOptions.map((option) => (
              <button
                className={settings.accent === option.value ? "is-selected" : ""}
                key={option.value}
                onClick={() => updateSettings({ accent: option.value })}
              >
                <span style={{ backgroundColor: option.color }} />
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <div className="setting-heading">
            <div>
              <h3>Layout density</h3>
              <p>Choose how much artwork is visible at once.</p>
            </div>
          </div>
          <div className="segmented-control">
            {(["cinematic", "compact"] as DensityName[]).map((density) => (
              <button
                className={settings.density === density ? "is-selected" : ""}
                key={density}
                onClick={() => updateSettings({ density })}
              >
                {density}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section settings-list">
          <ToggleSetting
            title="Rotate featured movies"
            description="Automatically cycle through the weekly top 10."
            checked={settings.autoplayHero}
            onChange={(checked) => updateSettings({ autoplayHero: checked })}
          />
          <label className="select-setting">
            <span>
              <strong>Hero timing</strong>
              <small>Time before the next featured movie.</small>
            </span>
            <select
              value={settings.heroInterval}
              onChange={(event) => updateSettings({ heroInterval: Number(event.target.value) })}
            >
              <option value={5}>5 seconds</option>
              <option value={8}>8 seconds</option>
              <option value={12}>12 seconds</option>
              <option value={16}>16 seconds</option>
            </select>
          </label>
          <ToggleSetting
            title="Autoplay player"
            description="Ask the video provider to begin playback automatically."
            checked={settings.autoplayPlayer}
            onChange={(checked) => updateSettings({ autoplayPlayer: checked })}
          />
          <label className="select-setting">
            <span>
              <strong>Subtitle language</strong>
              <small>Preselected when the source provides it.</small>
            </span>
            <select
              value={settings.subtitleLanguage}
              onChange={(event) => updateSettings({ subtitleLanguage: event.target.value })}
            >
              <option value="en">English</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="it">Italian</option>
              <option value="pl">Polish</option>
              <option value="sq">Albanian</option>
            </select>
          </label>
          <ToggleSetting
            title="Reduce motion"
            description="Minimize large transitions and hero movement."
            checked={settings.reduceMotion}
            onChange={(checked) => updateSettings({ reduceMotion: checked })}
          />
          <ToggleSetting
            title="Film texture"
            description="Adds a subtle grain layer over cinematic artwork."
            checked={settings.showFilmGrain}
            onChange={(checked) => updateSettings({ showFilmGrain: checked })}
          />
        </section>

        <section className="settings-note">
          <strong>About playback quality</strong>
          <p>
            NOVA cannot force a resolution from outside an embedded provider. Quality remains source-controlled;
            choose it inside the player whenever the source exposes that control.
          </p>
        </section>
      </aside>
    </div>
  );
}

function ToggleSetting({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-setting">
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}
