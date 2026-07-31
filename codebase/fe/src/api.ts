import { normalizeTutorTurn, validateQuiz } from "./core";
import type {
  Material,
  Quiz,
  QuizDeclineRequest,
  QuizRequest,
  TutorTurn,
  TutorTurnRequest,
} from "./types";
import type {
  ChatStreamArtifact,
  ChatStreamCallbacks,
  ChatStreamRequest,
  MindmapImageArtifact,
  PendingContext,
  TraceNodeType,
  TraceStep,
  TraceStreamEvent,
} from "./reading-assistant.types";

type Fetcher = typeof fetch;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.length > 0)
  );
}

function normalizeMaterial(value: unknown): Material | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.courseCode !== "string" ||
    !Number.isInteger(value.pageNumber) ||
    !Number.isInteger(value.pageCount) ||
    (value.pageNumber as number) < 1 ||
    (value.pageCount as number) < (value.pageNumber as number) ||
    (value.documentUrl !== undefined &&
      typeof value.documentUrl !== "string") ||
    !isStringArray(value.sourceIds)
  ) {
    return null;
  }

  return value as Material;
}

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function jsonRequest(
  fetcher: Fetcher,
  url: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetcher(url, init);
  if (!response.ok) {
    throw new Error(`Dịch vụ trả về lỗi ${response.status}.`);
  }
  return response.json();
}

function postJson(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function createApiClient(baseUrl = "", fetcher: Fetcher = fetch) {
  return {
    async loadMaterial(materialId: string): Promise<Material> {
      const value = await jsonRequest(
        fetcher,
        apiUrl(baseUrl, `/api/v1/materials/${encodeURIComponent(materialId)}`),
      );
      const material = normalizeMaterial(value);
      if (!material) {
        throw new Error("Dữ liệu tài liệu không hợp lệ.");
      }
      return material;
    },

    async sendTurn(request: TutorTurnRequest): Promise<TutorTurn> {
      const value = await jsonRequest(
        fetcher,
        apiUrl(baseUrl, "/api/v1/tutor/turns"),
        postJson(request),
      );
      const turn = normalizeTutorTurn(value, request.sourceIds);
      if (!turn) {
        throw new Error("Dữ liệu Tutor không hợp lệ.");
      }
      return turn;
    },

    async loadQuiz(request: QuizRequest): Promise<Quiz> {
      const value = await jsonRequest(
        fetcher,
        apiUrl(baseUrl, "/api/v1/tutor/quiz"),
        postJson(request),
      );
      if (!validateQuiz(value, request.sourceIds)) {
        throw new Error("Dữ liệu quiz không hợp lệ.");
      }
      return value;
    },

    async declineQuiz(request: QuizDeclineRequest): Promise<void> {
      const response = await fetcher(
        apiUrl(baseUrl, "/api/v1/tutor/declines"),
        postJson(request),
      );
      if (!response.ok) {
        throw new Error(`Dịch vụ trả về lỗi ${response.status}.`);
      }
    },
  };
}

type BackendTraceEvent = {
  type: "node_start" | "node_end" | "tool_call" | "tool_result";
  event_id?: string;
  node_name?: string;
  payload?: Record<string, unknown>;
};

type BackendFinalEvent = {
  response: string;
  conversation_id: string;
  sources?: string[];
  quiz?: unknown;
  mindmap_image?: unknown;
  quiz_offer?: unknown;
};

type NormalizedBackendFinalEvent = {
  response: string;
  conversation_id: string;
  sources?: string[];
  quiz: Quiz | null;
  mindmapImage: MindmapImageArtifact | null;
  quizOffer: boolean;
};

function normalizeChatQuiz(value: unknown, sourceIds: readonly string[]): Quiz | null {
  if (!isRecord(value)) {
    return null;
  }
  const candidate = {
    question: value.question,
    choices: value.choices,
    correctIndex: value.correctIndex,
    explanation: value.explanation,
    citations: sourceIds,
  };
  return validateQuiz(candidate, sourceIds) ? (candidate as Quiz) : null;
}

function normalizeQuizOffer(value: unknown): boolean {
  return value === true;
}

function normalizeMindmapImage(value: unknown): MindmapImageArtifact | null {
  if (!isRecord(value) || typeof value.model !== "string" || typeof value.mime_type !== "string") {
    return null;
  }
  const imageDataUrl =
    typeof value.image_data_url === "string" && value.image_data_url.length > 0
      ? value.image_data_url
      : undefined;
  return {
    model: value.model,
    imageDataUrl,
    mimeType: value.mime_type,
    note: typeof value.note === "string" ? value.note : "",
  };
}

function normalizeArtifact(value: unknown): ChatStreamArtifact | null {
  if (!isRecord(value) || value.type !== "mindmap_image") {
    return null;
  }
  const mindmapImage = normalizeMindmapImage(value.mindmap_image);
  if (!mindmapImage) {
    return null;
  }
  return {
    type: "mindmap_image",
    mindmapImage,
  };
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Không thể đọc tệp đính kèm."));
    reader.readAsDataURL(file);
  });
}

async function objectUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Không thể đọc dữ liệu đính kèm trong trình duyệt.");
  }
  return fileToDataUrl(await response.blob());
}

function attachmentKind(context: PendingContext): "image" | "pdf" | "text" | "other" {
  if (context.type === "image") {
    return "image";
  }
  if (context.type === "file" && context.mimeType === "application/pdf") {
    return "pdf";
  }
  if (context.type === "file" && context.mimeType.startsWith("text/")) {
    return "text";
  }
  return "other";
}

function nodeTypeFor(name: string): TraceNodeType {
  if (
    name === "router_planner" ||
    name === "input_guardrail" ||
    name === "output_guardrail"
  ) {
    return "router";
  }
  if (name === "rag_retrieval" || name === "selected_pdf_context") {
    return "retrieval";
  }
  if (name === "llm_generation") {
    return "llm_generation";
  }
  return "tool_call";
}

function nodeLabel(name: string): string {
  const labels: Record<string, string> = {
    router_planner: "Router / Planner",
    input_guardrail: "Input Guardrail",
    output_guardrail: "Output Guardrail",
    parse_current_slide: "Docling đọc slide hiện tại",
    parse_attached_document: "Docling đọc tệp đính kèm",
    understand_image: "Xử lý ảnh đính kèm",
    rag_retrieval: "Hybrid retrieval từ DB",
    gen_question: "Sinh câu hỏi kiểm tra",
    selected_pdf_context: "Nội dung bôi đen từ PDF",
    llm_generation: "Agent Model sinh câu trả lời",
  };
  return labels[name] ?? name;
}

function normalizeTraceEvent(event: BackendTraceEvent): TraceStreamEvent {
  const nodeId = event.node_name ?? "unknown";
  const eventId = event.event_id ?? `${nodeId}-${Date.now()}-${Math.random()}`;
  if (event.type === "node_start" || event.type === "tool_call") {
    return {
      type: "node_start",
      nodeId,
      eventId,
      nodeType: event.type === "tool_call" ? "tool_call" : nodeTypeFor(nodeId),
      label: nodeLabel(nodeId),
      payload: {
        input: event.payload,
        toolName:
          event.type === "tool_call" && typeof event.payload?.tool === "string"
            ? event.payload.tool
            : undefined,
      },
    };
  }
  return {
    type: event.payload?.status === "error" ? "node_error" : "node_end",
    nodeId,
    eventId,
    payload: { output: event.payload },
  };
}

export function applyTraceEvent(current: TraceStep[], event: TraceStreamEvent): TraceStep[] {
  if (event.type === "node_start") {
    const next: TraceStep = {
      id: event.eventId,
      nodeType: event.nodeType,
      label: event.label,
      status: "running",
      startedAt: new Date().toISOString(),
      input: event.payload?.input,
      toolName: event.payload?.toolName,
      branchLabel: event.payload?.branchLabel,
    };
    return [...current, next];
  }
  return current.map((step) =>
    step.id === event.eventId
      ? {
          ...step,
          status: event.type === "node_error" ? "error" : "completed",
          endedAt: new Date().toISOString(),
          output: event.payload?.output,
        }
      : step,
  );
}

async function buildChatBody(request: ChatStreamRequest) {
  const contexts = await Promise.all(
    request.selectedContexts.map(async (context) => {
      if (context.type === "text") {
        return {
          type: "text",
          page_number: context.pageNumber,
          text: context.text,
          bounding_box: context.boundingBoxes[0]
            ? {
                x: context.boundingBoxes[0].x,
                y: context.boundingBoxes[0].y,
                width: context.boundingBoxes[0].width,
                height: context.boundingBoxes[0].height,
              }
            : undefined,
        };
      }
      if (context.type === "image") {
        return {
          type: "image",
          page_number: context.pageNumber,
          image_data_url: await objectUrlToDataUrl(context.imageUrl),
          bounding_box: context.boundingBox.width > 0 ? {
            x: context.boundingBox.x,
            y: context.boundingBox.y,
            width: context.boundingBox.width,
            height: context.boundingBox.height,
          } : undefined,
        };
      }
      return null;
    }),
  );

  const attachments = await Promise.all(
    request.selectedContexts
      .filter((context) => context.type !== "text")
      .map(async (context) => {
        if (context.type === "image") {
          return {
            name: context.fileName ?? `anh-trang-${context.pageNumber}.png`,
            kind: "image",
            purpose: "attachment",
            mime_type: "image/png",
            image_data_url: await objectUrlToDataUrl(context.imageUrl),
          };
        }
        return {
          name: context.fileName,
          kind: attachmentKind(context),
          purpose: "attachment",
          mime_type: context.mimeType,
          file_data_url: await objectUrlToDataUrl(context.fileUrl),
        };
      }),
  );

  if (request.currentDocument) {
    attachments.unshift({
      name: request.currentDocument.name,
      kind: "pdf",
      purpose: "current_document",
      mime_type: request.currentDocument.type || "application/pdf",
      file_data_url: await fileToDataUrl(request.currentDocument),
    });
  }

  return {
    message: request.message,
    stream: true,
    quiz_request: request.quizRequest ?? "none",
    page_number: request.pageNumber,
    history: request.history,
    selected_text: request.selectedContexts
      .filter((context) => context.type === "text")
      .map((context) => context.text)
      .join("\n\n") || undefined,
    contexts: contexts.filter((context) => context !== null),
    attachments,
  };
}

export async function streamVLearnChat(
  request: ChatStreamRequest,
  callbacks: ChatStreamCallbacks,
  baseUrl = import.meta.env.VITE_API_BASE_URL ?? "",
): Promise<NormalizedBackendFinalEvent> {
  const response = await fetch(apiUrl(baseUrl, "/api/v1/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(await buildChatBody(request)),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`API chat trả về lỗi ${response.status}: ${detail}`);
  }
  if (!response.body) {
    throw new Error("Trình duyệt không nhận được luồng streaming từ API.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalEvent: BackendFinalEvent | null = null;

  const consumeBlock = (block: string) => {
    let eventName = "";
    const dataLines: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }
    if (!eventName || dataLines.length === 0) {
      return;
    }
    const data = JSON.parse(dataLines.join("\n"));
    if (eventName === "trace") {
      callbacks.onTrace(normalizeTraceEvent(data as BackendTraceEvent));
    } else if (eventName === "message_delta") {
      callbacks.onDelta(String(data.delta ?? ""));
    } else if (eventName === "artifact") {
      const artifact = normalizeArtifact(data);
      if (artifact) {
        callbacks.onArtifact?.(artifact);
      }
    } else if (eventName === "final") {
      finalEvent = data as BackendFinalEvent;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    blocks.forEach(consumeBlock);
    if (done) {
      if (buffer.trim()) {
        consumeBlock(buffer);
      }
      break;
    }
  }

  if (!finalEvent) {
    throw new Error("Luồng API kết thúc nhưng không có sự kiện final.");
  }
  const resolvedFinalEvent: BackendFinalEvent = finalEvent;
  return {
    ...resolvedFinalEvent,
    quiz: normalizeChatQuiz(
      resolvedFinalEvent.quiz,
      resolvedFinalEvent.sources ?? [],
    ),
    mindmapImage: normalizeMindmapImage(resolvedFinalEvent.mindmap_image),
    quizOffer: normalizeQuizOffer(resolvedFinalEvent.quiz_offer),
  };
}
