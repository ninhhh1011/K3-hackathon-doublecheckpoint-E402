import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Workflow,
} from "lucide-react";
import { useState } from "react";

import type { TraceStep } from "../reading-assistant.types";
import TraceNode from "./TraceNode";

type AgentTraceViewerProps = {
  steps: TraceStep[];
  hidden: boolean;
  onToggleHidden: () => void;
};

export default function AgentTraceViewer({
  steps,
  hidden,
  onToggleHidden,
}: AgentTraceViewerProps) {
  const [expandAll, setExpandAll] = useState(true);

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-[1.75rem] border border-slate-200 bg-slate-50/80">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
            <Workflow className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Agent Trace
            </h3>
            <p className="text-xs text-slate-500">
              Luồng planner, retrieval, tool call và generation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            type="button"
            onClick={() => setExpandAll((value) => !value)}
          >
            {expandAll ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {expandAll ? "Thu gọn" : "Mở rộng"}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            type="button"
            onClick={onToggleHidden}
          >
            {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {hidden ? "Hiện trace" : "Ẩn trace"}
          </button>
        </div>
      </header>

      {!hidden && (
        <div className="trace-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {steps.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
              Chưa có trace. Gửi câu hỏi để xem timeline streaming.
            </div>
          ) : (
            <div className="grid gap-4">
              {steps.map((step, index) => (
                <TraceNode
                  key={step.id}
                  step={step}
                  isLast={index === steps.length - 1}
                  defaultExpanded={expandAll}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
