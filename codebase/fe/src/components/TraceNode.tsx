import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  GitBranch,
  Search,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { TraceStep } from "../reading-assistant.types";

type TraceNodeProps = {
  step: TraceStep;
  isLast: boolean;
  defaultExpanded?: boolean;
};

type RagResultItem = {
  source_type?: string;
  source_id?: string;
  combined_score?: number;
  cosine_score?: number;
  bm25_score?: number;
  preview?: string;
  extra_content?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function summaryForStep(step: TraceStep): string | null {
  if (step.id !== "rag_retrieval") {
    return null;
  }

  const input = isRecord(step.input) ? step.input : null;
  const output = isRecord(step.output) ? step.output : null;
  const query =
    input && typeof input.query === "string" && input.query.trim()
      ? input.query.trim()
      : null;
  const topK =
    input && typeof input.top_k === "number" ? input.top_k : null;
  const threshold =
    input && typeof input.score_threshold === "number"
      ? input.score_threshold
      : null;
  const acceptedCount =
    output && typeof output.accepted_count === "number"
      ? output.accepted_count
      : null;
  const skipped =
    output && output.skipped === true;

  const parts: string[] = [];
  if (query) {
    parts.push(`Query: ${query}`);
  }
  if (topK !== null) {
    parts.push(`top-k: ${topK}`);
  }
  if (threshold !== null) {
    parts.push(`threshold: ${threshold}`);
  }
  if (acceptedCount !== null) {
    parts.push(`hits: ${acceptedCount}`);
  }
  if (skipped) {
    parts.push("skipped");
  }
  return parts.length > 0 ? parts.join(" | ") : null;
}

function ragResultsForStep(step: TraceStep): RagResultItem[] {
  if (step.id !== "rag_retrieval") {
    return [];
  }
  const output = isRecord(step.output) ? step.output : null;
  const rawResults = output?.results;
  if (!Array.isArray(rawResults)) {
    return [];
  }
  return rawResults.filter(isRecord).map((item) => ({
    source_type:
      typeof item.source_type === "string" ? item.source_type : undefined,
    source_id: typeof item.source_id === "string" ? item.source_id : undefined,
    combined_score:
      typeof item.combined_score === "number" ? item.combined_score : undefined,
    cosine_score:
      typeof item.cosine_score === "number" ? item.cosine_score : undefined,
    bm25_score: typeof item.bm25_score === "number" ? item.bm25_score : undefined,
    preview: typeof item.preview === "string" ? item.preview : undefined,
    extra_content:
      typeof item.extra_content === "string" ? item.extra_content : undefined,
  }));
}

function iconForStep(step: TraceStep) {
  if (step.status === "error") {
    return TriangleAlert;
  }
  switch (step.nodeType) {
    case "router":
      return GitBranch;
    case "tool_call":
      return Wrench;
    case "retrieval":
      return Search;
    case "llm_generation":
      return Bot;
    case "conditional_edge":
      return GitBranch;
  }
}

function statusClass(status: TraceStep["status"]): string {
  if (status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "running") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-500";
}

export default function TraceNode({
  step,
  isLast,
  defaultExpanded = false,
}: TraceNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const Icon = iconForStep(step);
  const summary = summaryForStep(step);
  const ragResults = ragResultsForStep(step);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  return (
    <div className="relative pl-14">
      {!isLast && (
        <div className="absolute left-[21px] top-10 h-[calc(100%-1.25rem)] w-px bg-slate-200" />
      )}
      <div
        className={`absolute left-0 top-1 flex h-11 w-11 items-center justify-center rounded-2xl border ${statusClass(step.status)}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          className="flex w-full items-start justify-between gap-4 text-left"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">
                {step.label}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium ${statusClass(step.status)}`}
              >
                {step.status === "completed" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <CircleDashed className="h-3.5 w-3.5" />
                )}
                {step.status}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {step.toolName ?? step.branchLabel ?? step.nodeType}
            </div>
            {summary && (
              <div className="mt-2 text-xs leading-5 text-slate-600">
                {summary}
              </div>
            )}
          </div>
          {expanded ? (
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
          ) : (
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
          )}
        </button>

        {expanded && (
          <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-700">
            {ragResults.length > 0 && (
              <div>
                <div className="mb-2 font-semibold text-slate-900">
                  Noi dung truy van DB
                </div>
                <div className="grid gap-2">
                  {ragResults.map((result, index) => (
                    <div
                      className="rounded-2xl border border-slate-200 bg-white p-3"
                      key={`${result.source_type}-${result.source_id}-${index}`}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700">
                          {result.source_type ?? "unknown"}:{result.source_id ?? "n/a"}
                        </span>
                        {result.combined_score !== undefined && (
                          <span>combined {result.combined_score.toFixed(4)}</span>
                        )}
                        {result.cosine_score !== undefined && (
                          <span>cosine {result.cosine_score.toFixed(4)}</span>
                        )}
                        {result.bm25_score !== undefined && (
                          <span>bm25 {result.bm25_score.toFixed(4)}</span>
                        )}
                      </div>
                      {result.extra_content && (
                        <div className="mt-2 text-[11px] font-medium text-slate-600">
                          {result.extra_content}
                        </div>
                      )}
                      {result.preview && (
                        <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-slate-700">
                          {result.preview}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {step.input !== undefined && (
              <div>
                <div className="mb-1 font-semibold text-slate-900">Input</div>
                <pre className="overflow-auto rounded-2xl bg-white p-3 text-[11px] leading-5">
                  {JSON.stringify(step.input, null, 2)}
                </pre>
              </div>
            )}
            {step.output !== undefined && (
              <div>
                <div className="mb-1 font-semibold text-slate-900">Output</div>
                <pre className="overflow-auto rounded-2xl bg-white p-3 text-[11px] leading-5">
                  {JSON.stringify(step.output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
