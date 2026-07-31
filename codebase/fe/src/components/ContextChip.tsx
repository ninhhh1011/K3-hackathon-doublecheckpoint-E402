import { FileImage, FileText, Quote, X } from "lucide-react";

import type { PendingContext } from "../reading-assistant.types";

type ContextChipProps = {
  context: PendingContext;
  onRemove: (id: string) => void;
};

export default function ContextChip({ context, onRemove }: ContextChipProps) {
  if (context.type === "text") {
    return (
      <div className="flex min-w-[220px] items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-slate-700">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
          <Quote className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
            Trang {context.pageNumber}
          </div>
          <p className="mt-1 line-clamp-3 max-w-xs">{context.text}</p>
        </div>
        <button
          className="rounded-full p-1 text-slate-500 transition hover:bg-white hover:text-slate-900"
          type="button"
          onClick={() => onRemove(context.id)}
          aria-label="Xóa ngữ cảnh"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (context.type === "image") {
    return (
      <div className="relative flex min-w-[280px] items-center gap-4 rounded-[1.5rem] border border-slate-700 bg-[#242424] px-4 py-3 text-white shadow-lg">
        <img
          alt={`Ảnh đính kèm trang ${context.pageNumber}`}
          className="h-14 w-14 rounded-2xl object-cover"
          src={context.imageUrl}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-semibold">
            {context.fileName ?? `Ảnh trang ${context.pageNumber}`}
          </div>
          <div className="text-sm text-slate-300">Hình ảnh</div>
        </div>
        <button
          className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-slate-800 transition hover:bg-white"
          type="button"
          onClick={() => onRemove(context.id)}
          aria-label="Xóa tệp đính kèm"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex min-w-[320px] items-center gap-4 rounded-[1.5rem] border border-slate-700 bg-[#242424] px-4 py-3 text-white shadow-lg">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#ff4b4b] text-white">
        <FileText className="h-7 w-7" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-lg font-semibold">{context.fileName}</div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <FileImage className="h-4 w-4" />
          {context.mimeType === "application/pdf" ? "PDF" : context.mimeType}
        </div>
      </div>
      <button
        className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-slate-800 transition hover:bg-white"
        type="button"
        onClick={() => onRemove(context.id)}
        aria-label="Xóa tệp đính kèm"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
