"use client";

import { Check, ImageSquare, UploadSimple, Warning } from "@phosphor-icons/react";
import { useAction, useMutation } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { useRef, useState } from "react";
import { api } from "@convex/_generated/api";

type ReadyAsset = {
  state: "ready";
  variants: Array<{ format: "avif" | "webp"; purpose: "thumbnail" | "card" | "detail"; url: string | null }>;
};

export function MediaUploader({ alt, onReady }: { alt: string; onReady: (asset: { coverUrl: string; galleryUrl: string }) => void }) {
  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const beginUpload = useMutation(api.media.beginUpload);
  const processMedia = useAction(api.mediaProcessor.processAsset);
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "uploading" | "processing" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setState("uploading");
    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!uploadResponse.ok) throw new Error("The original image could not be uploaded.");
      const { storageId } = (await uploadResponse.json()) as { storageId: Id<"_storage"> };
      const mediaAssetId = await beginUpload({ sourceStorageId: storageId, alt: alt.trim() || "Place photograph" });
      setState("processing");
      const result = (await processMedia({ mediaAssetId })) as ReadyAsset;
      if (result.state !== "ready") throw new Error("The optimized image variants could not be published.");
      const coverUrl = result.variants.find((item) => item.purpose === "card" && item.format === "webp")?.url;
      const galleryUrl = result.variants.find((item) => item.purpose === "detail" && item.format === "webp")?.url;
      if (!coverUrl || !galleryUrl) throw new Error("Published image URLs are unavailable.");
      onReady({ coverUrl, galleryUrl });
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Image processing failed.");
      setState("error");
    }
  }

  return (
    <div className="media-uploader">
      <input ref={inputRef} type="file" accept="image/avif,image/heic,image/heif,image/jpeg,image/png,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} />
      <button className="button button-secondary" type="button" disabled={state === "uploading" || state === "processing"} onClick={() => inputRef.current?.click()}>
        {state === "ready" ? <Check weight="bold" /> : state === "error" ? <Warning weight="bold" /> : state === "idle" ? <UploadSimple weight="bold" /> : <ImageSquare weight="duotone" />}
        {state === "uploading" ? "Uploading source…" : state === "processing" ? "Creating AVIF + WebP…" : state === "ready" ? "Optimized image ready" : "Upload and optimize"}
      </button>
      <span>JPEG, PNG, HEIC, AVIF or WebP · source removed after six variants publish</span>
      {error ? <p className="inline-error" role="alert">{error}</p> : null}
    </div>
  );
}
