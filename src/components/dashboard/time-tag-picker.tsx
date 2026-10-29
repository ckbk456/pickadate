"use client";

import type { TimeTag } from "@/lib/domain/model";

const LABELS: Record<TimeTag, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  night: "Night",
  late: "Late",
};

export function TimeTagPicker({ value, onChange }: { value: TimeTag[]; onChange: (value: TimeTag[]) => void }) {
  return (
    <div className="tag-picker" aria-label="Suitable time of day">
      {(Object.keys(LABELS) as TimeTag[]).map((tag) => {
        const selected = value.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            className="tag-toggle"
            aria-pressed={selected}
            onClick={() => onChange(selected ? value.filter((item) => item !== tag) : [...value, tag])}
          >
            {LABELS[tag]}
          </button>
        );
      })}
    </div>
  );
}
