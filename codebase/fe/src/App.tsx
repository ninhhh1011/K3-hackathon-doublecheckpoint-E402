import { MoonStar, ScanText, SunMedium } from "lucide-react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import AgentTraceDrawer from "./components/AgentTraceDrawer";
import ChatPanel from "./components/ChatPanel";
import PdfViewer from "./components/PdfViewer";
import TraceDrawerToggleIcon from "./components/TraceDrawerToggleIcon";
import { applyTraceEvent, streamVLearnChat } from "./api";
import type {
  ChatHistoryItem,
  ChatMessage,
  FileContext,
  HighlightBox,
  ImageContext,
  PendingContext,
  PenStroke,
  TextContext,
  TraceStep,
} from "./reading-assistant.types";

function makeId(prefix: string): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  return `${prefix}-${suffix}`;
}

type SendOptions = {
  draftOverride?: string;
  quizRequest?: "none" | "accept" | "decline";
};

export default function App() {
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightsByPage, setHighlightsByPage] = useState<Record<number, HighlightBox[]>>({});
  const [penStrokesByPage, setPenStrokesByPage] = useState<Record<number, PenStroke[]>>({});
  const [pendingContexts, setPendingContexts] = useState<PendingContext[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([]);
  const [traceDrawerOpen, setTraceDrawerOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [leftWidth, setLeftWidth] = useState(56);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [, setCurrentDocument] = useState<File | null>(null);
  const dragActive = useRef(false);

  useEffect(() => {
    function handleMove(event: MouseEvent) {
      if (!dragActive.current) {
        return;
      }
      const nextWidth = (event.clientX / window.innerWidth) * 100;
      setLeftWidth(Math.max(38, Math.min(68, nextWidth)));
    }

    function handleUp() {
      dragActive.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  const activeContextPage = useMemo(
    () => pendingContexts.at(-1)?.pageNumber ?? currentPage,
    [currentPage, pendingContexts],
  );

  function appendTextContext(context: TextContext) {
    setPendingContexts((current) => [...current, context]);
  }

  function appendAttachment(file: File) {
    if (file.type.startsWith("image/")) {
      const imageContext: ImageContext = {
        id: makeId("image"),
        type: "image",
        pageNumber: currentPage,
        boundingBox: { x: 0, y: 0, width: 0, height: 0 },
        imageUrl: URL.createObjectURL(file),
        fileName: file.name,
      };
      setPendingContexts((current) => [...current, imageContext]);
      return;
    }

    const fileContext: FileContext = {
      id: makeId("file"),
      type: "file",
      pageNumber: currentPage,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileUrl: URL.createObjectURL(file),
    };
    setPendingContexts((current) => [...current, fileContext]);
  }

  async function handleSend(options?: SendOptions) {
    const quizRequest = options?.quizRequest ?? "none";
    const question = options?.draftOverride ?? draft.trim();
    if (isStreaming || (!question && pendingContexts.length === 0 && quizRequest === "none")) {
      return;
    }

    const contextsToSend = pendingContexts;
    const messagePage = contextsToSend.at(-1)?.pageNumber ?? currentPage;
    const historyForBackend: ChatHistoryItem[] = messages
      .filter(
        (message): message is ChatMessage & { role: "user" | "assistant" } =>
          (message.role === "user" || message.role === "assistant") &&
          message.content.trim().length > 0,
      )
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const userMessage: ChatMessage = {
      id: makeId("user"),
      role: "user",
      content:
        question ||
        (quizRequest === "accept"
          ? "Em muon lam 1 cau hoi kiem tra nhanh."
          : quizRequest === "decline"
            ? "De sau nhe."
            : "Giai thich noi dung nay giup em."),
      contexts: contextsToSend,
      pageNumber: messagePage,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setPendingContexts([]);
    setTraceSteps([]);
    setIsStreaming(true);

    const assistantId = makeId("assistant");
    setMessages((current) => [
      ...current,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        pageNumber: messagePage,
      },
    ]);

    try {
      const finalEvent = await streamVLearnChat(
        {
          message: question,
          pageNumber: currentPage,
          selectedContexts: contextsToSend,
          history: historyForBackend,
          quizRequest,
        },
        {
          onTrace: (event) => {
            startTransition(() => {
              setTraceSteps((current) => applyTraceEvent(current, event));
            });
          },
          onDelta: (delta) => {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: `${message.content}${delta}` }
                  : message,
              ),
            );
          },
          onArtifact: (artifact) => {
            if (artifact.type !== "mindmap_image") {
              return;
            }
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, mindmapImage: artifact.mindmapImage }
                  : message,
              ),
            );
          },
        },
      );

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: finalEvent.response,
                quiz: finalEvent.quiz ?? undefined,
                mindmapImage: finalEvent.mindmapImage ?? undefined,
                quizOffer: finalEvent.quizOffer,
              }
            : message,
        ),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Khong the ket noi API chat.";
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, content: `Khong the xu ly cau hoi: ${errorMessage}` }
            : message,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  }

  function resetConversation() {
    setDraft("");
    setPendingContexts([]);
    setTraceSteps([]);
    setMessages([]);
  }

  function dismissQuizOffer(messageId: string) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, quizOffer: false } : message,
      ),
    );
  }

  async function handleAcceptQuizOffer(messageId: string) {
    dismissQuizOffer(messageId);
    await handleSend({ draftOverride: "", quizRequest: "accept" });
  }

  async function handleDeclineQuizOffer(messageId: string) {
    dismissQuizOffer(messageId);
    await handleSend({ draftOverride: "", quizRequest: "decline" });
  }

  const appThemeClass =
    theme === "dark"
      ? "bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.4),_transparent_24%),linear-gradient(180deg,#111827_0%,#0f172a_100%)] text-slate-100"
      : "bg-transparent text-slate-900";

  return (
    <div className={`min-h-screen transition-colors ${appThemeClass}`}>
      <header
        className={`border-b px-5 py-4 backdrop-blur ${
          theme === "dark"
            ? "border-slate-700 bg-slate-900/70"
            : "border-white/70 bg-white/75"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-slate-900 text-white shadow-lg shadow-slate-900/10">
              <ScanText className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">
                AI READING ASSISTANT
              </div>
              <h1
                className={`font-display text-3xl ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                Doc PDF, hoi AI theo ngu canh, xem trace streaming
              </h1>
            </div>
          </div>
          <button
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
              theme === "dark"
                ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
            type="button"
            onClick={() => setTheme((value) => (value === "light" ? "dark" : "light"))}
          >
            {theme === "light" ? (
              <>
                <MoonStar className="h-4 w-4" />
                Doi theme
              </>
            ) : (
              <>
                <SunMedium className="h-4 w-4" />
                Doi theme
              </>
            )}
          </button>
        </div>
      </header>

      <main className="flex h-[calc(100vh-89px)] min-h-[720px] min-w-0 flex-col lg:flex-row">
        <div className="min-h-0 min-w-0" style={{ width: `${leftWidth}%` }}>
          <PdfViewer
            currentPage={currentPage}
            onCurrentPageChange={setCurrentPage}
            highlightsByPage={highlightsByPage}
            penStrokesByPage={penStrokesByPage}
            onHighlightsChange={setHighlightsByPage}
            onPenStrokesChange={setPenStrokesByPage}
            onAddTextContext={appendTextContext}
            onDocumentChange={setCurrentDocument}
          />
        </div>

        <div
          className="hidden w-3 shrink-0 cursor-col-resize items-center justify-center bg-transparent lg:flex"
          onMouseDown={() => {
            dragActive.current = true;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
        >
          <div className="h-24 w-1 rounded-full bg-slate-300" />
        </div>

        <div className="relative min-h-0 min-w-0 flex-1 border-t border-slate-200 lg:border-t-0 lg:border-l">
          <ChatPanel
            activePage={activeContextPage}
            messages={messages}
            pendingContexts={pendingContexts}
            draft={draft}
            onDraftChange={setDraft}
            onRemoveContext={(id) =>
              setPendingContexts((current) => current.filter((item) => item.id !== id))
            }
            onAttachFile={appendAttachment}
            onSend={() => void handleSend()}
            onAcceptQuizOffer={(messageId) => void handleAcceptQuizOffer(messageId)}
            onDeclineQuizOffer={(messageId) => void handleDeclineQuizOffer(messageId)}
            onNewConversation={resetConversation}
            isStreaming={isStreaming}
          />

          <TraceDrawerToggleIcon
            open={traceDrawerOpen}
            onToggle={() => setTraceDrawerOpen((value) => !value)}
          />
          <AgentTraceDrawer
            open={traceDrawerOpen}
            steps={traceSteps}
            onClose={() => setTraceDrawerOpen(false)}
          />
        </div>
      </main>
    </div>
  );
}
