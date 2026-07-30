export type SourceId = string;

export type ChatMessage = {
  id: string;
  role: "student" | "tutor";
  content: string;
  citations: SourceId[];
};

export type MindMapNode = {
  id: string;
  label: string;
  citations: SourceId[];
};

export type MindMapEdge = {
  source: string;
  target: string;
  label?: string;
};

export type MindMap = {
  rootId: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
};

export type Quiz = {
  question: string;
  choices: [string, string, string];
  correctIndex: 0 | 1 | 2;
  explanation: string;
  citations: SourceId[];
};

export type NextAction =
  | "mindmap"
  | "quiz_suggested"
  | "no_tool"
  | "safe_reply";

export type TutorTurn = {
  message: ChatMessage;
  nextAction: NextAction;
  mindmap?: MindMap;
};

export type ComposerState = {
  draft: string;
  sending: boolean;
  error: string | null;
};

export type Material = {
  id: string;
  title: string;
  courseCode: string;
  pageNumber: number;
  pageCount: number;
  documentUrl?: string;
  sourceIds: SourceId[];
};

export type TutorTurnRequest = {
  sessionId: string;
  materialId: string;
  pageNumber: number;
  sourceIds: SourceId[];
  selectedText?: string;
  message: string;
};

export type QuizRequest = {
  sessionId: string;
  materialId: string;
  pageNumber: number;
  sourceIds: SourceId[];
};

export type QuizDeclineRequest = {
  sessionId: string;
  materialId: string;
  tutorTurnId: string;
};
