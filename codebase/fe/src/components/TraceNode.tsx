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
  retrieval_methods?: string[];
};

type RagSourceGroup = {
  top_k?: number;
  score_threshold?: number;
  retrieved_count?: number;
  accepted_count?: number;
  results: RagResultItem[];
  raw_results: RagResultItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRagStep(step: TraceStep): boolean {
  return step.toolName === "rag_retrieval" || step.label === "Hybrid retrieval từ DB";
}

function summaryForStep(step: TraceStep): string | null {
  if (!isRagStep(step)) {
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
  if (!isRagStep(step)) {
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

function ragSourcesForStep(step: TraceStep): Record<string, RagSourceGroup> {
  if (!isRagStep(step)) {
    return {};
  }
  const output = isRecord(step.output) ? step.output : null;
  const rawSources = output?.sources;
  if (!isRecord(rawSources)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawSources)
      .filter(([, value]) => isRecord(value))
      .map(([sourceName, value]) => {
        const sourceValue = value as Record<string, unknown>;
        const mapResults = (items: unknown): RagResultItem[] =>
          Array.isArray(items)
            ? items.filter(isRecord).map((item) => ({
                source_type:
                  typeof item.source_type === "string" ? item.source_type : undefined,
                source_id: typeof item.source_id === "string" ? item.source_id : undefined,
                combined_score:
                  typeof item.combined_score === "number" ? item.combined_score : undefined,
                cosine_score:
                  typeof item.cosine_score === "number" ? item.cosine_score : undefined,
                bm25_score:
                  typeof item.bm25_score === "number" ? item.bm25_score : undefined,
                preview: typeof item.preview === "string" ? item.preview : undefined,
                extra_content:
                  typeof item.extra_content === "string" ? item.extra_content : undefined,
                retrieval_methods: Array.isArray(item.retrieval_methods)
                  ? item.retrieval_methods.filter(
                      (method): method is string => typeof method === "string",
                    )
                  : undefined,
              }))
            : [];

        return [
          sourceName,
          {
            top_k: typeof sourceValue.top_k === "number" ? sourceValue.top_k : undefined,
            score_threshold:
              typeof sourceValue.score_threshold === "number"
                ? sourceValue.score_threshold
                : undefined,
            retrieved_count:
              typeof sourceValue.retrieved_count === "number"
                ? sourceValue.retrieved_count
                : undefined,
            accepted_count:
              typeof sourceValue.accepted_count === "number"
                ? sourceValue.accepted_count
                : undefined,
            results: mapResults(sourceValue.results),
            raw_results: mapResults(sourceValue.raw_results),
          } satisfies RagSourceGroup,
        ];
      }),
  );
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
  const ragSources = ragSourcesForStep(step);

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
                  Tong hop ket qua retrieval
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
            {Object.keys(ragSources).length > 0 && (
              <div>
                <div className="mb-2 font-semibold text-slate-900">
                  Chi tiet theo tung bang
                </div>
                <div className="grid gap-3">
                  {Object.entries(ragSources).map(([sourceName, source]) => (
                    <div
                      className="rounded-2xl border border-slate-200 bg-white p-3"
                      key={sourceName}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700">
                          {sourceName}
                        </span>
                        {source.top_k !== undefined && <span>top-k {source.top_k}</span>}
                        {source.score_threshold !== undefined && (
                          <span>threshold {source.score_threshold}</span>
                        )}
                        {source.accepted_count !== undefined && (
                          <span>accepted {source.accepted_count}</span>
                        )}
                        {source.retrieved_count !== undefined && (
                          <span>retrieved {source.retrieved_count}</span>
                        )}
                      </div>

                      <div className="mt-3">
                        <div className="mb-2 font-semibold text-slate-900">
                          Accepted
                        </div>
                        <div className="grid gap-2">
                          {source.results.length > 0 ? (
                            source.results.map((result, index) => (
                              <div
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                                key={`${sourceName}-accepted-${result.source_id}-${index}`}
                              >
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                  <span>
                                    {result.source_type ?? sourceName}:{result.source_id ?? "n/a"}
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
                                  {result.retrieval_methods && result.retrieval_methods.length > 0 && (
                                    <span>{result.retrieval_methods.join(", ")}</span>
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
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500">
                              Không có kết quả qua threshold.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="mb-2 font-semibold text-slate-900">
                          Raw candidates
                        </div>
                        <pre className="overflow-auto rounded-2xl bg-slate-50 p-3 text-[11px] leading-5">
                          {JSON.stringify(source.raw_results, null, 2)}
                        </pre>
                      </div>
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
