import { type FormEvent, useMemo, useState } from "react";

import type { createApiClient } from "../api";
import { composerFailed } from "../core";
import type {
  ChatMessage,
  ComposerState,
  Material,
  MindMap,
  Quiz,
} from "../types";
import { Citations, MindMapCard, QuizCard, QuizSuggestion } from "./Artifacts";

type ApiClient = ReturnType<typeof createApiClient>;

type TimelineItem =
  | { kind: "message"; id: string; message: ChatMessage }
  | { kind: "mindmap"; id: string; mindmap: MindMap }
  | { kind: "quiz_suggestion"; id: string; tutorTurnId: string }
  | { kind: "quiz"; id: string; quiz: Quiz };

type TutorProps = {
  api: ApiClient;
  material: Material | null;
  onClose: () => void;
};

function newId(prefix: string): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  return `${prefix}-${suffix}`;
}

export default function Tutor({ api, material, onClose }: TutorProps) {
  const sessionId = useMemo(() => newId("session"), []);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [composer, setComposer] = useState<ComposerState>({
    draft: "",
    sending: false,
    error: null,
  });
  const [quizLoadingId, setQuizLoadingId] = useState<string | null>(null);

  const canSend =
    Boolean(material) && composer.draft.trim().length > 0 && !composer.sending;

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!material || !canSend) {
      return;
    }

    const text = composer.draft.trim();
    const studentMessage: ChatMessage = {
      id: newId("student"),
      role: "student",
      content: text,
      citations: [],
    };
    setTimeline((items) => [
      ...items,
      { kind: "message", id: studentMessage.id, message: studentMessage },
    ]);
    setComposer((state) => ({ ...state, sending: true, error: null }));

    try {
      const turn = await api.sendTurn({
        sessionId,
        materialId: material.id,
        pageNumber: material.pageNumber,
        sourceIds: material.sourceIds,
        message: text,
      });
      setTimeline((items) => {
        const next: TimelineItem[] = [
          ...items,
          { kind: "message", id: turn.message.id, message: turn.message },
        ];
        if (turn.nextAction === "mindmap" && turn.mindmap) {
          next.push({
            kind: "mindmap",
            id: `mindmap-${turn.message.id}`,
            mindmap: turn.mindmap,
          });
        }
        if (turn.nextAction === "quiz_suggested") {
          next.push({
            kind: "quiz_suggestion",
            id: `suggestion-${turn.message.id}`,
            tutorTurnId: turn.message.id,
          });
        }
        return next;
      });
      setComposer({ draft: "", sending: false, error: null });
    } catch {
      setComposer((state) =>
        composerFailed(
          state,
          "Không thể kết nối Tutor. Nội dung vẫn được giữ.",
        ),
      );
    }
  }

  async function acceptQuiz(
    item: Extract<TimelineItem, { kind: "quiz_suggestion" }>,
  ) {
    if (!material) {
      return;
    }
    setQuizLoadingId(item.id);
    setComposer((state) => ({ ...state, error: null }));
    try {
      const quiz = await api.loadQuiz({
        sessionId,
        materialId: material.id,
        pageNumber: material.pageNumber,
        sourceIds: material.sourceIds,
      });
      setTimeline((items) => [
        ...items.filter((entry) => entry.id !== item.id),
        { kind: "quiz", id: `quiz-${item.tutorTurnId}`, quiz },
      ]);
    } catch {
      setComposer((state) => ({
        ...state,
        error: "Chưa thể tạo quiz có căn cứ từ nguồn này.",
      }));
    } finally {
      setQuizLoadingId(null);
    }
  }

  async function declineQuiz(
    item: Extract<TimelineItem, { kind: "quiz_suggestion" }>,
  ) {
    if (!material) {
      return;
    }
    setQuizLoadingId(item.id);
    try {
      await api.declineQuiz({
        sessionId,
        materialId: material.id,
        tutorTurnId: item.tutorTurnId,
      });
      setTimeline((items) => items.filter((entry) => entry.id !== item.id));
    } catch {
      setComposer((state) => ({
        ...state,
        error: "Không thể ghi nhận lựa chọn Để sau. Hãy thử lại.",
      }));
    } finally {
      setQuizLoadingId(null);
    }
  }

  function resetConversation() {
    setTimeline([]);
    setComposer({ draft: "", sending: false, error: null });
  }

  return (
    <aside className="tutor-panel" aria-label="VLearn Tutor">
      <header className="tutor-header">
        <div className="tutor-title">
          <span className="tutor-mark" aria-hidden="true">
            ✦
          </span>
          <div>
            <h2>VLearn Tutor</h2>
            <p>Trợ lý học theo ngữ cảnh</p>
          </div>
        </div>
        <div className="tutor-header-actions">
          <button
            className="icon-button on-dark"
            type="button"
            disabled
            title="TODO: chờ API lịch sử"
            aria-label="Mở lịch sử trò chuyện"
          >
            ↶
          </button>
          <button
            className="icon-button on-dark"
            type="button"
            onClick={resetConversation}
            aria-label="Bắt đầu cuộc trò chuyện mới"
          >
            +
          </button>
          <button
            className="icon-button on-dark tutor-close"
            type="button"
            onClick={onClose}
            aria-label="Đóng VLearn Tutor"
          >
            ×
          </button>
        </div>
      </header>

      <div className="tutor-context">
        <span className="status-dot" aria-hidden="true" />
        {material
          ? `Ngữ cảnh · Trang ${material.pageNumber}`
          : "Chưa có ngữ cảnh bài học"}
        {material?.sourceIds.map((sourceId) => (
          <span className="citation-badge" key={sourceId}>
            {sourceId}
          </span>
        ))}
      </div>

      <div className="chat-scroll" aria-live="polite">
        <div className="welcome-card">
          <span className="eyebrow">Adaptive Tutor</span>
          <h3>Học tiếp theo mức độ bạn hiểu</h3>
          <p>
            Hỏi tự do về bài học. Tutor có thể tự tạo sơ đồ khi bạn còn rối hoặc
            đề nghị một câu kiểm tra khi bạn đã sẵn sàng.
          </p>
        </div>

        {timeline.map((item) => {
          if (item.kind === "message") {
            return (
              <article
                className={`chat-message is-${item.message.role}`}
                key={item.id}
              >
                <span className="message-role">
                  {item.message.role === "student" ? "Bạn" : "Tutor"}
                </span>
                <p>{item.message.content}</p>
                <Citations citations={item.message.citations} />
              </article>
            );
          }
          if (item.kind === "mindmap") {
            return <MindMapCard key={item.id} mindmap={item.mindmap} />;
          }
          if (item.kind === "quiz_suggestion") {
            return (
              <QuizSuggestion
                key={item.id}
                loading={quizLoadingId === item.id}
                onAccept={() => acceptQuiz(item)}
                onDecline={() => declineQuiz(item)}
              />
            );
          }
          return <QuizCard key={item.id} quiz={item.quiz} />;
        })}

        {composer.sending && (
          <div className="typing-indicator" role="status">
            <span />
            <span />
            <span />
            Tutor đang phân tích ngữ cảnh
          </div>
        )}
      </div>

      <form className="composer" onSubmit={sendMessage}>
        {composer.error && (
          <div className="composer-error" role="alert">
            <span aria-hidden="true">!</span>
            {composer.error}
          </div>
        )}
        <div className="composer-row">
          <label className="sr-only" htmlFor="tutor-message">
            Câu hỏi cho VLearn Tutor
          </label>
          <textarea
            id="tutor-message"
            rows={1}
            value={composer.draft}
            disabled={!material}
            placeholder={
              material ? "Hỏi về nội dung đang học…" : "Chưa có tài liệu từ API"
            }
            onChange={(event) =>
              setComposer((state) => ({
                ...state,
                draft: event.target.value,
                error: null,
              }))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            className="send-button"
            type="submit"
            disabled={!canSend}
            aria-label="Gửi câu hỏi"
          >
            ↑
          </button>
        </div>
        <p className="composer-note">
          AI có thể sai. Mọi artifact phải có nguồn hợp lệ trước khi hiển thị.
        </p>
      </form>
    </aside>
  );
}
