import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

type PageNavigatorProps = {
  currentPage: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

export default function PageNavigator({
  currentPage,
  totalPages,
  disabled = false,
  onPageChange,
}: PageNavigatorProps) {
  const [draftPage, setDraftPage] = useState(String(currentPage));

  useEffect(() => {
    setDraftPage(String(currentPage));
  }, [currentPage]);

  function commitPage() {
    const parsed = Number(draftPage);
    if (!Number.isFinite(parsed)) {
      setDraftPage(String(currentPage));
      return;
    }
    const nextPage = Math.max(1, Math.min(totalPages, parsed));
    onPageChange(nextPage);
  }

  return (
    <div className="flex items-center justify-center gap-3 border-t border-slate-200 bg-white/80 px-4 py-4 backdrop-blur">
      <button
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || currentPage <= 1}
        aria-label="Trang trước"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
        <span>Trang</span>
        <input
          className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-center outline-none focus:border-amber-300"
          value={draftPage}
          disabled={disabled}
          onChange={(event) => setDraftPage(event.target.value.replace(/[^\d]/g, ""))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitPage();
            }
          }}
        />
        <span>/ {Math.max(totalPages, 1)}</span>
      </div>
      <button
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage >= totalPages}
        aria-label="Trang sau"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
