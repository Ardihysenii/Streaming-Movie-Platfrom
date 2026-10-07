"use client";

import Link from "next/link";
import { useState } from "react";
import { AgentIcon, ArrowRightIcon, CloseIcon } from "./Icons";
import { NovaAgentPanel } from "./NovaAgentPanel";
import { useNovaSettings } from "./Providers";

export function SettingsPanel() {
  const { settingsOpen, setSettingsOpen } = useNovaSettings();
  const [agentOpen, setAgentOpen] = useState(false);

  return (
    <>
      <div className={`settings-layer${settingsOpen ? " is-open" : ""}`} aria-hidden={!settingsOpen} inert={!settingsOpen}>
        <button className="settings-backdrop" aria-label="Close settings" onClick={() => setSettingsOpen(false)} tabIndex={settingsOpen ? 0 : -1} />
        <aside className="settings-panel settings-panel-minimal" aria-label="NIGHTOWL settings">
          <header>
            <div><p className="eyebrow">Your cinema tools</p><h2>Settings</h2></div>
            <button className="icon-button" type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><CloseIcon /></button>
          </header>
          <nav className="settings-tools" aria-label="Cinema tools">
            <button className="settings-tool-card" type="button" onClick={() => { setSettingsOpen(false); setAgentOpen(true); }} aria-label="Open NIGHTOWL AI" aria-haspopup="dialog" aria-expanded={agentOpen}>
              <span className="settings-tool-icon" aria-hidden="true"><AgentIcon /></span>
              <span className="settings-tool-copy"><strong>AI Agent</strong><small>Find your next great watch.</small></span>
              <span className="settings-tool-arrow" aria-hidden="true"><ArrowRightIcon /></span>
            </button>
            <Link className="settings-tool-card" href="/actors/" onClick={() => setSettingsOpen(false)}>
              <span className="settings-tool-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg></span>
              <span className="settings-tool-copy"><strong>Actors</strong><small>Explore the faces behind the films.</small></span>
              <span className="settings-tool-arrow" aria-hidden="true"><ArrowRightIcon /></span>
            </Link>
          </nav>
        </aside>
      </div>
      <NovaAgentPanel open={agentOpen} onClose={() => setAgentOpen(false)} />
    </>
  );
}
