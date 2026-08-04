"use client";

import { ArrowSquareOut, Check, MapPin, X } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import type { PlaceSnapshot } from "@/lib/domain/model";

const TAG_LABELS = { morning: "Buổi sáng", afternoon: "Buổi chiều", night: "Buổi tối", late: "Khuya" } as const;

export function PlaceDialog({ place, selected, onClose, onSelect }: { place: PlaceSnapshot | null; selected: boolean; onClose: () => void; onSelect: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (place && dialog && !dialog.open) dialog.showModal();
    if (!place && dialog?.open) dialog.close();
  }, [place]);

  if (!place) return null;

  return (
    <dialog className="place-dialog" ref={dialogRef} onClose={onClose} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="place-dialog-shell">
        <button className="place-dialog-close" type="button" aria-label="Đóng chi tiết địa điểm" onClick={onClose}><X weight="bold" /></button>
        <div className="place-dialog-cover">
          <Image src={place.coverImageUrl} alt={`Ảnh bìa ${place.name}`} fill priority sizes="(max-width: 700px) 100vw, 720px" unoptimized={place.coverImageUrl.startsWith("http")} />
        </div>
        <div className="place-dialog-content">
          <p className="recipient-overline">Chi tiết địa điểm</p>
          <h2>{place.name}</h2>
          <p className="place-address"><MapPin weight="fill" /> {place.address}</p>
          <div className="recipient-tags">{place.timeTags.map((tag) => <span key={tag}>{TAG_LABELS[tag]}</span>)}</div>
          {place.note ? <blockquote>{place.note}</blockquote> : null}
          {place.galleryImageUrls.length > 0 ? (
            <div className="place-gallery" aria-label="Ảnh địa điểm">
              {place.galleryImageUrls.map((url, index) => (
                <div className="place-gallery-image" key={url}>
                  <Image src={url} alt={`${place.name}, ảnh ${index + 1}`} fill sizes="(max-width: 700px) 80vw, 320px" loading="lazy" unoptimized={url.startsWith("http")} />
                </div>
              ))}
            </div>
          ) : null}
          <a className="maps-link" href={place.mapsUrl} target="_blank" rel="noreferrer"><ArrowSquareOut weight="bold" /> Mở trong Google Maps</a>
        </div>
        <div className="place-dialog-actions">
          <button className="recipient-button recipient-button-primary" type="button" onClick={onSelect}>
            {selected ? <Check weight="bold" /> : null}{selected ? "Đã chọn địa điểm này" : "Chọn địa điểm này"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
