"use client";

import {
  Archive,
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  Clipboard,
  Clock,
  Copy,
  LinkSimple,
  MapPin,
  Plus,
  Prohibit,
  ShareNetwork,
  Trash,
  Warning,
  X,
} from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@convex/_generated/dataModel";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api } from "@convex/_generated/api";
import type { ActivitySnapshot, InvitationOptions, InvitationSlot, PlaceSnapshot } from "@/lib/domain/model";
import { getCompatibilityWarnings, validateActivation } from "@/lib/domain/validation";
import { PageHeader } from "./page-header";

type Invitation = FunctionReturnType<typeof api.invitations.get>;
type Catalog = FunctionReturnType<typeof api.catalog.list>;

const BUILDER_STEPS = ["Recipient", "Time", "Choices", "Extras", "Preview", "Readiness"];
const SLOT_LABELS = ["Sáng", "Chiều", "Tối", "Khuya"];
const COLOR_DEFAULTS = [
  { id: "terracotta", label: "Đất nung", hex: "#C97863" },
  { id: "sage", label: "Xanh lá dịu", hex: "#8EA283" },
  { id: "butter", label: "Vàng bơ", hex: "#E9C872" },
  { id: "lavender", label: "Tím lavender", hex: "#B9A2C2" },
  { id: "cream", label: "Kem", hex: "#EEDFC7" },
];

function localInputFromTimestamp(value: number) {
  return new Date(value + 7 * 60 * 60_000).toISOString().slice(0, 16);
}

function timestampFromLocalInput(value: string) {
  return new Date(`${value}:00+07:00`).getTime();
}

function defaultSlot(): InvitationSlot {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60_000);
  const date = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(tomorrow);
  return { id: crypto.randomUUID(), label: "Tối", startAt: timestampFromLocalInput(`${date}T18:00`), endAt: timestampFromLocalInput(`${date}T21:00`) };
}

function statusLabel(status: Invitation["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function InvitationDetail({ id }: { id: Id<"invitations"> }) {
  const invitation = useQuery(api.invitations.get, { id });
  const catalog = useQuery(api.catalog.list, { includeArchived: false });
  if (!invitation || !catalog) return <main className="dashboard-page"><div className="panel-skeleton" aria-label="Loading invitation" /></main>;

  return (
    <main className="dashboard-page">
      <PageHeader
        eyebrow="Invitation detail"
        title={invitation.options.recipientName || "Untitled invitation"}
        description={`${statusLabel(invitation.status)} · Revision ${invitation.revision} · ${invitation.options.timezone}`}
        action={<Link className="button button-secondary" href="/dashboard">Back to invitations</Link>}
      />
      {invitation.status === "draft" || invitation.status === "active" ? <InvitationBuilder invitation={invitation} catalog={catalog} /> : <ReadOnlyInvitation invitation={invitation} />}
    </main>
  );
}

function InvitationBuilder({ invitation, catalog }: { invitation: Invitation; catalog: Catalog }) {
  const saveDraft = useMutation(api.invitations.saveDraft);
  const activate = useMutation(api.invitations.activate);
  const rotate = useMutation(api.invitations.rotateLink);
  const cancel = useMutation(api.invitations.cancel);
  const [options, setOptions] = useState(invitation.options);
  const [step, setStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [operationError, setOperationError] = useState<string | null>(null);
  const [activationIssues, setActivationIssues] = useState<Array<{ path: string; message: string }>>([]);
  const revisionRef = useRef(invitation.revision);
  const optionsRef = useRef(options);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const origin = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "",
  );

  useEffect(() => {
    if (!dirty && saveState !== "saving" && invitation.revision > revisionRef.current) {
      revisionRef.current = invitation.revision;
      optionsRef.current = invitation.options;
      setOptions(invitation.options);
    }
  }, [dirty, invitation.options, invitation.revision, saveState]);

  function update(next: InvitationOptions | ((current: InvitationOptions) => InvitationOptions)) {
    setOptions((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      optionsRef.current = resolved;
      return resolved;
    });
    setDirty(true);
    setSaveState("saving");
  }

  const persist = useCallback((snapshot: InvitationOptions) => {
    const task = queueRef.current.then(async () => {
      setSaveState("saving");
      const result = await saveDraft({ id: invitation.id, expectedRevision: revisionRef.current, options: snapshot });
      revisionRef.current = result.revision;
      if (optionsRef.current === snapshot) {
        setDirty(false);
        setSaveState("saved");
      }
      return result.revision;
    });
    queueRef.current = task.catch(() => undefined);
    task.catch((caught) => {
      setSaveState("error");
      setOperationError(caught instanceof Error ? caught.message : "Autosave failed. Your local edits remain visible.");
    });
    return task;
  }, [invitation.id, saveDraft]);

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => void persist(options), 850);
    return () => window.clearTimeout(timer);
  }, [dirty, options, persist]);

  async function activateInvitation() {
    setOperationError(null);
    try {
      await persist(options);
      const result = await activate({ id: invitation.id, expectedRevision: revisionRef.current });
      if (!result.activated) {
        setActivationIssues(result.issues);
        return;
      }
      revisionRef.current = result.revision;
      setActivationIssues([]);
    } catch (caught) {
      setOperationError(caught instanceof Error ? caught.message : "Activation failed.");
    }
  }

  const compatibility = getCompatibilityWarnings(options);
  const clientIssues = validateActivation(options);
  const inviteUrl = invitation.publicToken && origin
    ? `${origin}/i/${invitation.publicToken}${options.slug ? `/${options.slug}` : ""}`
    : "";

  return (
    <div className="builder-stack">
      {invitation.status === "active" ? <ActiveLinkPanel invitation={invitation} inviteUrl={inviteUrl} onRotate={async () => { if (!window.confirm("Rotate this private link? The current link and saved recipient progress will stop working immediately.")) return; const result = await rotate({ id: invitation.id, expectedRevision: revisionRef.current, expectedLinkGeneration: invitation.linkGeneration }); await navigator.clipboard?.writeText(`${window.location.origin}/i/${result.publicToken}${options.slug ? `/${options.slug}` : ""}`); }} onCancel={async () => { if (!window.confirm("Cancel this active invitation? The recipient link will show an ended state.")) return; await cancel({ id: invitation.id, expectedRevision: revisionRef.current }); }} /> : null}

      <div className="builder-layout">
        <nav className="builder-rail" aria-label="Invitation builder">
          {BUILDER_STEPS.map((label, index) => <button key={label} type="button" aria-current={step === index ? "step" : undefined} onClick={() => setStep(index)}><span>{index < step ? <Check weight="bold" /> : index + 1}</span><em>{label}</em></button>)}
          <div className={`autosave-state save-${saveState}`} role="status">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save failed"}</div>
        </nav>

        <section className="builder-panel">
          {step === 0 ? <RecipientStep options={options} update={update} /> : null}
          {step === 1 ? <TimeStep options={options} update={update} /> : null}
          {step === 2 ? <ChoicesStep options={options} catalog={catalog} update={update} /> : null}
          {step === 3 ? <ExtrasStep options={options} update={update} /> : null}
          {step === 4 ? <PreviewStep invitationId={invitation.id} /> : null}
          {step === 5 ? <ReadinessStep options={options} clientIssues={clientIssues} activationIssues={activationIssues} compatibility={compatibility} active={invitation.status === "active"} update={update} activate={() => void activateInvitation()} /> : null}

          {operationError ? <p className="builder-error" role="alert">{operationError}</p> : null}
          <div className="builder-footer"><button className="button button-secondary" type="button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}><ArrowLeft /> Previous</button><button className="button button-primary" type="button" disabled={step === BUILDER_STEPS.length - 1} onClick={() => setStep((value) => Math.min(BUILDER_STEPS.length - 1, value + 1))}>Next <ArrowRight /></button></div>
        </section>
      </div>
    </div>
  );
}

function RecipientStep({ options, update }: BuilderStepProps) {
  return <BuilderSection number="01" title="Who is this for?" description="Only the display name and optional message appear on the invitation. The slug is decorative."><label className="field builder-field"><span className="field-label">Recipient display name</span><input className="text-input" value={options.recipientName} onChange={(event) => update({ ...options, recipientName: event.target.value })} placeholder="Their name" maxLength={100} /></label><label className="field builder-field"><span className="field-label">Personal message</span><textarea className="text-input text-area" value={options.message ?? ""} onChange={(event) => update({ ...options, message: event.target.value || undefined })} placeholder="A short note that sounds like you…" maxLength={2000} /></label><label className="field builder-field"><span className="field-label">Link alias</span><div className="input-with-prefix"><span>/i/credential/</span><input className="text-input" value={options.slug} onChange={(event) => update({ ...options, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/gu, "") })} placeholder="saturday-with-me" /></div><span className="field-help">Changing or removing the alias never changes which invitation the UUID opens.</span></label></BuilderSection>;
}

function TimeStep({ options, update }: BuilderStepProps) {
  function patchSlot(id: string, values: Partial<InvitationSlot>) { update({ ...options, slots: options.slots.map((slot) => slot.id === id ? { ...slot, ...values } : slot) }); }
  return <BuilderSection number="02" title="Offer the times you already know work." description="Friendly labels stay playful; exact start and end times keep Calendar honest."><div className="slot-editor-list">{options.slots.map((slot) => <div className="slot-editor" key={slot.id}><label><span>Friendly label</span><select value={slot.label} onChange={(event) => patchSlot(slot.id, { label: event.target.value })}>{SLOT_LABELS.map((label) => <option key={label}>{label}</option>)}</select></label><label><span>Starts</span><input type="datetime-local" value={localInputFromTimestamp(slot.startAt)} onChange={(event) => patchSlot(slot.id, { startAt: timestampFromLocalInput(event.target.value) })} /></label><label><span>Ends</span><input type="datetime-local" value={localInputFromTimestamp(slot.endAt)} onChange={(event) => patchSlot(slot.id, { endAt: timestampFromLocalInput(event.target.value) })} /></label><button className="icon-button" type="button" aria-label={`Remove ${slot.label} slot`} onClick={() => update({ ...options, slots: options.slots.filter((item) => item.id !== slot.id) })}><X /></button></div>)}</div><button className="button button-secondary" type="button" onClick={() => update({ ...options, slots: [...options.slots, defaultSlot()] })}><Plus weight="bold" /> Add allowed time</button><p className="builder-hint"><Clock weight="duotone" /> Times are stored as exact instants with Asia/Ho_Chi_Minh context. Past slots cannot activate or confirm.</p></BuilderSection>;
}

function ChoicesStep({ options, catalog, update }: BuilderStepProps & { catalog: Catalog }) {
  function snapshotActivity(activity: Catalog["activities"][number]): ActivitySnapshot { return { id: crypto.randomUUID(), catalogActivityId: activity._id, label: activity.label, description: activity.description, durationMinutes: activity.durationMinutes, timeTags: activity.timeTags, places: catalog.places.filter((place) => place.activityIds.includes(activity._id)).map(snapshotPlace) }; }
  function snapshotPlace(place: Catalog["places"][number]): PlaceSnapshot { return { id: crypto.randomUUID(), catalogPlaceId: place._id, name: place.name, address: place.address, mapsUrl: place.mapsUrl, note: place.note, timeTags: place.timeTags, coverImageUrl: place.coverImageUrl, galleryImageUrls: place.galleryImageUrls }; }
  return <BuilderSection number="03" title="Curate the choices for this person." description="Turn off an entire activity or only the places that do not fit this invitation. This edits the snapshot, not your catalog."><div className="choice-editor-list">{catalog.activities.map((catalogActivity) => { const selected = options.activities.find((item) => item.catalogActivityId === catalogActivity._id); const associatedPlaces = catalog.places.filter((place) => place.activityIds.includes(catalogActivity._id)); return <article className="choice-editor" key={catalogActivity._id}><label className="choice-editor-header"><input type="checkbox" checked={Boolean(selected)} disabled={!selected && associatedPlaces.length === 0} onChange={() => update({ ...options, activities: selected ? options.activities.filter((item) => item.id !== selected.id) : [...options.activities, snapshotActivity(catalogActivity)] })} /><span><strong>{catalogActivity.label}</strong><small>{catalogActivity.durationMinutes ? `${catalogActivity.durationMinutes} minutes` : "No duration"} · {associatedPlaces.length === 0 ? "add a place before enabling" : `${associatedPlaces.length} catalog places`}</small></span></label>{selected ? <div className="choice-place-toggles">{associatedPlaces.map((catalogPlace) => { const selectedPlace = selected.places.find((item) => item.catalogPlaceId === catalogPlace._id); return <label key={catalogPlace._id}><input type="checkbox" checked={Boolean(selectedPlace)} onChange={() => update({ ...options, activities: selectedPlace && selected.places.length === 1 ? options.activities.filter((item) => item.id !== selected.id) : options.activities.map((item) => item.id !== selected.id ? item : { ...item, places: selectedPlace ? item.places.filter((place) => place.id !== selectedPlace.id) : [...item.places, snapshotPlace(catalogPlace)] }) })} /><Image src={catalogPlace.coverImageUrl} alt="" width={52} height={40} unoptimized={catalogPlace.coverImageUrl.startsWith("http")} /><span>{catalogPlace.name}<small>{catalogPlace.address}</small></span></label>; })}</div> : null}</article>; })}</div></BuilderSection>;
}

function ExtrasStep({ options, update }: BuilderStepProps) {
  const presets = options.colorModule.presets.length > 0 ? options.colorModule.presets : COLOR_DEFAULTS;
  return <BuilderSection number="04" title="Add only the playful details you want." description="Both modules are optional. Transport never collects a pickup address."><label className="module-toggle"><input type="checkbox" checked={options.colorModule.enabled} onChange={(event) => update({ ...options, colorModule: { enabled: event.target.checked, presets } })} /><span><strong>Outfit color</strong><small>Recipient chooses a preset or asks the app to choose.</small></span></label>{options.colorModule.enabled ? <div className="dashboard-color-presets">{presets.map((color) => <label key={color.id}><input type="checkbox" checked={options.colorModule.presets.some((item) => item.id === color.id)} onChange={() => { const selected = options.colorModule.presets.some((item) => item.id === color.id); update({ ...options, colorModule: { enabled: true, presets: selected ? options.colorModule.presets.filter((item) => item.id !== color.id) : [...options.colorModule.presets, color] } }); }} /><i style={{ backgroundColor: color.hex }} /><span>{color.label}</span></label>)}</div> : null}<label className="module-toggle"><input type="checkbox" checked={options.transportEnabled} onChange={(event) => update({ ...options, transportEnabled: event.target.checked })} /><span><strong>Pickup or meet there</strong><small>Recipient can choose pickup, meet there, or decide together.</small></span></label></BuilderSection>;
}

function PreviewStep({ invitationId }: { invitationId: Id<"invitations"> }) {
  return <BuilderSection number="05" title="Preview the real mobile flow." description="This protected preview uses the recipient components but cannot activate, confirm, email, or call a provider."><div className="phone-preview"><div className="phone-preview-bar" /><iframe src={`/preview/${invitationId}`} title="Mobile recipient preview" /></div></BuilderSection>;
}

function ReadinessStep({ options, clientIssues, activationIssues, compatibility, active, update, activate }: BuilderStepProps & { clientIssues: ReturnType<typeof validateActivation>; activationIssues: Array<{ path: string; message: string }>; compatibility: ReturnType<typeof getCompatibilityWarnings>; active: boolean; activate: () => void }) {
  const combined = [...clientIssues, ...activationIssues.filter((item) => !clientIssues.some((existing) => existing.message === item.message))];
  return <BuilderSection number="06" title={active ? "This invitation is live." : "Make the link only when it is ready."} description={active ? "Every meaningful edit updates the open recipient page in realtime." : "Activation is one deliberate step. Any blocking issue remains a Draft."}>{compatibility.length > 0 ? <div className="readiness-warning"><Warning weight="duotone" /><div><strong>{compatibility.length} compatibility note{compatibility.length === 1 ? "" : "s"}</strong><p>Time-of-day tags and duration are guidance, not hard scheduling rules.</p><button className="button button-quiet" type="button" onClick={() => update({ ...options, acknowledgedOverrides: compatibility.map((item) => item.key) })}>Acknowledge all</button></div></div> : null}<div className="readiness-list">{combined.length === 0 ? <div className="readiness-ok"><Check weight="bold" /><div><strong>All readiness checks pass</strong><p>The invitation has a recipient, future time, one or more valid activity/place pairings, and complete optional modules.</p></div></div> : combined.map((issue, index) => <button type="button" key={`${issue.path}-${index}`} onClick={() => { const stepForPath: Record<string, number> = { recipient: 0, time: 1, plan: 2, extras: 3, review: 5 }; const target = stepForPath[issue.path]; if (target !== undefined) document.querySelectorAll<HTMLButtonElement>(".builder-rail button")[target]?.click(); }}><Warning /><span><strong>{issue.message}</strong><small>Open {issue.path}</small></span></button>)}</div>{!active ? <button className="button button-primary activate-button" type="button" disabled={combined.length > 0} onClick={activate}><LinkSimple weight="bold" /> Activate private link</button> : <p className="builder-hint"><Check weight="bold" /> Live editing is enabled until confirmation.</p>}</BuilderSection>;
}

function BuilderSection({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return <div className="builder-section"><p className="overline">Step {number}</p><h2>{title}</h2><p className="builder-description">{description}</p>{children}</div>;
}

type BuilderStepProps = { options: InvitationOptions; update: (next: InvitationOptions | ((current: InvitationOptions) => InvitationOptions)) => void };

function ActiveLinkPanel({ invitation, inviteUrl, onRotate, onCancel }: { invitation: Invitation; inviteUrl: string; onRotate: () => Promise<void>; onCancel: () => Promise<void> }) {
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(
    () => () => undefined,
    () => "share" in navigator,
    () => false,
  );
  return <section className="active-link-panel"><div><span className="status-badge status-active">Active</span><h2>Private link is live</h2><p>Edits publish in realtime until the recipient confirms.</p></div><div className="active-link-value"><LinkSimple /><span>{inviteUrl || "Preparing link…"}</span><button className="icon-button" type="button" aria-label="Copy private link" disabled={!inviteUrl} onClick={() => { void navigator.clipboard.writeText(inviteUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }}>{copied ? <Check /> : <Copy />}</button>{canShare ? <button className="icon-button" type="button" aria-label="Share private link" onClick={() => void navigator.share({ title: "Pick-a-Date", url: inviteUrl })}><ShareNetwork /></button> : null}</div><div className="active-link-actions"><button className="button button-secondary" type="button" onClick={() => void onRotate()}><ArrowCounterClockwise /> Rotate link</button><button className="button button-danger" type="button" onClick={() => void onCancel()}><Prohibit /> Cancel invitation</button></div><span className="link-generation">Generation {invitation.linkGeneration}</span></section>;
}

function ReadOnlyInvitation({ invitation }: { invitation: Invitation }) {
  const cancel = useMutation(api.invitations.cancel);
  const reopen = useMutation(api.invitations.reopenExpired);
  const setArchived = useMutation(api.invitations.setArchived);
  const erase = useMutation(api.invitations.erase);
  const router = useRouter();
  const [eraseText, setEraseText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const confirmation = invitation.confirmation;
  async function run(operation: () => Promise<unknown>) { setError(null); try { await operation(); } catch (caught) { setError(caught instanceof Error ? caught.message : "The operation failed."); } }
  return <div className="readonly-layout"><div className="readonly-main"><section className="dashboard-panel readonly-summary"><div className="readonly-status"><span className={`status-badge status-${invitation.status}`}>{statusLabel(invitation.status)}</span>{invitation.archivedAt ? <span className="status-badge status-archived">Archived</span> : null}</div>{confirmation ? <><div className="readonly-time"><CalendarCheck weight="duotone" /><div><p>{confirmation.slot.label}</p><h2>{new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(confirmation.slot.startAt)}</h2></div></div><div className="readonly-plan">{confirmation.planItems.map((item) => <article key={item.order}><div className="readonly-plan-image"><Image src={item.place.coverImageUrl} alt="" fill sizes="240px" unoptimized={item.place.coverImageUrl.startsWith("http")} /></div><div><p className="overline">Final plan</p><h3>{item.activity.label}</h3><strong>{item.place.name}</strong><span><MapPin /> {item.place.address}</span></div></article>)}</div></> : <div className="readonly-empty"><Clipboard weight="duotone" /><h2>No final plan exists.</h2><p>This invitation ended before recipient confirmation.</p></div>}</section><DeliveryPanel invitationId={invitation.id} /></div><aside className="dashboard-panel lifecycle-actions"><h2>Lifecycle actions</h2><p>Archived is only a dashboard filter. Permanent erasure revokes the link and removes invitation-owned personal data.</p>{invitation.status === "confirmed" ? <button className="button button-danger button-wide" type="button" onClick={() => { if (window.confirm("Cancel this confirmed plan? The recipient will see the cancellation and receive an email if they supplied one.")) void run(() => cancel({ id: invitation.id, expectedRevision: invitation.revision })); }}><Prohibit /> Mark cancelled</button> : null}{invitation.status === "expired" ? <button className="button button-secondary button-wide" type="button" onClick={() => void run(() => reopen({ id: invitation.id, expectedRevision: invitation.revision }))}><ArrowCounterClockwise /> Return to Draft</button> : null}<button className="button button-secondary button-wide" type="button" onClick={() => void run(() => setArchived({ id: invitation.id, expectedRevision: invitation.revision, archived: !invitation.archivedAt }))}>{invitation.archivedAt ? <ArrowCounterClockwise /> : <Archive />}{invitation.archivedAt ? "Restore from archive" : "Archive invitation"}</button><div className="erase-zone"><label><span>Type <code>ERASE INVITATION</code></span><input className="text-input" value={eraseText} onChange={(event) => setEraseText(event.target.value)} /></label><button className="button button-danger button-wide" type="button" disabled={eraseText !== "ERASE INVITATION"} onClick={() => { if (window.confirm("Permanently erase this invitation? This cannot be recovered.")) void run(async () => { await erase({ id: invitation.id, expectedRevision: invitation.revision, confirmationText: eraseText }); router.replace("/dashboard"); }); }}><Trash /> Permanently erase</button></div>{error ? <p className="inline-error" role="alert">{error}</p> : null}</aside></div>;
}

function DeliveryPanel({ invitationId }: { invitationId: Id<"invitations"> }) {
  const deliveries = useQuery(api.email.listForInvitation, { invitationId });
  const retry = useMutation(api.email.retryDelivery);
  if (!deliveries || deliveries.length === 0) return null;
  return <section className="dashboard-panel delivery-panel"><div className="panel-heading"><div><p className="overline">Transactional email</p><h2>Delivery</h2></div></div><div className="delivery-list">{deliveries.map((delivery) => <article key={delivery.id}><span className={`delivery-dot delivery-${delivery.status}`} /><div><strong>{delivery.eventType} · {delivery.audience}</strong><small>{delivery.status === "failed" ? delivery.lastError || "Terminal failure" : delivery.status === "pending" ? `Attempt ${delivery.attemptCount} pending` : "Accepted by Resend"}</small></div><span className={`status-badge status-${delivery.status === "delivered" ? "confirmed" : delivery.status === "failed" ? "cancelled" : "draft"}`}>{delivery.status}</span>{delivery.status === "failed" ? <button className="button button-quiet" type="button" onClick={() => void retry({ deliveryId: delivery.id })}>Retry</button> : null}</article>)}</div></section>;
}
