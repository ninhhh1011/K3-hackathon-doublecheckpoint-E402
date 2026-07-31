import type { Quiz } from "./types";

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Point = {
  x: number;
  y: number;
};

export type ToolMode = "read" | "pen" | "highlight";

export type HighlightColor =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "orange"
  | "black";

export type HighlightBox = {
  id: string;
  pageNumber: number;
  color: HighlightColor;
  rects: BoundingBox[];
  text?: string;
  note?: string;
};

export type PenStroke = {
  id: string;
  pageNumber: number;
  color: HighlightColor;
  strokeWidth: number;
  points: Point[];
};

export type TextContext = {
  id: string;
  type: "text";
  text: string;
  pageNumber: number;
  boundingBoxes: BoundingBox[];
};

export type ImageContext = {
  id: string;
  type: "image";
  pageNumber: number;
  boundingBox: BoundingBox;
  imageUrl: string;
  fileName?: string;
};

export type FileContext = {
  id: string;
  type: "file";
  pageNumber: number;
  fileName: string;
  mimeType: string;
  fileUrl: string;
};

export type PendingContext = TextContext | ImageContext | FileContext;

export type MindmapImageArtifact = {
  model: string;
  imageDataUrl?: string;
  mimeType: string;
  note: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  quiz?: Quiz;
  mindmapImage?: MindmapImageArtifact;
  quizOffer?: boolean;
  contexts?: PendingContext[];
  pageNumber?: number;
};

export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type TraceStatus = "idle" | "running" | "completed" | "error";

export type TraceNodeType =
  | "router"
  | "tool_call"
  | "retrieval"
  | "llm_generation"
  | "conditional_edge";

export type TraceStep = {
  id: string;
  nodeType: TraceNodeType;
  label: string;
  status: TraceStatus;
  startedAt: string;
  endedAt?: string;
  toolName?: string;
  branchLabel?: string;
  input?: unknown;
  output?: unknown;
};

export type TraceStreamEvent =
  | {
      type: "node_start";
      nodeType: TraceNodeType;
      nodeId: string;
      label: string;
      payload?: { input?: unknown; toolName?: string; branchLabel?: string };
    }
  | {
      type: "node_end";
      nodeId: string;
      payload?: { output?: unknown };
    }
  | {
      type: "node_error";
      nodeId: string;
      payload?: { output?: unknown };
    };

export type ChatStreamArtifact = {
  type: "mindmap_image";
  mindmapImage: MindmapImageArtifact;
};

export type ChatStreamRequest = {
  message: string;
  pageNumber: number;
  selectedContexts: PendingContext[];
  currentDocument: File | null;
  history: ChatHistoryItem[];
  quizRequest?: "none" | "accept" | "decline";
};

export type ChatStreamCallbacks = {
  onTrace: (event: TraceStreamEvent) => void;
  onDelta: (delta: string) => void;
  onArtifact?: (artifact: ChatStreamArtifact) => void;
};
