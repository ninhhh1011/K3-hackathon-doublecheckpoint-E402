import {
  Download,
  Eraser,
  Hand,
  Highlighter,
  Minus,
  NotebookPen,
  PenTool,
  Plus,
  RotateCcw,
  StickyNote,
  Trash2,
  Upload,
} from "lucide-react";
import {
  type ComponentType,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  BoundingBox,
  HighlightBox,
  HighlightColor,
  PenStroke,
  Point,
  TextContext,
  ToolMode,
} from "../reading-assistant.types";
import PageNavigator from "./PageNavigator";
import PdfPageViewer from "./PdfPageViewer";
import PdfUploader from "./PdfUploader";
import SelectionToolbar from "./SelectionToolbar";

type ToolbarSelection = {
  x: number;
  y: number;
  pageNumber: number;
  text: string;
  boundingBoxes: BoundingBox[];
};

type NotePopupState = {
  highlightId: string;
  pageNumber: number;
  x: number;
  y: number;
};

type HistoryEntry =
  | { kind: "highlight"; page: number; id: string }
  | { kind: "pen"; page: number; id: string };

type ReactPdfModule = {
  Document: ComponentType<{
    file: File | null;
    onLoadSuccess?: (payload: { numPages: number }) => void;
    loading?: ReactNode;
    error?: ReactNode;
    children?: ReactNode;
  }>;
  Page: ComponentType<{
    pageNumber: number;
    width?: number;
    renderAnnotationLayer?: boolean;
    renderTextLayer?: boolean;
    loading?: ReactNode;
  }>;
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: string;
    };
  };
};

type PdfViewerProps = {
  currentPage: number;
  onCurrentPageChange: (pageNumber: number) => void;
  highlightsByPage: Record<number, HighlightBox[]>;
  penStrokesByPage: Record<number, PenStroke[]>;
  onHighlightsChange: (
    updater: (current: Record<number, HighlightBox[]>) => Record<number, HighlightBox[]>,
  ) => void;
  onPenStrokesChange: (
    updater: (current: Record<number, PenStroke[]>) => Record<number, PenStroke[]>,
  ) => void;
  onAddTextContext: (context: TextContext) => void;
  onDocumentChange: (file: File | null) => void;
};

const COLOR_OPTIONS: Array<{ value: HighlightColor; className: string; label: string }> = [
  { value: "red", className: "bg-rose-500", label: "Đỏ" },
  { value: "blue", className: "bg-sky-500", label: "Xanh dương" },
  { value: "green", className: "bg-emerald-500", label: "Xanh lá" },
  { value: "yellow", className: "bg-amber-400", label: "Vàng" },
  { value: "orange", className: "bg-orange-500", label: "Cam" },
  { value: "black", className: "bg-slate-900", label: "Đen" },
];

function makeId(prefix: string): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  return `${prefix}-${suffix}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createRectFromDrag(start: Point, end: Point): BoundingBox {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export default function PdfViewer({
  currentPage,
  onCurrentPageChange,
  highlightsByPage,
  penStrokesByPage,
  onHighlightsChange,
  onPenStrokesChange,
  onAddTextContext,
  onDocumentChange,
}: PdfViewerProps) {
  const [reactPdfModule, setReactPdfModule] = useState<ReactPdfModule | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>("read");
  const [zoom, setZoom] = useState(1);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [toolbarSelection, setToolbarSelection] = useState<ToolbarSelection | null>(null);
  const [dragSelection, setDragSelection] = useState<BoundingBox | null>(null);
  const [currentPenStroke, setCurrentPenStroke] = useState<PenStroke | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [notePopup, setNotePopup] = useState<NotePopupState | null>(null);
  const [highlightColor, setHighlightColor] = useState<HighlightColor>("yellow");
  const [penColor, setPenColor] = useState<HighlightColor>("blue");
  const [penStrokeWidth, setPenStrokeWidth] = useState(3);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ start: Point; moved: boolean } | null>(null);
  const historyRef = useRef<HistoryEntry[]>([]);
  const currentPenStrokeRef = useRef<PenStroke | null>(null);

  const fileName = pdfFile?.name ?? "";
  const DocumentComponent = reactPdfModule?.Document;
  const PageComponent = reactPdfModule?.Page;
  const currentHighlights = highlightsByPage[currentPage] ?? [];
  const currentPenStrokes = penStrokesByPage[currentPage] ?? [];
  const activeHighlight =
    notePopup && notePopup.pageNumber === currentPage
      ? currentHighlights.find((item) => item.id === notePopup.highlightId) ?? null
      : null;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let active = true;
    import("react-pdf").then((module) => {
      if (!active) {
        return;
      }
      module.pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      setReactPdfModule({
        Document: module.Document,
        Page: module.Page,
        pdfjs: module.pdfjs,
      });
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setToolbarSelection(null);
    setDragSelection(null);
    currentPenStrokeRef.current = null;
    setCurrentPenStroke(null);
    setNotePopup(null);
    setActiveHighlightId(null);
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
  }, [currentPage]);

  function setPenStrokePreview(
    next: PenStroke | null | ((current: PenStroke | null) => PenStroke | null),
  ) {
    const resolved = typeof next === "function" ? next(currentPenStrokeRef.current) : next;
    currentPenStrokeRef.current = resolved;
    setCurrentPenStroke(resolved);
  }

  function getSurfaceRect() {
    return pageContainerRef.current?.getBoundingClientRect() ?? null;
  }

  function getScrollRect() {
    return scrollContainerRef.current?.getBoundingClientRect() ?? null;
  }

  function toOverlayPosition(rect: BoundingBox) {
    const surfaceRect = getSurfaceRect();
    const scrollRect = getScrollRect();
    if (!surfaceRect || !scrollRect) {
      return null;
    }

    return {
      x: surfaceRect.left - scrollRect.left + rect.x + rect.width + 18,
      y: Math.max(18, surfaceRect.top - scrollRect.top + rect.y),
    };
  }

  useEffect(() => {
    function handleSelectionChange() {
      if (
        !pageContainerRef.current ||
        (toolMode !== "read" && toolMode !== "highlight") ||
        typeof window === "undefined"
      ) {
        return;
      }

      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";
      if (!selection || selection.rangeCount === 0 || !text) {
        if (toolMode === "read") {
          setToolbarSelection(null);
        }
        return;
      }

      const range = selection.getRangeAt(0);
      const commonParent = range.commonAncestorContainer.parentElement;
      if (!commonParent || !pageContainerRef.current.contains(commonParent)) {
        return;
      }

      const pageRect = getSurfaceRect();
      const scrollRect = getScrollRect();
      if (!pageRect || !scrollRect) {
        return;
      }
      const rects = Array.from(range.getClientRects())
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .map((rect) => ({
          x: rect.left - pageRect.left,
          y: rect.top - pageRect.top,
          width: rect.width,
          height: rect.height,
        }));

      if (rects.length === 0) {
        return;
      }

      const firstRect = range.getBoundingClientRect();
      const nextSelection: ToolbarSelection = {
        x: firstRect.left - scrollRect.left + firstRect.width / 2,
        y: firstRect.top - scrollRect.top - 16,
        pageNumber: currentPage,
        text,
        boundingBoxes: rects,
      };

      if (toolMode === "read") {
        setToolbarSelection(nextSelection);
        return;
      }

      const highlightId = makeId("highlight");
      const highlight: HighlightBox = {
        id: highlightId,
        pageNumber: currentPage,
        color: highlightColor,
        rects,
        text,
        note: "",
      };
      onHighlightsChange((current) => ({
        ...current,
        [currentPage]: [...(current[currentPage] ?? []), highlight],
      }));
      historyRef.current.push({ kind: "highlight", page: currentPage, id: highlightId });
      setActiveHighlightId(highlightId);
      const popupAnchor = toOverlayPosition(rects[0]);
      if (popupAnchor) {
        setNotePopup({
          highlightId,
          pageNumber: currentPage,
          x: popupAnchor.x,
          y: popupAnchor.y,
        });
      }
      window.getSelection()?.removeAllRanges();
      setToolbarSelection(null);
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [currentPage, highlightColor, onHighlightsChange, toolMode, zoom]);

  function clearSelectionUi() {
    setToolbarSelection(null);
    setDragSelection(null);
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
  }

  function undoLastAction() {
    const last = historyRef.current.pop();
    if (!last) {
      clearSelectionUi();
      return;
    }

    if (last.kind === "highlight") {
      onHighlightsChange((current) => ({
        ...current,
        [last.page]: (current[last.page] ?? []).filter((item) => item.id !== last.id),
      }));
      if (notePopup?.highlightId === last.id) {
        setNotePopup(null);
        setActiveHighlightId(null);
      }
      return;
    }

    onPenStrokesChange((current) => ({
      ...current,
      [last.page]: (current[last.page] ?? []).filter((item) => item.id !== last.id),
    }));
  }

  function clearCurrentPage() {
    clearSelectionUi();
    setNotePopup(null);
    setActiveHighlightId(null);
    onHighlightsChange((current) => ({
      ...current,
      [currentPage]: [],
    }));
    onPenStrokesChange((current) => ({
      ...current,
      [currentPage]: [],
    }));
    historyRef.current = historyRef.current.filter((item) => item.page !== currentPage);
  }

  function getRelativePoint(event: PointerEvent<HTMLDivElement>): Point | null {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      return null;
    }
    return { x, y };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (toolMode !== "pen" && toolMode !== "highlight") {
      return;
    }
    if (toolMode === "pen") {
      event.preventDefault();
    }
    const point = getRelativePoint(event);
    if (!point) {
      return;
    }
    dragState.current = { start: point, moved: false };
    setToolbarSelection(null);
    if (toolMode === "pen") {
      setPenStrokePreview({
        id: makeId("pen"),
        pageNumber: currentPage,
        color: penColor,
        strokeWidth: penStrokeWidth,
        points: [point],
      });
    } else {
      setDragSelection({
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
      });
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragState.current) {
      return;
    }
    const point = getRelativePoint(event);
    if (!point) {
      return;
    }
    dragState.current.moved = true;

    if (toolMode === "pen") {
      event.preventDefault();
      setPenStrokePreview((current) =>
        current
          ? {
              ...current,
              points: [...current.points, point],
            }
          : current,
      );
      return;
    }

    if (toolMode === "highlight") {
      setDragSelection(createRectFromDrag(dragState.current.start, point));
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!dragState.current) {
      return;
    }
    const point = getRelativePoint(event) ?? dragState.current.start;

    if (toolMode === "pen") {
      event.preventDefault();
      const activeStroke = currentPenStrokeRef.current;
      if (activeStroke && activeStroke.points.length > 1) {
        const savedStroke = {
          ...activeStroke,
          points: [...activeStroke.points, point],
        };
        onPenStrokesChange((current) => ({
          ...current,
          [currentPage]: [...(current[currentPage] ?? []), savedStroke],
        }));
        historyRef.current.push({ kind: "pen", page: currentPage, id: savedStroke.id });
      }
      setPenStrokePreview(null);
      dragState.current = null;
      return;
    }

    if (toolMode === "highlight") {
      const selectionText =
        typeof window !== "undefined" ? window.getSelection()?.toString().trim() ?? "" : "";
      const rect = createRectFromDrag(dragState.current.start, point);
      if (!selectionText && rect.width > 8 && rect.height > 8) {
        const highlightId = makeId("highlight");
        const highlight: HighlightBox = {
          id: highlightId,
          pageNumber: currentPage,
          color: highlightColor,
          rects: [rect],
          text: "",
          note: "",
        };
        onHighlightsChange((current) => ({
          ...current,
          [currentPage]: [...(current[currentPage] ?? []), highlight],
        }));
        historyRef.current.push({ kind: "highlight", page: currentPage, id: highlightId });
        setActiveHighlightId(highlightId);
        const popupAnchor = toOverlayPosition(rect);
        if (popupAnchor) {
          setNotePopup({
            highlightId,
            pageNumber: currentPage,
            x: popupAnchor.x,
            y: popupAnchor.y,
          });
        }
      }
      setDragSelection(null);
      dragState.current = null;
    }
  }

  function insertSelectedContext() {
    if (!toolbarSelection) {
      return;
    }

    onAddTextContext({
      id: makeId("text"),
      type: "text",
      text: toolbarSelection.text,
      pageNumber: toolbarSelection.pageNumber,
      boundingBoxes: toolbarSelection.boundingBoxes,
    });
    clearSelectionUi();
  }

  function downloadCurrentFile() {
    if (!pdfFile) {
      return;
    }
    const url = URL.createObjectURL(pdfFile);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = pdfFile.name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openHighlightNote(highlight: HighlightBox, rect: BoundingBox) {
    setActiveHighlightId(highlight.id);
    const popupAnchor = toOverlayPosition(rect);
    if (popupAnchor) {
      setNotePopup({
        highlightId: highlight.id,
        pageNumber: highlight.pageNumber,
        x: popupAnchor.x,
        y: popupAnchor.y,
      });
    }
  }

  function updateHighlightNote(nextNote: string) {
    if (!notePopup) {
      return;
    }
    onHighlightsChange((current) => ({
      ...current,
      [notePopup.pageNumber]: (current[notePopup.pageNumber] ?? []).map((item) =>
        item.id === notePopup.highlightId
          ? {
              ...item,
              note: nextNote,
            }
          : item,
      ),
    }));
  }

  function clearHighlightNote() {
    updateHighlightNote("");
  }

  function deleteActiveHighlight() {
    if (!notePopup) {
      return;
    }
    onHighlightsChange((current) => ({
      ...current,
      [notePopup.pageNumber]: (current[notePopup.pageNumber] ?? []).filter(
        (item) => item.id !== notePopup.highlightId,
      ),
    }));
    historyRef.current = historyRef.current.filter((item) => item.id !== notePopup.highlightId);
    setNotePopup(null);
    setActiveHighlightId(null);
  }

  const ToolbarButton = useMemo(
    () =>
      function ToolbarButton({
        active,
        icon,
        label,
        onClick,
      }: {
        active?: boolean;
        icon: ReactNode;
        label: string;
        onClick?: () => void;
      }) {
        return (
          <button
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
              active
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
            type="button"
            onClick={onClick}
          >
            {icon}
            {label}
          </button>
        );
      },
    [],
  );

  return (
    <section className="relative flex min-h-0 flex-col bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.14),_transparent_22%),linear-gradient(180deg,#f8f4ea_0%,#f3ecdf_100%)]">
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="application/pdf"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          if (!file) {
            return;
          }
          setPdfFile(file);
          onDocumentChange(file);
          setPageCount(0);
          onCurrentPageChange(1);
          clearSelectionUi();
          event.target.value = "";
        }}
      />

      <div className="border-b border-slate-200/80 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-white/70 bg-white/85 p-3 shadow-lg shadow-slate-900/5 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <ToolbarButton
              active={toolMode === "read"}
              label="Đọc"
              icon={<Hand className="h-4 w-4" />}
              onClick={() => setToolMode("read")}
            />
            <ToolbarButton
              active={toolMode === "pen"}
              label="Bút"
              icon={<PenTool className="h-4 w-4" />}
              onClick={() => setToolMode("pen")}
            />
            <ToolbarButton
              active={toolMode === "highlight"}
              label="Highlight"
              icon={<Highlighter className="h-4 w-4" />}
              onClick={() => setToolMode("highlight")}
            />
            <button
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
              type="button"
              onClick={clearCurrentPage}
            >
              <Trash2 className="h-4 w-4" />
              Xóa trang hiện tại
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              type="button"
              onClick={() =>
                setZoom((value) => clamp(Number((value - 0.1).toFixed(2)), 0.7, 1.8))
              }
              aria-label="Thu nhỏ"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="min-w-16 text-center text-sm font-medium text-slate-600">
              {Math.round(zoom * 100)}%
            </div>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              type="button"
              onClick={() =>
                setZoom((value) => clamp(Number((value + 0.1).toFixed(2)), 0.7, 1.8))
              }
              aria-label="Phóng to"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Tải PDF lên"
            >
              <Upload className="h-4 w-4" />
            </button>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={downloadCurrentFile}
              disabled={!pdfFile}
              aria-label="Tải xuống"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              type="button"
              onClick={undoLastAction}
              aria-label="Hoàn tác"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              type="button"
              onClick={clearSelectionUi}
              aria-label="Xóa vùng chọn tạm"
            >
              <Eraser className="h-4 w-4" />
            </button>
          </div>
        </div>

        {(toolMode === "pen" || toolMode === "highlight") && (
          <div className="mt-3 flex flex-wrap items-center gap-4 rounded-[1.4rem] border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              {(toolMode === "pen" ? COLOR_OPTIONS : COLOR_OPTIONS).map((color) => {
                const active = toolMode === "pen" ? penColor === color.value : highlightColor === color.value;
                return (
                  <button
                    key={`${toolMode}-${color.value}`}
                    className={`h-7 w-7 rounded-full border-2 ${color.className} ${
                      active ? "border-slate-900 scale-110" : "border-white"
                    } transition`}
                    type="button"
                    aria-label={color.label}
                    onClick={() => {
                      if (toolMode === "pen") {
                        setPenColor(color.value);
                      } else {
                        setHighlightColor(color.value);
                      }
                    }}
                  />
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <NotebookPen className="h-4 w-4" />
              Nét
              <input
                className="accent-slate-900"
                type="range"
                min={1}
                max={8}
                value={toolMode === "pen" ? penStrokeWidth : 3}
                onChange={(event) => {
                  if (toolMode === "pen") {
                    setPenStrokeWidth(Number(event.target.value));
                  }
                }}
                disabled={toolMode !== "pen"}
              />
              <span className="text-sm text-slate-700">
                {toolMode === "pen" ? penStrokeWidth : 3}px
              </span>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-white/85 px-3 py-1">
            Công cụ hiện tại: {toolMode === "read" ? "Đọc" : toolMode === "pen" ? "Bút" : "Highlight"}
          </span>
          <span className="rounded-full bg-white/85 px-3 py-1">
            {pdfFile ? `Đang xem trang ${currentPage}/${pageCount || "..."}` : "Chưa có tài liệu"}
          </span>
          <span className="rounded-full bg-white/85 px-3 py-1">
            {toolMode === "highlight"
              ? "Bôi đen văn bản hoặc kéo chuột để tạo highlight rồi thêm ghi chú"
              : toolMode === "pen"
                ? "Kéo chuột để vẽ tự do trực tiếp lên trang PDF"
                : "Bôi đen văn bản để hiện nút Hỏi AI và chèn vào ô chat"}
          </span>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="page-scrollbar relative min-h-0 flex-1 overflow-auto px-4 py-5"
      >
        {!pdfFile && (
          <PdfUploader
            onFileSelect={(file) => {
              setPdfFile(file);
              onDocumentChange(file);
              setPageCount(0);
              onCurrentPageChange(1);
              clearSelectionUi();
            }}
          />
        )}

        {pdfFile && toolbarSelection && (
          <SelectionToolbar x={toolbarSelection.x} y={toolbarSelection.y} onAskAi={insertSelectedContext} />
        )}

        {pdfFile && notePopup && activeHighlight && (
          <div
            className="absolute z-30 w-[min(340px,calc(100%-2rem))] rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/12"
            style={{ left: notePopup.x, top: notePopup.y }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <StickyNote className="h-4 w-4" />
                Ghi chú highlight
              </div>
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                type="button"
                onClick={() => {
                  setNotePopup(null);
                  setActiveHighlightId(null);
                }}
              >
                Xong
              </button>
            </div>
            <div className="mt-3 rounded-2xl bg-slate-50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Đoạn đã chọn
              </div>
              <p className="mt-2 text-sm italic text-slate-700">
                {activeHighlight.text?.trim()
                  ? activeHighlight.text
                  : "Highlight vùng tự do không có văn bản đi kèm."}
              </p>
            </div>
            <textarea
              className="mt-3 min-h-28 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
              placeholder="Viết ghi chú cho đoạn highlight..."
              value={activeHighlight.note ?? ""}
              onChange={(event) => updateHighlightNote(event.target.value)}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                className="rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                type="button"
                onClick={clearHighlightNote}
              >
                Xóa note
              </button>
              <button
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                type="button"
                onClick={deleteActiveHighlight}
              >
                Xóa highlight
              </button>
            </div>
          </div>
        )}

        {pdfFile && DocumentComponent && PageComponent && (
          <DocumentComponent
            file={pdfFile}
            onLoadSuccess={({ numPages }) => {
              setPageCount(numPages);
              onCurrentPageChange(Math.min(currentPage, numPages));
            }}
            loading={
              <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-10 text-center text-sm text-slate-500">
                Đang tải PDF...
              </div>
            }
            error={
              <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-10 text-center text-sm text-rose-700">
                Không thể đọc tệp PDF này. Vui lòng thử lại bằng một tệp khác.
              </div>
            }
          >
            <PdfPageViewer
              PageComponent={PageComponent}
              pageNumber={currentPage}
              pageCount={pageCount}
              fileName={fileName}
              zoom={zoom}
              toolMode={toolMode}
              highlights={currentHighlights}
              penStrokes={currentPenStrokes}
              currentPenStroke={currentPenStroke}
              dragSelection={toolMode === "highlight" ? dragSelection : null}
              activeHighlightId={activeHighlightId}
              onHighlightClick={openHighlightNote}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPageMount={(node) => {
                pageContainerRef.current = node;
              }}
            />
          </DocumentComponent>
        )}
      </div>

      <PageNavigator
        currentPage={currentPage}
        totalPages={pageCount}
        disabled={!pdfFile || pageCount === 0}
        onPageChange={(page) => {
          clearSelectionUi();
          setNotePopup(null);
          setActiveHighlightId(null);
          currentPenStrokeRef.current = null;
          setCurrentPenStroke(null);
          onCurrentPageChange(page);
        }}
      />
    </section>
  );
}
