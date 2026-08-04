"use client";

import { Check, Clock, UserCircle } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useState } from "react";
import { api } from "@convex/_generated/api";

export function SettingsPanel() {
  const settings = useQuery(api.owner.getSettings);
  const saveSettings = useMutation(api.owner.saveSettings);
  const [editedDisplayName, setEditedDisplayName] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const displayName = editedDisplayName ?? settings?.displayName ?? "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState("saving");
    try {
      await saveSettings({ displayName });
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return (
    <form className="settings-card" onSubmit={submit}>
      <div className="settings-row">
        <div className="settings-row-icon"><UserCircle weight="duotone" aria-hidden="true" /></div>
        <div>
          <label className="field-label" htmlFor="owner-display-name">Display name</label>
          <p className="field-help">Shown as the sender on recipient invitations.</p>
        </div>
        <input
          id="owner-display-name"
          className="text-input settings-control"
          value={displayName}
          onChange={(event) => { setEditedDisplayName(event.target.value); setState("idle"); }}
          placeholder="Your name"
          maxLength={80}
          required
        />
      </div>
      <div className="settings-row">
        <div className="settings-row-icon"><Clock weight="duotone" aria-hidden="true" /></div>
        <div>
          <span className="field-label">Timezone</span>
          <p className="field-help">Fixed for MVP. Exact times are stored with this context.</p>
        </div>
        <span className="settings-value">Asia/Ho_Chi_Minh</span>
      </div>
      <div className="settings-actions">
        <span className="save-state" role="status">
          {state === "saved" ? <><Check weight="bold" /> Saved</> : null}
          {state === "error" ? "Could not save. Try again." : null}
        </span>
        <button className="button button-primary" type="submit" disabled={state === "saving" || !displayName.trim()}>
          {state === "saving" ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
