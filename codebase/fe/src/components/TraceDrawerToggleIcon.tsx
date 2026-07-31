import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

type TraceDrawerToggleIconProps = {
  open: boolean;
  onToggle: () => void;
};

export default function TraceDrawerToggleIcon({
  open,
  onToggle,
}: TraceDrawerToggleIconProps) {
  return (
    <button
      className="fixed top-1/2 z-[60] flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-r-2xl border border-l-0 border-slate-200 bg-white/95 text-slate-700 shadow-xl shadow-slate-900/10 backdrop-blur transition-all duration-300 hover:text-slate-900"
      style={{ left: open ? "min(440px, 92vw)" : 0 }}
      type="button"
      onClick={onToggle}
      aria-label={open ? "Đóng Agent Trace" : "Mở Agent Trace"}
    >
      {open ? <PanelLeftClose className="h-6 w-6" /> : <PanelLeftOpen className="h-6 w-6" />}
    </button>
  );
}
