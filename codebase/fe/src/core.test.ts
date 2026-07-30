import { describe, expect, it } from "vitest";

import { composerFailed, normalizeTutorTurn, validateQuiz } from "./core";

const sourceIds = ["T04-091"];

describe("Adaptive Tutor trust boundaries", () => {
  it("rejects a mind map whose node cites an unknown source", () => {
    expect(
      normalizeTutorTurn(
        {
          message: {
            id: "m1",
            role: "tutor",
            content: "Mình đã sắp xếp lại ý chính.",
            citations: sourceIds,
          },
          nextAction: "mindmap",
          mindmap: {
            rootId: "n1",
            nodes: [
              { id: "n1", label: "Attention", citations: ["T99-999"] },
              { id: "n2", label: "Token", citations: sourceIds },
              { id: "n3", label: "Context", citations: sourceIds },
            ],
            edges: [
              { source: "n1", target: "n2" },
              { source: "n1", target: "n3" },
            ],
          },
        },
        sourceIds,
      ),
    ).toBeNull();
  });

  it("normalizes quiz_suggested without accepting an early quiz payload", () => {
    expect(
      normalizeTutorTurn(
        {
          message: {
            id: "m2",
            role: "tutor",
            content: "Bạn đã nắm ý chính.",
            citations: sourceIds,
          },
          nextAction: "quiz_suggested",
          quiz: {
            question: "Payload này không được dùng.",
          },
        },
        sourceIds,
      ),
    ).toEqual({
      message: {
        id: "m2",
        role: "tutor",
        content: "Bạn đã nắm ý chính.",
        citations: sourceIds,
      },
      nextAction: "quiz_suggested",
    });
  });

  it("rejects a learning tool action when no source is available", () => {
    expect(
      normalizeTutorTurn(
        {
          message: {
            id: "m3",
            role: "tutor",
            content: "Thử một câu kiểm tra nhé.",
            citations: [],
          },
          nextAction: "quiz_suggested",
        },
        [],
      ),
    ).toBeNull();
  });

  it("rejects a quiz with duplicate choices", () => {
    expect(
      validateQuiz(
        {
          question: "Attention làm gì?",
          choices: ["Tính liên quan", "Tính liên quan", "Xóa token"],
          correctIndex: 0,
          explanation: "Theo nguồn.",
          citations: sourceIds,
        },
        sourceIds,
      ),
    ).toBe(false);
  });

  it("keeps the draft when a request fails", () => {
    expect(
      composerFailed(
        { draft: "Em chưa hiểu attention", sending: true, error: null },
        "Không thể kết nối dịch vụ.",
      ),
    ).toEqual({
      draft: "Em chưa hiểu attention",
      sending: false,
      error: "Không thể kết nối dịch vụ.",
    });
  });
});
