import { useState } from "react";

import type { MindMap, Quiz } from "../types";

function Citations({ citations }: { citations: string[] }) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <ul className="citations" aria-label="Nguồn tham chiếu">
      {citations.map((citation) => (
        <li className="citation-badge" key={citation}>
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
      className={`artifact-card mindmap-card${expanded ? " is-expanded" : ""}`}
      aria-label="Mind map do Adaptive Tutor tạo"
    >
      <div className="artifact-heading">
        <div>
          <span className="eyebrow">Gợi ý theo ngữ cảnh</span>
          <h3>Sơ đồ để nối lại các ý</h3>
        </div>
        <button
          className="icon-button artifact-expand"
          type="button"
          aria-label={expanded ? "Thu nhỏ mind map" : "Phóng to mind map"}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "×" : "↗"}
        </button>
      </div>

      <div className="mindmap-visual">
        {root && (
          <div className="mindmap-node mindmap-root">
            <strong>{root.label}</strong>
            <Citations citations={root.citations} />
          </div>
        )}
        <div className="mindmap-rail" aria-hidden="true" />
        <div className="mindmap-branches">
          {branches.map((node) => (
            <div className="mindmap-node" key={node.id}>
              <span>{node.label}</span>
              <Citations citations={node.citations} />
            </div>
          ))}
        </div>
      </div>

      {mindmap.edges.some((edge) => edge.label) && (
        <ul className="edge-notes" aria-label="Mối liên hệ">
          {mindmap.edges
            .filter((edge) => edge.label)
            .map((edge) => (
              <li key={`${edge.source}-${edge.target}`}>{edge.label}</li>
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
    <section className="artifact-card quiz-suggestion">
      <span className="eyebrow">Bước học tiếp theo</span>
      <h3>Bạn đã nắm được ý chính</h3>
      <p>Thử một câu kiểm tra nhanh để chắc rằng kiến thức đã rõ nhé?</p>
      <div className="artifact-actions">
        <button
          className="button button-primary"
          type="button"
          disabled={loading}
          onClick={onAccept}
        >
          {loading ? "Đang chuẩn bị…" : "Bắt đầu"}
        </button>
        <button
          className="button button-secondary"
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
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = selected === quiz.correctIndex;

  return (
    <section className="artifact-card quiz-card">
      <span className="eyebrow">Kiểm tra nhanh</span>
      <fieldset>
        <legend>{quiz.question}</legend>
        <div className="quiz-options">
          {quiz.choices.map((choice, index) => (
            <label
              className={`quiz-option${
                submitted && index === quiz.correctIndex ? " is-correct" : ""
              }${
                submitted && selected === index && !isCorrect
                  ? " is-incorrect"
                  : ""
              }`}
              key={choice}
            >
              <input
                type="radio"
                name={`quiz-${quiz.question}`}
                checked={selected === index}
                disabled={submitted}
                onChange={() => setSelected(index)}
              />
              <span className="choice-index">
                {String.fromCharCode(65 + index)}
              </span>
              <span>{choice}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {!submitted ? (
        <button
          className="button button-primary quiz-submit"
          type="button"
          disabled={selected === null}
          onClick={() => setSubmitted(true)}
        >
          Kiểm tra đáp án
        </button>
      ) : (
        <div
          className={`quiz-feedback ${isCorrect ? "is-success" : "is-error"}`}
          role="status"
        >
          <strong>{isCorrect ? "Chính xác" : "Chưa đúng"}</strong>
          <p>{quiz.explanation}</p>
          <Citations citations={quiz.citations} />
        </div>
      )}
    </section>
  );
}

export { Citations };
