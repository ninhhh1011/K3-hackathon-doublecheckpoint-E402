import type {
  ChatMessage,
  ComposerState,
  MindMap,
  MindMapEdge,
  MindMapNode,
  NextAction,
  Quiz,
  TutorTurn,
} from "./types";

const ACTIONS = new Set<NextAction>([
  "mindmap",
  "quiz_suggested",
  "no_tool",
  "safe_reply",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validCitations(
  citations: unknown,
  allowedSourceIds: readonly string[],
  required: boolean,
): citations is string[] {
  if (
    !Array.isArray(citations) ||
    !citations.every(isNonEmptyString) ||
    (required && citations.length === 0)
  ) {
    return false;
  }

  const allowed = new Set(allowedSourceIds);
  return citations.every((citation) => allowed.has(citation));
}

function parseMessage(
  value: unknown,
  sourceIds: readonly string[],
): ChatMessage | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    (value.role !== "student" && value.role !== "tutor") ||
    !isNonEmptyString(value.content) ||
    !validCitations(value.citations, sourceIds, false)
  ) {
    return null;
  }

  return {
    id: value.id,
    role: value.role,
    content: value.content,
    citations: value.citations,
  };
}

function parseMindMap(
  value: unknown,
  sourceIds: readonly string[],
): MindMap | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.rootId) ||
    !Array.isArray(value.nodes) ||
    value.nodes.length < 3 ||
    value.nodes.length > 7 ||
    !Array.isArray(value.edges)
  ) {
    return null;
  }

  const nodes: MindMapNode[] = [];
  for (const node of value.nodes) {
    if (
      !isRecord(node) ||
      !isNonEmptyString(node.id) ||
      !isNonEmptyString(node.label) ||
      !validCitations(node.citations, sourceIds, true)
    ) {
      return null;
    }
    nodes.push({
      id: node.id,
      label: node.label,
      citations: node.citations,
    });
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  if (nodeIds.size !== nodes.length || !nodeIds.has(value.rootId)) {
    return null;
  }

  const edges: MindMapEdge[] = [];
  for (const edge of value.edges) {
    if (
      !isRecord(edge) ||
      !isNonEmptyString(edge.source) ||
      !isNonEmptyString(edge.target) ||
      !nodeIds.has(edge.source) ||
      !nodeIds.has(edge.target) ||
      (edge.label !== undefined && typeof edge.label !== "string")
    ) {
      return null;
    }
    edges.push({
      source: edge.source,
      target: edge.target,
      ...(edge.label ? { label: edge.label } : {}),
    });
  }

  return { rootId: value.rootId, nodes, edges };
}

export function normalizeTutorTurn(
  value: unknown,
  sourceIds: readonly string[],
): TutorTurn | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.nextAction) ||
    !ACTIONS.has(value.nextAction as NextAction)
  ) {
    return null;
  }

  const message = parseMessage(value.message, sourceIds);
  if (!message) {
    return null;
  }

  const nextAction = value.nextAction as NextAction;
  if (
    (nextAction === "mindmap" || nextAction === "quiz_suggested") &&
    sourceIds.length === 0
  ) {
    return null;
  }
  if (nextAction === "mindmap") {
    const mindmap = parseMindMap(value.mindmap, sourceIds);
    return mindmap ? { message, nextAction, mindmap } : null;
  }

  return { message, nextAction };
}

export function validateQuiz(
  value: unknown,
  sourceIds: readonly string[],
): value is Quiz {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.question) ||
    !Array.isArray(value.choices) ||
    value.choices.length !== 4 ||
    !value.choices.every(isNonEmptyString) ||
    new Set(value.choices).size !== 4 ||
    !Number.isInteger(value.correctIndex) ||
    (value.correctIndex as number) < 0 ||
    (value.correctIndex as number) > 3 ||
    !isNonEmptyString(value.explanation)
  ) {
    return false;
  }

  return validCitations(value.citations, sourceIds, true);
}

export function composerFailed(
  state: ComposerState,
  error: string,
): ComposerState {
  return { ...state, sending: false, error };
}
