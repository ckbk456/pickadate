"use client";

import { CalendarBlank, CheckCircle, ClockCountdown, Sparkle } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";

type InvitationSummary = FunctionReturnType<typeof api.invitations.list>[number];

const STATUS_LABELS = { draft: "Draft", active: "Active", confirmed: "Confirmed", expired: "Expired", cancelled: "Cancelled" } as const;

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(value);
}

export function InvitationsOverview() {
  const invitations = useQuery(api.invitations.list, { includeArchived: false });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!invitations) return <div className="panel-skeleton" aria-label="Loading invitations" />;

  const operational = invitations.filter((item) => item.status === "active" || item.status === "draft");
  const upcoming = invitations.filter((item) => item.status === "confirmed" && (item.confirmedSlot?.endAt ?? 0) > now);
  const history = invitations.filter((item) => !operational.includes(item) && !upcoming.includes(item));

  if (invitations.length === 0) {
    return (
      <section className="dashboard-panel invitation-empty">
        <div className="empty-visual"><Sparkle weight="fill" /></div>
        <p className="overline">Nothing to manage yet</p>
        <h2>Create your first private invitation.</h2>
        <p>Start with a recipient, add the times you are genuinely free, then choose which activities and places they can see.</p>
        <Link className="button button-primary" href="/dashboard/invitations/new">Create invitation</Link>
      </section>
    );
  }

  return (
    <div className="invitation-groups">
      <InvitationGroup title="In progress" description="Drafts and links your guest can currently use." items={operational} icon={<ClockCountdown weight="duotone" />} />
      <InvitationGroup title="Upcoming" description="Confirmed plans that have not ended yet." items={upcoming} icon={<CheckCircle weight="duotone" />} />
      <InvitationGroup title="History" description="Expired, cancelled, and past confirmed invitations." items={history} icon={<CalendarBlank weight="duotone" />} />
    </div>
  );
}

function InvitationGroup({ title, description, items, icon }: { title: string; description: string; items: InvitationSummary[]; icon: React.ReactNode }) {
  return (
    <section className="dashboard-panel invitation-group">
      <header><span>{icon}</span><div><h2>{title}</h2><p>{description}</p></div><strong>{items.length}</strong></header>
      {items.length === 0 ? <p className="group-empty">No invitations here.</p> : <div className="invitation-table">{items.map((item) => <Link className="invitation-table-row" href={`/dashboard/invitations/${item.id}`} key={item.id}><div><span className={`status-badge status-${item.status}`}>{STATUS_LABELS[item.status]}</span>{item.archivedAt ? <span className="status-badge status-archived">Archived</span> : null}</div><strong>{item.recipientName || "Unnamed recipient"}</strong><span>{item.status === "confirmed" && item.confirmedSlot ? formatDate(item.confirmedSlot.startAt) : `${item.slotCount} future slot${item.slotCount === 1 ? "" : "s"}`}</span><time dateTime={new Date(item.updatedAt).toISOString()}>Updated {formatDate(item.updatedAt)}</time></Link>)}</div>}
    </section>
  );
}
