import { History, MessageSquareText, Plus, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

import type { ChatMessage, PendingContext } from "../reading-assistant.types";
import { MindmapImageCard, QuizCard, QuizSuggestion } from "./Artifacts";
import ChatInput from "./ChatInput";

type ChatPanelProps = {
  assistantName?: string;
  description?: string;
  activePage: number;
  messages: ChatMessage[];
  pendingContexts: PendingContext[];
  draft: string;
  onDraftChange: (value: string) => void;
  onRemoveContext: (id: string) => void;
  onAttachFile: (file: File) => void;
  onSend: () => void;
  onAcceptQuizOffer: (messageId: string) => void;
  onDeclineQuizOffer: (messageId: string) => void;
  onNewConversation: () => void;
  isStreaming: boolean;
};

function contextLabel(context: PendingContext): string {
  if (context.type === "text") {
    return `Trích đoạn trang ${context.pageNumber}`;
  }
  if (context.type === "image") {
    return `Ảnh đính kèm trang ${context.pageNumber}`;
  }
  return `Tệp ${context.fileName}`;
}

export default function ChatPanel({
  assistantName = "VLearn Tutor",
  description = "Trợ lý đọc tài liệu và giải thích theo ngữ cảnh trang hiện tại",
  activePage,
  messages,
  pendingContexts,
  draft,
  onDraftChange,
  onRemoveContext,
  onAttachFile,
  onSend,
  onAcceptQuizOffer,
  onDeclineQuizOffer,
  onNewConversation,
  isStreaming,
}: ChatPanelProps) {
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = chatScrollRef.current;
    if (!node) {
      return;
    }
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <header className="border-b border-slate-200 bg-[linear-gradient(135deg,#112332_0%,#1f4259_65%,#3c6d70_100%)] px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg shadow-slate-900/15">
              <Sparkles className="h-5 w-5 text-amber-200" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{assistantName}</h2>
              <p className="truncate text-sm text-slate-200">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 transition hover:bg-white/15"
              type="button"
              aria-label="Lịch sử hội thoại"
            >
              <History className="h-4 w-4" />
            </button>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 transition hover:bg-white/15"
              type="button"
              onClick={onNewConversation}
              aria-label="Tạo hội thoại mới"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Trang slide: {activePage}
          </span>
          <span className="text-slate-200">
            {isStreaming
              ? "Agent đang xử lý và phát trace theo thời gian thực..."
              : "Sẵn sàng nhận câu hỏi mới"}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
            <MessageSquareText className="h-4 w-4" />
            Trò chuyện
          </div>
          <div
            ref={chatScrollRef}
            className="trace-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4"
          >
            <div className="rounded-[1.75rem] border border-amber-100 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.18),_transparent_38%),_#fffdf8] p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
                AI Reading Assistant
              </div>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">
                Đọc từng trang, chèn ngữ cảnh rồi hỏi AI
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Bạn có thể bôi đen văn bản từ PDF hoặc đính kèm ảnh và tệp trực tiếp vào khung chat.
                Tất cả attachment sẽ nằm ngay trong composer cho tới khi bạn xóa hoặc gửi.
              </p>
            </div>

            {messages.map((message) => (
              <article
                key={message.id}
                className={`max-w-[92%] rounded-[1.5rem] px-4 py-3 text-sm shadow-sm ${
                  message.role === "user"
                    ? "ml-auto bg-slate-900 text-white"
                    : message.role === "system"
                      ? "border border-dashed border-amber-200 bg-amber-50 text-slate-700"
                      : "border border-slate-200 bg-white text-slate-800"
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">
                  {message.role === "user"
                    ? "Bạn"
                    : message.role === "assistant"
                      ? "VLearn Tutor"
                      : "Ngữ cảnh"}
                </div>
                <p className="mt-2 whitespace-pre-wrap leading-6">{message.content}</p>
                {message.quiz && (
                  <div className="mt-4">
                    <QuizCard quiz={message.quiz} />
                  </div>
                )}
                {message.mindmapImage && (
                  <MindmapImageCard artifact={message.mindmapImage} />
                )}
                {!message.quiz && message.quizOffer && (
                  <QuizSuggestion
                    loading={isStreaming}
                    onAccept={() => onAcceptQuizOffer(message.id)}
                    onDecline={() => onDeclineQuizOffer(message.id)}
                  />
                )}
                {message.contexts && message.contexts.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.contexts.map((context) => (
                      <div
                        key={context.id}
                        className="rounded-2xl bg-white/90 px-3 py-2 text-xs text-slate-700"
                      >
                        {contextLabel(context)}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
          <ChatInput
            draft={draft}
            pendingContexts={pendingContexts}
            onDraftChange={onDraftChange}
            onRemoveContext={onRemoveContext}
            onAttachFile={onAttachFile}
            onSend={onSend}
            disabled={isStreaming}
          />
        </section>
      </div>
    </aside>
  );
}
