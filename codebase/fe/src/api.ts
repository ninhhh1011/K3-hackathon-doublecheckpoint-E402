import { normalizeTutorTurn, validateQuiz } from "./core";
import type {
  Material,
  Quiz,
  QuizDeclineRequest,
  QuizRequest,
  TutorTurn,
  TutorTurnRequest,
} from "./types";

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
        apiUrl(baseUrl, `/api/materials/${encodeURIComponent(materialId)}`),
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
        apiUrl(baseUrl, "/api/tutor/turns"),
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
        apiUrl(baseUrl, "/api/tutor/quiz"),
        postJson(request),
      );
      if (!validateQuiz(value, request.sourceIds)) {
        throw new Error("Dữ liệu quiz không hợp lệ.");
      }
      return value;
    },

    async declineQuiz(request: QuizDeclineRequest): Promise<void> {
      const response = await fetcher(
        apiUrl(baseUrl, "/api/tutor/declines"),
        postJson(request),
      );
      if (!response.ok) {
        throw new Error(`Dịch vụ trả về lỗi ${response.status}.`);
      }
    },
  };
}
