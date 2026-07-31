import { StickyNote } from "lucide-react";

import type { BoundingBox, HighlightBox } from "../reading-assistant.types";

type HighlightLayerProps = {
  activeHighlightId?: string | null;
  highlights: HighlightBox[];
  interactive?: boolean;
  onHighlightClick: (highlight: HighlightBox, rect: BoundingBox) => void;
};

const COLOR_CLASS_MAP: Record<HighlightBox["color"], string> = {
  red: "bg-rose-300/45",
  blue: "bg-sky-300/45",
  green: "bg-emerald-300/45",
  yellow: "bg-amber-300/50",
  orange: "bg-orange-300/45",
  black: "bg-slate-400/35",
};

export default function HighlightLayer({
  activeHighlightId,
  highlights,
  interactive = true,
  onHighlightClick,
}: HighlightLayerProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {highlights.flatMap((highlight) =>
        highlight.rects.map((rect, index) => (
          <button
            key={`${highlight.id}-${index}`}
            className={`absolute rounded-sm transition ${
              COLOR_CLASS_MAP[highlight.color]
            } ${interactive ? "pointer-events-auto" : "pointer-events-none"} ${
              highlight.id === activeHighlightId ? "ring-2 ring-slate-900/50" : ""
            }`}
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
            }}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onHighlightClick(highlight, rect);
            }}
            title={highlight.note ? highlight.note.slice(0, 120) : undefined}
          >
            {highlight.note && index === 0 && (
              <span className="absolute -right-2 -top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm">
                <StickyNote className="h-3 w-3" />
              </span>
            )}
          </button>
        )),
      )}
    </div>
  );
}
