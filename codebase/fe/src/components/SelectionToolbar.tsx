import { MessageSquareQuote, Sparkles } from "lucide-react";

type SelectionToolbarProps = {
  x: number;
  y: number;
  onAskAi: () => void;
  label?: string;
};

export default function SelectionToolbar({
  x,
  y,
  onAskAi,
  label = "Hỏi AI",
}: SelectionToolbarProps) {
  return (
    <div
      className="absolute z-30 -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 p-1 shadow-xl shadow-slate-900/10 backdrop-blur"
      style={{ left: x, top: y }}
    >
      <button
        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        type="button"
        onPointerDown={(event) => event.preventDefault()}
        onClick={onAskAi}
      >
        <Sparkles className="h-4 w-4" />
        <MessageSquareQuote className="h-4 w-4" />
        {label}
      </button>
    </div>
  );
}
