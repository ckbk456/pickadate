import { describe, expect, it } from "vitest";
import { validateDimensions } from "./media";

const valid = [
  { format: "avif" as const, purpose: "thumbnail" as const, width: 480, height: 300 },
  { format: "webp" as const, purpose: "thumbnail" as const, width: 480, height: 300 },
  { format: "avif" as const, purpose: "card" as const, width: 1200, height: 750 },
  { format: "webp" as const, purpose: "card" as const, width: 1200, height: 750 },
  { format: "avif" as const, purpose: "detail" as const, width: 1600, height: 1000 },
  { format: "webp" as const, purpose: "detail" as const, width: 1600, height: 1000 },
];

describe("media variant dimensions", () => {
  it("accepts matching progressive AVIF/WebP dimensions", () => {
    expect(() => validateDimensions(valid)).not.toThrow();
  });

  it("rejects mismatched fallback dimensions", () => {
    const mismatched = valid.map((item) => ({ ...item }));
    mismatched[1] = { ...mismatched[1]!, width: 479 };
    expect(() => validateDimensions(mismatched)).toThrow(/matching dimensions/u);
  });

  it("rejects aspect ratio drift between purposes", () => {
    const drifted = valid.map((item) => ({ ...item }));
    drifted[4] = { ...drifted[4]!, height: 900 };
    drifted[5] = { ...drifted[5]!, height: 900 };
    expect(() => validateDimensions(drifted)).toThrow(/one aspect ratio/u);
  });
});
