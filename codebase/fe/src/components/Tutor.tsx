import { type ChangeEvent, type FormEvent, useMemo, useRef, useState } from "react";

import type { createApiClient } from "../api";
import { composerFailed } from "../core";
import type {
  ChatMessage,
  ComposerState,
  Material,
  MindMap,
  Quiz,
  TutorAttachment,
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
  selectedText: string;
  onSelectedTextChange: (value: string) => void;
  onClose: () => void;
};

function newId(prefix: string): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  return `${prefix}-${suffix}`;
}

function inferAttachmentKind(file: File): TutorAttachment["kind"] {
  if (file.type.startsWith("image/")) {
    return "image";
  }
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return "pdf";
  }
  if (
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    file.name.toLowerCase().endsWith(".md")
  ) {
    return "text";
  }
  return "other";
}

async function readImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

async function createAttachment(file: File): Promise<TutorAttachment> {
  const kind = inferAttachmentKind(file);
  const attachment: TutorAttachment = {
    name: file.name,
    kind,
    mimeType: file.type || undefined,
  };

  if (kind === "text") {
    attachment.textContent = (await file.text()).slice(0, 20000);
  }
  if (kind === "image") {
    attachment.imageDataUrl = await readImageDataUrl(file);
  }

  return attachment;
}

export default function Tutor({
  api,
  material,
  selectedText,
  onSelectedTextChange,
  onClose,
}: TutorProps) {
  const sessionId = useMemo(() => newId("session"), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [composer, setComposer] = useState<ComposerState>({
    draft: "",
    sending: false,
    error: null,
  });
  const [quizLoadingId, setQuizLoadingId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<TutorAttachment[]>([]);

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
        selectedText: selectedText.trim() || undefined,
        message: text,
        attachments,
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
      setAttachments([]);
    } catch {
      setComposer((state) =>
        composerFailed(state, "Khong the ket noi Tutor. Noi dung van duoc giu."),
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
        error: "Chua the tao quiz co can cu tu nguon nay.",
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
        error: "Khong the ghi nhan lua chon de sau. Hay thu lai.",
      }));
    } finally {
      setQuizLoadingId(null);
    }
  }

  function resetConversation() {
    setTimeline([]);
    setAttachments([]);
    setComposer({ draft: "", sending: false, error: null });
  }

  async function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    try {
      const nextAttachments = await Promise.all(files.slice(0, 3).map(createAttachment));
      setAttachments((current) => [...current, ...nextAttachments].slice(0, 3));
      setComposer((state) => ({ ...state, error: null }));
    } catch {
      setComposer((state) => ({
        ...state,
        error: "Khong the doc file dinh kem nay.",
      }));
    }
  }

  function removeAttachment(name: string) {
    setAttachments((current) => current.filter((item) => item.name !== name));
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
            <p>Tro ly hoc theo ngu canh</p>
          </div>
        </div>
        <div className="tutor-header-actions">
          <button
            className="icon-button on-dark"
            type="button"
            disabled
            title="Cho API lich su"
            aria-label="Mo lich su tro chuyen"
          >
            ↶
          </button>
          <button
            className="icon-button on-dark"
            type="button"
            onClick={resetConversation}
            aria-label="Bat dau cuoc tro chuyen moi"
          >
            +
          </button>
          <button
            className="icon-button on-dark tutor-close"
            type="button"
            onClick={onClose}
            aria-label="Dong VLearn Tutor"
          >
            ×
          </button>
        </div>
      </header>

      <div className="tutor-context">
        <span className="status-dot" aria-hidden="true" />
        {material
          ? `Ngu canh · Trang ${material.pageNumber}`
          : "Chua co ngu canh bai hoc"}
        {material?.sourceIds.map((sourceId) => (
          <span className="citation-badge" key={sourceId}>
            {sourceId}
          </span>
        ))}
      </div>

      {(selectedText || attachments.length > 0) && (
        <div className="agent-context-panel">
          {selectedText && (
            <label className="context-block">
              <span className="eyebrow">Doan dang hoi</span>
              <textarea
                rows={3}
                value={selectedText}
                onChange={(event) => onSelectedTextChange(event.target.value)}
              />
            </label>
          )}
          {attachments.length > 0 && (
            <div className="context-block">
              <span className="eyebrow">File hoi cung</span>
              <div className="attachment-list">
                {attachments.map((attachment) => (
                  <button
                    className="attachment-chip"
                    key={attachment.name}
                    type="button"
                    onClick={() => removeAttachment(attachment.name)}
                  >
                    <span>{attachment.name}</span>
                    <strong>{attachment.kind}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="chat-scroll" aria-live="polite">
        <div className="welcome-card">
          <span className="eyebrow">Adaptive Tutor</span>
          <h3>Hoi theo dung cho ban dang mac</h3>
          <p>
            Doan boi den la ngu canh de agent giai thich. Neu ban muon so do tu duy
            thi hay noi ro, luc do he thong moi tao mindmap co cau truc.
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
                  {item.message.role === "student" ? "Ban" : "Tutor"}
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
            Tutor dang phan tich ngu canh
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

        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept=".pdf,image/*,.txt,.md,.json"
          multiple
          onChange={handleAttachmentChange}
        />

        <div className="composer-tools">
          <button
            className="tool-button"
            type="button"
            disabled={!material || composer.sending}
            onClick={() => fileInputRef.current?.click()}
          >
            <span aria-hidden="true">+</span>
            Them file hoi cung
          </button>
          {selectedText && (
            <button
              className="selection-badge"
              type="button"
              onClick={() => onSelectedTextChange("")}
            >
              Bo doan boi den
            </button>
          )}
        </div>

        <div className="composer-row">
          <label className="sr-only" htmlFor="tutor-message">
            Cau hoi cho VLearn Tutor
          </label>
          <textarea
            id="tutor-message"
            rows={1}
            value={composer.draft}
            disabled={!material}
            placeholder={
              material
                ? "Hoi ve noi dung dang hoc, hoac yeu cau tao mindmap neu can..."
                : "Chua co tai lieu tu API"
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
            aria-label="Gui cau hoi"
          >
            ↑
          </button>
        </div>
        <p className="composer-note">
          AI co the sai. Mindmap phai la du lieu co cau truc va moi artifact phai co
          nguon hop le truoc khi hien thi.
        </p>
      </form>
    </aside>
  );
}
