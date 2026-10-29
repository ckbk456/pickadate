"use client";

import { ArrowRight, SquaresFour } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { InvitationOptions } from "@/lib/domain/model";

const DEFAULT_COLORS = [
  { id: "terracotta", label: "Đất nung", hex: "#C97863" },
  { id: "sage", label: "Xanh lá dịu", hex: "#8EA283" },
  { id: "butter", label: "Vàng bơ", hex: "#E9C872" },
  { id: "lavender", label: "Tím lavender", hex: "#B9A2C2" },
  { id: "cream", label: "Kem", hex: "#EEDFC7" },
];

export function NewInvitation() {
  const catalog = useQuery(api.catalog.list, { includeArchived: false });
  const createDraft = useMutation(api.invitations.createDraft);
  const seedCatalog = useMutation(api.catalog.seedStarterCatalog);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!catalog) return;
    setBusy(true);
    setError(null);
    try {
      const options: InvitationOptions = {
        recipientName: "",
        slug: "",
        timezone: "Asia/Ho_Chi_Minh",
        slots: [],
        activities: catalog.activities.map((activity) => ({
          id: crypto.randomUUID(),
          catalogActivityId: activity._id,
          label: activity.label,
          description: activity.description,
          durationMinutes: activity.durationMinutes,
          timeTags: activity.timeTags,
          places: catalog.places
            .filter((place) => place.activityIds.includes(activity._id))
            .map((place) => ({
              id: crypto.randomUUID(),
              catalogPlaceId: place._id,
              name: place.name,
              address: place.address,
              mapsUrl: place.mapsUrl,
              note: place.note,
              timeTags: place.timeTags,
              coverImageUrl: place.coverImageUrl,
              galleryImageUrls: place.galleryImageUrls,
            })),
        })),
        colorModule: { enabled: true, presets: DEFAULT_COLORS },
        transportEnabled: true,
        acknowledgedOverrides: [],
      };
      const result = await createDraft({ options });
      router.replace(`/dashboard/invitations/${result.id}?builder=1`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the draft.");
      setBusy(false);
    }
  }

  if (!catalog) return <div className="panel-skeleton" aria-label="Loading catalog" />;

  const readyActivities = catalog.activities.filter((activity) => catalog.places.some((place) => place.activityIds.includes(activity._id)));
  return (
    <section className="dashboard-panel new-invitation-panel">
      <div className="new-invitation-copy">
        <p className="overline">Snapshot from your catalog</p>
        <h2>Begin with the options you already trust.</h2>
        <p>The draft receives its own copy. You can disable activities or places without changing your master catalog.</p>
        <dl><div><dt>{catalog.activities.length}</dt><dd>active activities</dd></div><div><dt>{catalog.places.length}</dt><dd>active places</dd></div><div><dt>{readyActivities.length}</dt><dd>ready activity sets</dd></div></dl>
      </div>
      <div className="new-invitation-action">
        {readyActivities.length === 0 ? <><SquaresFour size={32} weight="duotone" /><h3>Your catalog needs one complete pairing.</h3><p>Add an activity and at least one associated place first.</p><Link className="button button-secondary" href="/dashboard/activities">Open catalog</Link><button className="button button-quiet" type="button" onClick={() => void seedCatalog()}>Load starter placeholders</button></> : <><h3>Ready for the six-step builder</h3><p>You can still change every invitation-owned option before activation.</p><button className="button button-primary" type="button" disabled={busy} onClick={() => void start()}>{busy ? "Creating draft…" : "Start invitation"}<ArrowRight weight="bold" /></button></>}
        {error ? <p className="inline-error" role="alert">{error}</p> : null}
      </div>
    </section>
  );
}
