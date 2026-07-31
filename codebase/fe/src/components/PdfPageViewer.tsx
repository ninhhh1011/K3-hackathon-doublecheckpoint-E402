import {
  type ComponentType,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react";

import type {
  BoundingBox,
  HighlightBox,
  PenStroke,
  ToolMode,
} from "../reading-assistant.types";
import HighlightLayer from "./HighlightLayer";

type ReactPdfPageComponent = ComponentType<{
  pageNumber: number;
  width?: number;
  renderAnnotationLayer?: boolean;
  renderTextLayer?: boolean;
  loading?: ReactNode;
}>;

type PdfPageViewerProps = {
  PageComponent: ReactPdfPageComponent;
  pageNumber: number;
  pageCount: number;
  fileName: string;
  zoom: number;
  toolMode: ToolMode;
  highlights: HighlightBox[];
  penStrokes: PenStroke[];
  currentPenStroke: PenStroke | null;
  dragSelection: BoundingBox | null;
  activeHighlightId?: string | null;
  onHighlightClick: (highlight: HighlightBox, rect: BoundingBox) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onPageMount: (node: HTMLDivElement | null) => void;
};

function buildPolyline(points: PenStroke["points"]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export default function PdfPageViewer({
  PageComponent,
  pageNumber,
  pageCount,
  fileName,
  zoom,
  toolMode,
  highlights,
  penStrokes,
  currentPenStroke,
  dragSelection,
  activeHighlightId,
  onHighlightClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPageMount,
}: PdfPageViewerProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    onPageMount(surfaceRef.current);
  }, [onPageMount, pageNumber]);

  return (
    <div data-page-number={pageNumber} className="pdf-selection-layer mx-auto w-full max-w-[780px]">
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/85 px-4 py-2 text-xs text-slate-500 shadow-sm">
        <span>
          Trang {pageNumber}/{pageCount}
        </span>
        <span className="truncate">{fileName}</span>
      </div>

      <div
        ref={surfaceRef}
        className={`relative overflow-hidden rounded-[1.8rem] border border-white/60 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ${
          toolMode === "read" ? "pdf-read-mode" : "pdf-draw-mode"
        }`}
        onPointerDown={toolMode === "read" ? undefined : onPointerDown}
        onPointerMove={toolMode === "read" ? undefined : onPointerMove}
        onPointerUp={toolMode === "read" ? undefined : onPointerUp}
      >
        <PageComponent
          pageNumber={pageNumber}
          width={Math.round(720 * zoom)}
          renderAnnotationLayer={false}
          renderTextLayer
          loading={
            <div className="flex min-h-[800px] items-center justify-center text-sm text-slate-500">
              Đang tải trang PDF...
            </div>
          }
        />

        <svg className="pointer-events-none absolute inset-0 z-[9] h-full w-full">
          {penStrokes.map((stroke) => (
            <polyline
              key={stroke.id}
              fill="none"
              points={buildPolyline(stroke.points)}
              stroke={stroke.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={stroke.strokeWidth}
            />
          ))}
          {currentPenStroke && (
            <polyline
              fill="none"
              points={buildPolyline(currentPenStroke.points)}
              stroke={currentPenStroke.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={currentPenStroke.strokeWidth}
            />
          )}
        </svg>

        <HighlightLayer
          activeHighlightId={activeHighlightId}
          highlights={highlights}
          interactive={toolMode !== "read"}
          onHighlightClick={onHighlightClick}
        />

        {dragSelection && (
          <div
            className="pointer-events-none absolute z-20 border-2 border-dashed border-sky-500 bg-sky-200/20"
            style={{
              left: dragSelection.x,
              top: dragSelection.y,
              width: dragSelection.width,
              height: dragSelection.height,
            }}
          />
        )}
      </div>
    </div>
  );
}
