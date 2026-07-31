import { Workflow } from "lucide-react";

import type { TraceStep } from "../reading-assistant.types";
import TraceNode from "./TraceNode";

type AgentTraceDrawerProps = {
  open: boolean;
  steps: TraceStep[];
  onClose: () => void;
};

export default function AgentTraceDrawer({
  open,
  steps,
  onClose,
}: AgentTraceDrawerProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/20 transition ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-[min(440px,92vw)] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <header className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Agent Trace</h3>
              <p className="text-xs text-slate-500">
                Luồng Router, Tool call, Retrieval, LLM và nhánh điều kiện
              </p>
            </div>
          </div>
        </header>
        <div className="trace-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {steps.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Chưa có trace. Gửi câu hỏi để xem timeline streaming.
            </div>
          ) : (
            <div className="grid gap-4">
              {steps.map((step, index) => (
                <TraceNode
                  key={step.id}
                  step={step}
                  isLast={index === steps.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
