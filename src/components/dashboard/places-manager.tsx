"use client";

import { Archive, ArrowCounterClockwise, ImageSquare, MapPin, PencilSimple, Plus } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@convex/_generated/dataModel";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { api } from "@convex/_generated/api";
import type { TimeTag } from "@/lib/domain/model";
import { TimeTagPicker } from "./time-tag-picker";
import { MediaUploader } from "./media-uploader";

type Catalog = FunctionReturnType<typeof api.catalog.list>;
type Place = Catalog["places"][number];

const EMPTY = {
  name: "",
  address: "",
  mapsUrl: "",
  note: "",
  activityIds: [] as Id<"activities">[],
  timeTags: ["afternoon", "night"] as TimeTag[],
  coverImageUrl: "/images/places/ice-cream-pastel.jpg",
  galleryImageUrls: "",
};

export function PlacesManager() {
  const catalog = useQuery(api.catalog.list, { includeArchived: true });
  const savePlace = useMutation(api.catalog.savePlace);
  const setArchived = useMutation(api.catalog.setPlaceArchived);
  const seed = useMutation(api.catalog.seedStarterCatalog);
  const [editing, setEditing] = useState<Place | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function beginEdit(place?: Place) {
    setEditing(place ?? null);
    setForm(place ? {
      name: place.name,
      address: place.address,
      mapsUrl: place.mapsUrl,
      note: place.note ?? "",
      activityIds: place.activityIds,
      timeTags: place.timeTags,
      coverImageUrl: place.coverImageUrl,
      galleryImageUrls: place.galleryImageUrls.join("\n"),
    } : EMPTY);
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await savePlace({
        id: editing?._id,
        name: form.name,
        address: form.address,
        mapsUrl: form.mapsUrl,
        note: form.note || undefined,
        activityIds: form.activityIds,
        timeTags: form.timeTags,
        coverImageUrl: form.coverImageUrl,
        galleryImageUrls: form.galleryImageUrls.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean),
      });
      setEditing(null);
      setForm(EMPTY);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the place.");
    } finally {
      setBusy(false);
    }
  }

  if (!catalog) return <div className="panel-skeleton" aria-label="Loading places" />;
  const activeActivities = catalog.activities.filter((activity) => !activity.archivedAt);

  return (
    <div className="catalog-layout">
      <section className="catalog-list-panel" aria-labelledby="place-list-title">
        <div className="panel-heading">
          <div><h2 id="place-list-title">Your places</h2><p>{catalog.places.length} total, including archived</p></div>
          <button className="button button-secondary" type="button" onClick={() => beginEdit()}><Plus weight="bold" /> Add place</button>
        </div>
        {catalog.places.length === 0 ? (
          <div className="empty-panel">
            <MapPin size={34} weight="duotone" />
            <h3>Build a personal little black book</h3>
            <p>Add a place or load the placeholder set while your own photography is in progress.</p>
            <button className="button button-primary" type="button" onClick={() => void seed()}>Load starter catalog</button>
          </div>
        ) : (
          <div className="place-grid-dashboard">
            {catalog.places.map((place) => {
              const labels = catalog.activities.filter((activity) => place.activityIds.includes(activity._id)).map((activity) => activity.label);
              return (
                <article className="place-dashboard-card" key={place._id} data-archived={Boolean(place.archivedAt) || undefined}>
                  <div className="place-dashboard-image">
                    <Image src={place.coverImageUrl} alt="" fill sizes="(max-width: 900px) 100vw, 320px" />
                    {place.archivedAt ? <span className="status-badge status-archived">Archived</span> : null}
                  </div>
                  <div className="place-dashboard-copy">
                    <div><h3>{place.name}</h3><p>{place.address}</p></div>
                    <div className="catalog-meta">{labels.map((label) => <span key={label}>{label}</span>)}</div>
                    <div className="card-actions">
                      <button className="button button-quiet" type="button" onClick={() => beginEdit(place)}><PencilSimple /> Edit</button>
                      <button className="icon-button" type="button" aria-label={place.archivedAt ? `Restore ${place.name}` : `Archive ${place.name}`} onClick={() => void setArchived({ id: place._id, archived: !place.archivedAt })}>{place.archivedAt ? <ArrowCounterClockwise /> : <Archive />}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <form className="editor-panel" onSubmit={submit}>
        <div className="panel-heading"><div><p className="overline">{editing ? "Edit place" : "New place"}</p><h2>{editing?.name ?? "A place you would return to"}</h2></div></div>
        <div className="editor-image-preview"><Image src={form.coverImageUrl || "/images/places/ice-cream-pastel.jpg"} alt="Current cover preview" fill sizes="420px" /></div>
        <label className="field"><span className="field-label">Place name</span><input className="text-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} required /></label>
        <label className="field"><span className="field-label">Address</span><input className="text-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></label>
        <label className="field"><span className="field-label">Google Maps link</span><input className="text-input" type="url" value={form.mapsUrl} onChange={(e) => setForm({ ...form, mapsUrl: e.target.value })} placeholder="https://maps.google.com/…" required /></label>
        <label className="field"><span className="field-label">Your note</span><textarea className="text-input text-area" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={3} placeholder="Why this place works…" /></label>
        <fieldset className="field"><legend className="field-label">Associated activities</legend><div className="checkbox-stack">{activeActivities.map((activity) => { const checked = form.activityIds.includes(activity._id); return <label className="check-row" key={activity._id}><input type="checkbox" checked={checked} onChange={() => setForm({ ...form, activityIds: checked ? form.activityIds.filter((id) => id !== activity._id) : [...form.activityIds, activity._id] })} /><span>{activity.label}</span></label>; })}</div></fieldset>
        <fieldset className="field"><legend className="field-label">Suitable time of day</legend><TimeTagPicker value={form.timeTags} onChange={(timeTags) => setForm({ ...form, timeTags })} /></fieldset>
        <label className="field"><span className="field-label">Cover image path</span><div className="input-with-icon"><ImageSquare aria-hidden="true" /><input className="text-input" value={form.coverImageUrl} onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })} required /></div><span className="field-help">Placeholder paths work during catalog setup; optimized uploads are published as AVIF/WebP revisions.</span></label>
        <div className="field"><span className="field-label">Original photography</span><MediaUploader alt={form.name ? `${form.name} cover` : "Place cover"} onReady={({ coverUrl, galleryUrl }) => setForm((current) => ({ ...current, coverImageUrl: coverUrl, galleryImageUrls: [current.galleryImageUrls, galleryUrl].filter(Boolean).join("\n") }))} /></div>
        <label className="field"><span className="field-label">Gallery image paths</span><textarea className="text-input text-area mono-input" value={form.galleryImageUrls} onChange={(e) => setForm({ ...form, galleryImageUrls: e.target.value })} rows={3} placeholder="One image path per line" /></label>
        {error ? <p className="inline-error" role="alert">{error}</p> : null}
        <div className="form-actions"><button className="button button-secondary" type="button" onClick={() => { setEditing(null); setForm(EMPTY); }}>Clear</button><button className="button button-primary" type="submit" disabled={busy || !form.name.trim() || form.activityIds.length === 0}>{busy ? "Saving…" : "Save place"}</button></div>
      </form>
    </div>
  );
}
