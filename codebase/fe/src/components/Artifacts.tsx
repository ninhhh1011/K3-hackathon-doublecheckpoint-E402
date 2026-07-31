import { useState } from "react";

import type { MindmapImageArtifact } from "../reading-assistant.types";
import type { MindMap, Quiz } from "../types";

function Citations({ citations }: { citations: string[] }) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Nguồn tham chiếu">
      {citations.map((citation) => (
        <li
          className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-600"
          key={citation}
        >
          {citation}
        </li>
      ))}
    </ul>
  );
}

export function MindMapCard({ mindmap }: { mindmap: MindMap }) {
  const [expanded, setExpanded] = useState(false);
  const root = mindmap.nodes.find((node) => node.id === mindmap.rootId);
  const branches = mindmap.nodes.filter((node) => node.id !== mindmap.rootId);

  return (
    <section
      className={`rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm ${
        expanded ? "fixed inset-6 z-40 overflow-auto p-6" : "mt-4"
      }`}
      aria-label="Mind map do Adaptive Tutor tạo"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
            Gợi ý theo ngữ cảnh
          </span>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">
            Sơ đồ để nối lại các ý
          </h3>
        </div>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
          type="button"
          aria-label={expanded ? "Thu nhỏ mind map" : "Phóng to mind map"}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "x" : "+"}
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {root && (
          <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
            <strong className="block text-base text-slate-900">{root.label}</strong>
            <div className="mt-3">
              <Citations citations={root.citations} />
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {branches.map((node) => (
            <div
              className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4"
              key={node.id}
            >
              <span className="block text-sm font-medium leading-6 text-slate-800">
                {node.label}
              </span>
              <div className="mt-3">
                <Citations citations={node.citations} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {mindmap.edges.some((edge) => edge.label) && (
        <ul className="mt-5 space-y-2 text-sm text-slate-600" aria-label="Mối liên hệ">
          {mindmap.edges
            .filter((edge) => edge.label)
            .map((edge) => (
              <li
                className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3"
                key={`${edge.source}-${edge.target}`}
              >
                {edge.label}
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

export function QuizSuggestion({
  loading,
  onAccept,
  onDecline,
}: {
  loading: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <section className="mt-4 rounded-[1.75rem] border border-amber-100 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.16),_transparent_40%),_#fffdf8] p-5 shadow-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
        Bước học tiếp theo
      </span>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">
        Có muốn kiểm tra nhanh không
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Nếu em muốn, mình sẽ tạo 1 câu hỏi ngắn để kiểm tra xem mình đã nắm rõ ý chính chưa.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          type="button"
          disabled={loading}
          onClick={onAccept}
        >
          {loading ? "Đang chuẩn bị..." : "Bắt đầu"}
        </button>
        <button
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          type="button"
          disabled={loading}
          onClick={onDecline}
        >
          Để sau
        </button>
      </div>
    </section>
  );
}

export function QuizCard({ quiz }: { quiz: Quiz }) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const isCorrect = answered && selected === quiz.correctIndex;

  return (
    <section className="mt-4 rounded-[1.75rem] border border-emerald-100 bg-[linear-gradient(180deg,#fcfdf8_0%,#f6fbf8_100%)] p-5 shadow-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
        Kiểm tra nhanh
      </span>
      <fieldset className="mt-3">
        <legend className="text-base font-semibold leading-7 text-slate-900">
          {quiz.question}
        </legend>
        <div className="mt-4 space-y-3">
          {quiz.choices.map((choice, index) => (
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-[1.25rem] border px-4 py-3 text-sm transition ${
                answered && index === quiz.correctIndex
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : answered && selected === index
                    ? "border-rose-300 bg-rose-50 text-rose-900"
                    : selected === index
                      ? "border-amber-300 bg-amber-50 text-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
              key={choice}
            >
              <input
                className="mt-1 h-4 w-4 accent-emerald-600"
                type="radio"
                name={`quiz-${quiz.question}`}
                checked={selected === index}
                disabled={answered}
                onChange={() => setSelected(index)}
              />
              <span
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  answered && index === quiz.correctIndex
                    ? "bg-emerald-600 text-white"
                    : answered && selected === index
                      ? "bg-rose-600 text-white"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span className="leading-6">{choice}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {answered && (
        <div
          className={`mt-4 rounded-[1.25rem] border px-4 py-4 ${
            isCorrect
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
          role="status"
        >
          <div className="flex items-center justify-between gap-3">
            <strong className="text-sm font-semibold">
              {isCorrect ? "Chính xác" : "Chưa đúng"}
            </strong>
            {!isCorrect && (
              <span className="text-xs font-medium text-slate-600">
                Đáp án đúng: {String.fromCharCode(65 + quiz.correctIndex)}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-6">{quiz.explanation}</p>
          <div className="mt-3">
            <Citations citations={quiz.citations} />
          </div>
        </div>
      )}
    </section>
  );
}

export function MindmapImageCard({
  artifact,
}: {
  artifact: MindmapImageArtifact;
}) {
  if (!artifact.imageDataUrl) {
    return null;
  }

  return (
    <section className="mt-4 rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(180deg,#f8fcff_0%,#f2f8ff_100%)] p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
        Ảnh mindmap
      </div>
      <img
        className="mt-3 w-full rounded-[1.25rem] border border-slate-200 bg-white object-contain"
        src={artifact.imageDataUrl}
        alt="Mindmap tổng hợp từ nội dung hội thoại"
      />
      {(artifact.note || artifact.model) && (
        <div className="mt-3 text-xs text-slate-600">
          {artifact.note || `Model: ${artifact.model}`}
        </div>
      )}
    </section>
  );
}

export { Citations };
