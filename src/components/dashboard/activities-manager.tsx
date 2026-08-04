"use client";

import { Archive, ArrowCounterClockwise, Clock, PencilSimple, Plus, SquaresFour } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@convex/_generated/dataModel";
import { FormEvent, useState } from "react";
import { api } from "@convex/_generated/api";
import type { TimeTag } from "@/lib/domain/model";
import { TimeTagPicker } from "./time-tag-picker";

type Activity = FunctionReturnType<typeof api.catalog.list>["activities"][number];

const EMPTY = {
  label: "",
  description: "",
  durationMinutes: "90",
  timeTags: ["afternoon", "night"] as TimeTag[],
};

export function ActivitiesManager() {
  const catalog = useQuery(api.catalog.list, { includeArchived: true });
  const saveActivity = useMutation(api.catalog.saveActivity);
  const setArchived = useMutation(api.catalog.setActivityArchived);
  const seed = useMutation(api.catalog.seedStarterCatalog);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function beginEdit(activity?: Activity) {
    setEditing(activity ?? null);
    setForm(activity ? {
      label: activity.label,
      description: activity.description ?? "",
      durationMinutes: activity.durationMinutes?.toString() ?? "",
      timeTags: activity.timeTags,
    } : EMPTY);
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await saveActivity({
        id: editing?._id,
        label: form.label,
        description: form.description || undefined,
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
        timeTags: form.timeTags,
      });
      setEditing(null);
      setForm(EMPTY);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the activity.");
    } finally {
      setBusy(false);
    }
  }

  if (!catalog) return <div className="panel-skeleton" aria-label="Loading activities" />;

  return (
    <div className="catalog-layout">
      <section className="catalog-list-panel" aria-labelledby="activity-list-title">
        <div className="panel-heading">
          <div><h2 id="activity-list-title">Your activities</h2><p>{catalog.activities.length} total, including archived</p></div>
          <button className="button button-secondary" type="button" onClick={() => beginEdit()}><Plus weight="bold" /> Add activity</button>
        </div>
        {catalog.activities.length === 0 ? (
          <div className="empty-panel">
            <SquaresFour size={34} weight="duotone" />
            <h3>Start with your own shortlist</h3>
            <p>Add activities manually or load the warm placeholder catalog for development.</p>
            <button className="button button-primary" type="button" onClick={() => void seed()}>Load starter catalog</button>
          </div>
        ) : (
          <div className="catalog-rows">
            {catalog.activities.map((activity) => (
              <article className="catalog-row" key={activity._id} data-archived={Boolean(activity.archivedAt) || undefined}>
                <div className="catalog-row-icon"><SquaresFour weight="duotone" /></div>
                <div className="catalog-row-copy">
                  <div className="catalog-row-title"><h3>{activity.label}</h3>{activity.archivedAt ? <span className="status-badge status-archived">Archived</span> : null}</div>
                  <p>{activity.description || "No description yet."}</p>
                  <div className="catalog-meta">
                    {activity.durationMinutes ? <span><Clock /> {activity.durationMinutes} min</span> : null}
                    {activity.timeTags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                </div>
                <div className="row-actions">
                  <button className="icon-button" type="button" aria-label={`Edit ${activity.label}`} onClick={() => beginEdit(activity)}><PencilSimple /></button>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={activity.archivedAt ? `Restore ${activity.label}` : `Archive ${activity.label}`}
                    onClick={() => void setArchived({ id: activity._id as Id<"activities">, archived: !activity.archivedAt })}
                  >
                    {activity.archivedAt ? <ArrowCounterClockwise /> : <Archive />}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <form className="editor-panel" onSubmit={submit}>
        <div className="panel-heading"><div><p className="overline">{editing ? "Edit activity" : "New activity"}</p><h2>{editing?.label ?? "Something worth doing"}</h2></div></div>
        <label className="field"><span className="field-label">Activity name</span><input className="text-input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} maxLength={100} required /></label>
        <label className="field"><span className="field-label">Short invitation copy</span><textarea className="text-input text-area" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></label>
        <label className="field"><span className="field-label">Typical duration</span><div className="input-with-suffix"><input className="text-input" type="number" min={15} max={720} step={15} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} /><span>minutes</span></div><span className="field-help">Context only in MVP; it does not create an itinerary.</span></label>
        <fieldset className="field"><legend className="field-label">Suitable time of day</legend><TimeTagPicker value={form.timeTags} onChange={(timeTags) => setForm({ ...form, timeTags })} /></fieldset>
        {error ? <p className="inline-error" role="alert">{error}</p> : null}
        <div className="form-actions"><button className="button button-secondary" type="button" onClick={() => { setEditing(null); setForm(EMPTY); }}>Clear</button><button className="button button-primary" type="submit" disabled={busy || !form.label.trim()}>{busy ? "Saving…" : "Save activity"}</button></div>
      </form>
    </div>
  );
}
