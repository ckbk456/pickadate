"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  Check,
  Clock,
  EnvelopeSimple,
  MapPin,
  Shuffle,
  Sparkle,
  TShirt,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { buildGoogleCalendarUrl, transportLabel } from "@/lib/domain/calendar";
import { isValidEmail } from "@/lib/domain/validation";
import type { ActivitySnapshot, PlaceSnapshot, TransportOption } from "@/lib/domain/model";
import { PlaceDialog } from "./place-dialog";
import type { PublicActiveInvitation, PublicFinalInvitation, RecipientSelection } from "./types";
import { useRecipientDraft } from "./use-recipient-draft";

const STEPS = ["Mở lời mời", "Chọn giờ", "Chọn hoạt động", "Chọn địa điểm", "Thêm chút vui", "Xác nhận"];
const TIME_TAGS = { morning: "Sáng", afternoon: "Chiều", night: "Tối", late: "Khuya" } as const;
const TRANSPORT: Array<{ value: TransportOption; label: string; note: string }> = [
  { value: "pickup", label: "Đón mình nhé", note: "Mình sẽ nhắn địa điểm đón riêng." },
  { value: "meet-there", label: "Mình tự đến", note: "Hẹn nhau ngay tại địa điểm." },
  { value: "decide-later", label: "Mình bàn sau nhé", note: "Chốt qua tin nhắn hoặc cuộc gọi." },
];

function formatSlot(startAt: number, endAt: number) {
  const date = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Ho_Chi_Minh" }).format(startAt);
  const time = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" });
  return { date, time: `${time.format(startAt)} – ${time.format(endAt)}` };
}

function randomIndex(length: number) {
  if (length <= 1) return 0;
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] % length;
}

export function RecipientFlow({ token, invitation, onConfirm }: { token: string; invitation: PublicActiveInvitation; onConfirm: (selection: RecipientSelection) => Promise<void> }) {
  const { draft, setDraft, reconciliationNotice, clearNotice } = useRecipientDraft(token, invitation);
  const [now, setNow] = useState(() => Date.now());
  const [detailsPlace, setDetailsPlace] = useState<PlaceSnapshot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const slots = useMemo(() => invitation.options.slots.filter((slot) => slot.startAt > now), [invitation.options.slots, now]);
  const activity = invitation.options.activities.find((item) => item.id === draft.activityId);
  const place = activity?.places.find((item) => item.id === draft.placeId);
  const color = invitation.options.colorModule.presets.find((item) => item.id === draft.colorId);
  const slot = slots.find((item) => item.id === draft.slotId);
  const emailValid = draft.email.trim() === "" || isValidEmail(draft.email);
  const extrasValid = (!invitation.options.colorModule.enabled || Boolean(color)) && (!invitation.options.transportEnabled || Boolean(draft.transport)) && emailValid;
  const reviewValid = Boolean(slot && activity && place && extrasValid);

  function goTo(step: number) {
    setDraft((current) => ({ ...current, step: Math.max(0, Math.min(STEPS.length - 1, step)) }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function confirm() {
    if (!slot || !activity || !place || !reviewValid) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onConfirm({
        revision: invitation.revision,
        slotId: slot.id,
        activityId: activity.id,
        placeId: place.id,
        colorId: color?.id,
        transport: draft.transport,
        recipientEmail: draft.email.trim() || undefined,
        confirmationKey: draft.confirmationKey,
      });
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : "Chưa thể xác nhận. Các lựa chọn của bạn vẫn được giữ lại.");
      setSubmitting(false);
    }
  }

  if (slots.length === 0) return <RecipientUnavailable kind="ended" />;

  return (
    <main className="recipient-page" lang="vi">
      <header className="recipient-masthead">
        <div className="recipient-brand"><Sparkle weight="fill" /> Pick-a-Date</div>
        <p className="recipient-masthead-kicker">Một lời mời dành riêng cho</p>
        <h1>{invitation.options.recipientName}</h1>
        <p>{invitation.options.message || `${invitation.ownerName} muốn rủ bạn dành một khoảng thời gian thật vui cùng nhau.`}</p>
        <span className="recipient-signature">— {invitation.ownerName}</span>
      </header>

      <div className="recipient-workspace">
        <nav className="recipient-progress" aria-label="Tiến trình lời mời">
          {STEPS.map((label, index) => (
            <button key={label} type="button" aria-current={draft.step === index ? "step" : undefined} disabled={index > draft.step && !canVisit(index, draft.step, Boolean(slot), Boolean(activity), Boolean(place), extrasValid)} onClick={() => goTo(index)}>
              <span>{index < draft.step ? <Check weight="bold" /> : index + 1}</span>
              <em>{label}</em>
            </button>
          ))}
        </nav>

        <div className="recipient-stage">
          {reconciliationNotice ? <div className="recipient-live-notice" role="status"><span>{reconciliationNotice}</span><button type="button" onClick={clearNotice}>Đã hiểu</button></div> : null}

          {draft.step === 0 ? (
            <section className="recipient-step recipient-intro" aria-labelledby="recipient-intro-title">
              <p className="recipient-overline">Mình cùng chọn nhé</p>
              <h2 id="recipient-intro-title">Bạn chỉ cần chọn điều mình thích.</h2>
              <p>Thời gian và các gợi ý đều đã được chuẩn bị sẵn. Khi bạn xác nhận, buổi hẹn sẽ được chốt ngay.</p>
              <div className="intro-notes"><span><Clock weight="duotone" /> Giờ Việt Nam</span><span><EnvelopeSimple weight="duotone" /> Email hoàn toàn tùy chọn</span></div>
              <button className="recipient-button recipient-button-primary" type="button" onClick={() => goTo(1)}>Lên kế hoạch buổi hẹn <ArrowRight weight="bold" /></button>
            </section>
          ) : null}

          {draft.step === 1 ? (
            <StepSection overline="Bước 1" title="Khi nào mình gặp nhau?" description="Chọn một khung giờ đã có sẵn. Mỗi lựa chọn đều là giờ chính xác theo Asia/Ho_Chi_Minh.">
              <div className="slot-list">{slots.map((item) => { const formatted = formatSlot(item.startAt, item.endAt); const selected = draft.slotId === item.id; return (
                <button className="slot-choice" type="button" key={item.id} aria-pressed={selected} onClick={() => setDraft((current) => ({ ...current, slotId: item.id }))}>
                  <span className="choice-indicator">{selected ? <Check weight="bold" /> : null}</span>
                  <span className="slot-label">{item.label}</span>
                  <strong>{formatted.date}</strong>
                  <em>{formatted.time}</em>
                </button>
              ); })}</div>
              <StepActions back={() => goTo(0)} next={() => goTo(2)} nextDisabled={!slot} />
            </StepSection>
          ) : null}

          {draft.step === 2 ? (
            <StepSection overline="Bước 2" title="Bạn muốn làm gì?" description="Một hoạt động cho buổi hẹn đầu tiên. Thời lượng chỉ để bạn dễ hình dung.">
              <div className="activity-list">{invitation.options.activities.map((item, index) => <ActivityChoice key={item.id} activity={item} index={index} selected={draft.activityId === item.id} onSelect={() => setDraft((current) => ({ ...current, activityId: item.id, placeId: current.activityId === item.id ? current.placeId : undefined }))} />)}</div>
              <StepActions back={() => goTo(1)} next={() => goTo(3)} nextDisabled={!activity} />
            </StepSection>
          ) : null}

          {draft.step === 3 && activity ? (
            <StepSection overline="Bước 3" title={`Chọn nơi cho “${activity.label}”`} description="Mỗi địa điểm đều do người gửi tự chọn. Nhãn thời gian không thay thế giờ mở cửa — mình vẫn sẽ kiểm tra lại trước khi đi.">
              <div className="recipient-place-list">{activity.places.map((item, index) => { const selected = draft.placeId === item.id; return (
                <article className="recipient-place-card" key={item.id} data-selected={selected || undefined}>
                  <button className="place-select-hit" type="button" aria-label={`Chọn ${item.name}`} aria-pressed={selected} onClick={() => setDraft((current) => ({ ...current, placeId: item.id }))} />
                  <div className="recipient-place-image"><Image src={item.coverImageUrl} alt={`Ảnh bìa ${item.name}`} fill priority={index === 0} sizes="(max-width: 720px) 92vw, 660px" unoptimized={item.coverImageUrl.startsWith("http")} /></div>
                  <div className="recipient-place-copy">
                    <span className="choice-indicator">{selected ? <Check weight="bold" /> : null}</span>
                    <div><h3>{item.name}</h3><p><MapPin weight="fill" /> {item.address}</p><div className="recipient-tags">{item.timeTags.map((tag) => <span key={tag}>{TIME_TAGS[tag]}</span>)}</div></div>
                    <button className="place-details-button" type="button" onClick={(event) => { event.stopPropagation(); setDetailsPlace(item); }}>Xem chi tiết</button>
                  </div>
                </article>
              ); })}</div>
              <StepActions back={() => goTo(2)} next={() => goTo(4)} nextDisabled={!place} />
            </StepSection>
          ) : null}

          {draft.step === 4 ? (
            <StepSection overline="Bước 4" title="Thêm một chút vui" description="Những chi tiết này chỉ xuất hiện nếu có trong lời mời. Không cần chia sẻ địa chỉ đón.">
              {invitation.options.colorModule.enabled ? <fieldset className="recipient-fieldset"><legend><TShirt weight="duotone" /> Mình mặc màu gì?</legend><div className="color-choices">{invitation.options.colorModule.presets.map((item) => { const selected = draft.colorId === item.id; return <button key={item.id} type="button" className="color-choice" aria-pressed={selected} onClick={() => setDraft((current) => ({ ...current, colorId: item.id }))}><span className="color-swatch" style={{ backgroundColor: item.hex }} /><span>{item.label}</span>{selected ? <Check weight="bold" /> : null}</button>; })}</div><button className="recipient-inline-button" type="button" onClick={() => { const colors = invitation.options.colorModule.presets; const chosen = colors[randomIndex(colors.length)]; if (chosen) setDraft((current) => ({ ...current, colorId: chosen.id })); }}><Shuffle weight="bold" /> Chọn giúp mình</button></fieldset> : null}
              {invitation.options.transportEnabled ? <fieldset className="recipient-fieldset"><legend><MapPin weight="duotone" /> Mình gặp nhau thế nào?</legend><div className="transport-choices">{TRANSPORT.map((item) => { const selected = draft.transport === item.value; return <button key={item.value} type="button" className="transport-choice" aria-pressed={selected} onClick={() => setDraft((current) => ({ ...current, transport: item.value }))}><span className="choice-indicator">{selected ? <Check weight="bold" /> : null}</span><span><strong>{item.label}</strong><small>{item.note}</small></span></button>; })}</div></fieldset> : null}
              <label className="recipient-email-field"><span><EnvelopeSimple weight="duotone" /><strong>Gửi email xác nhận cho mình</strong><small>Không bắt buộc. Chỉ được gửi đi sau khi bạn nhấn xác nhận.</small></span><input type="email" inputMode="email" autoComplete="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="ban@example.com" aria-invalid={!emailValid || undefined} /></label>
              {!emailValid ? <p className="recipient-error" role="alert">Email này chưa đúng định dạng.</p> : null}
              <StepActions back={() => goTo(3)} next={() => goTo(5)} nextDisabled={!extrasValid} />
            </StepSection>
          ) : null}

          {draft.step === 5 && slot && activity && place ? (
            <StepSection overline="Cuối cùng" title="Mình chốt như thế này nhé?" description="Sau khi xác nhận, ngày giờ và kế hoạch sẽ được khóa. Nếu cần đổi, hai người sẽ trao đổi trực tiếp.">
              <div className="review-card"><ReviewRow label="Thời gian" value={`${slot.label} · ${formatSlot(slot.startAt, slot.endAt).date} · ${formatSlot(slot.startAt, slot.endAt).time}`} edit={() => goTo(1)} /><ReviewRow label="Hoạt động" value={activity.label} edit={() => goTo(2)} /><ReviewRow label="Địa điểm" value={`${place.name} · ${place.address}`} edit={() => goTo(3)} />{color ? <ReviewRow label="Màu trang phục" value={color.label} edit={() => goTo(4)} /> : null}{draft.transport ? <ReviewRow label="Di chuyển" value={transportLabel(draft.transport)} edit={() => goTo(4)} /> : null}{draft.email ? <ReviewRow label="Email xác nhận" value={draft.email} edit={() => goTo(4)} /> : null}</div>
              {submitError ? <p className="recipient-error" role="alert">{submitError}</p> : null}
              <div className="final-confirm-actions"><button className="recipient-button recipient-button-secondary" type="button" onClick={() => goTo(4)}><ArrowLeft weight="bold" /> Quay lại</button><button className="recipient-button recipient-button-primary" type="button" disabled={submitting} onClick={() => void confirm()}>{submitting ? "Đang xác nhận…" : "Xác nhận buổi hẹn"} {!submitting ? <Check weight="bold" /> : null}</button></div>
            </StepSection>
          ) : null}
        </div>
      </div>
      <PlaceDialog place={detailsPlace} selected={detailsPlace?.id === draft.placeId} onClose={() => setDetailsPlace(null)} onSelect={() => { if (detailsPlace) setDraft((current) => ({ ...current, placeId: detailsPlace.id })); setDetailsPlace(null); }} />
    </main>
  );
}

function canVisit(target: number, current: number, slot: boolean, activity: boolean, place: boolean, extras: boolean) {
  if (target <= current) return true;
  if (target >= 2 && !slot) return false;
  if (target >= 3 && !activity) return false;
  if (target >= 4 && !place) return false;
  if (target >= 5 && !extras) return false;
  return true;
}

function StepSection({ overline, title, description, children }: { overline: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="recipient-step"><p className="recipient-overline">{overline}</p><h2>{title}</h2><p className="recipient-step-description">{description}</p>{children}</section>;
}

function StepActions({ back, next, nextDisabled }: { back: () => void; next: () => void; nextDisabled?: boolean }) {
  return <div className="recipient-step-actions"><button className="recipient-button recipient-button-secondary" type="button" onClick={back}><ArrowLeft weight="bold" /> Quay lại</button><button className="recipient-button recipient-button-primary" type="button" onClick={next} disabled={nextDisabled}>Tiếp tục <ArrowRight weight="bold" /></button></div>;
}

function ActivityChoice({ activity, index, selected, onSelect }: { activity: ActivitySnapshot; index: number; selected: boolean; onSelect: () => void }) {
  const accents = ["sage", "butter", "lavender"];
  return <button className="activity-choice" data-accent={accents[index % accents.length]} type="button" aria-pressed={selected} onClick={onSelect}><span className="choice-indicator">{selected ? <Check weight="bold" /> : null}</span><span><strong>{activity.label}</strong><small>{activity.description || "Một gợi ý đã được chuẩn bị riêng cho buổi hẹn."}</small>{activity.durationMinutes ? <em><Clock weight="bold" /> Khoảng {activity.durationMinutes} phút</em> : null}</span></button>;
}

function ReviewRow({ label, value, edit }: { label: string; value: string; edit: () => void }) {
  return <div className="review-row"><div><span>{label}</span><strong>{value}</strong></div><button type="button" onClick={edit}>Sửa</button></div>;
}

export function RecipientFinalCard({ invitation, invitationUrl }: { invitation: PublicFinalInvitation; invitationUrl: string }) {
  const item = invitation.confirmation.planItems[0];
  const cancelled = invitation.kind === "cancelled-confirmed";
  if (!item) return <RecipientUnavailable kind="unavailable" />;
  const formatted = formatSlot(invitation.confirmation.slot.startAt, invitation.confirmation.slot.endAt);
  const calendarUrl = cancelled ? null : buildGoogleCalendarUrl(invitation.confirmation, { audience: "recipient", ownerName: invitation.ownerName, recipientName: invitation.recipientName, invitationUrl });
  return <main className="recipient-final-page" lang="vi"><section className="final-masthead" data-cancelled={cancelled || undefined}><div className="recipient-brand"><Sparkle weight="fill" /> Pick-a-Date</div><p>{cancelled ? "Cập nhật về buổi hẹn" : "Vậy là mình có hẹn rồi"}</p><h1>{cancelled ? "Buổi hẹn này đã được hủy." : `Hẹn gặp ${invitation.recipientName} nhé.`}</h1></section><section className="date-card"><p className="recipient-overline">{cancelled ? "Kế hoạch trước khi hủy" : "Kế hoạch đã chốt"}</p><div className="date-card-time"><span>{invitation.confirmation.slot.label}</span><strong>{formatted.date}</strong><em>{formatted.time}</em></div><div className="date-card-place"><div className="date-card-image"><Image src={item.place.coverImageUrl} alt={`Ảnh bìa ${item.place.name}`} fill priority sizes="(max-width: 700px) 100vw, 600px" unoptimized={item.place.coverImageUrl.startsWith("http")} /></div><div><h2>{item.activity.label}</h2><h3>{item.place.name}</h3><p><MapPin weight="fill" /> {item.place.address}</p><a href={item.place.mapsUrl} target="_blank" rel="noreferrer">Mở Google Maps</a></div></div>{invitation.confirmation.color || invitation.confirmation.transport ? <div className="date-card-extras">{invitation.confirmation.color ? <span><i style={{ backgroundColor: invitation.confirmation.color.hex }} /> Màu {invitation.confirmation.color.label}</span> : null}{invitation.confirmation.transport ? <span><MapPin /> {transportLabel(invitation.confirmation.transport)}</span> : null}</div> : null}{calendarUrl ? <a className="recipient-button recipient-button-primary recipient-calendar-button" href={calendarUrl} target="_blank" rel="noreferrer"><CalendarPlus weight="bold" /> Thêm vào Google Calendar</a> : <p className="cancelled-note">Nút lịch đã được gỡ vì kế hoạch này không còn hiệu lực. Hai bạn có thể tạo một lời mời mới khi sẵn sàng.</p>}</section></main>;
}

export function RecipientUnavailable({ kind }: { kind: "ended" | "unavailable" }) {
  return <main className="recipient-unavailable" lang="vi"><div className="recipient-brand"><Sparkle weight="fill" /> Pick-a-Date</div><section><p className="recipient-overline">{kind === "ended" ? "Lời mời đã khép lại" : "Chưa thể mở lời mời"}</p><h1>{kind === "ended" ? "Khung giờ này không còn nữa." : "Đường dẫn này không còn khả dụng."}</h1><p>{kind === "ended" ? "Bạn có thể nhắn trực tiếp cho người gửi để cùng chọn một dịp khác." : "Hãy kiểm tra lại đường dẫn hoặc liên hệ trực tiếp với người gửi."}</p></section></main>;
}
