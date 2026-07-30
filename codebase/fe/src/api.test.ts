import { describe, expect, it } from "vitest";

import { createApiClient } from "./api";

const turnRequest = {
  sessionId: "session-1",
  materialId: "material-1",
  pageNumber: 4,
  sourceIds: ["T04-091"],
  selectedText: "Attention liên hệ các token.",
  message: "Em chưa hiểu ý này.",
};

describe("apiClient", () => {
  it("loads material metadata without inventing reader content", async () => {
    const fetcher: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          id: "material-1",
          title: "Bài học từ API",
          courseCode: "COMP2010",
          pageNumber: 1,
          pageCount: 12,
          sourceIds: ["T04-091"],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const client = createApiClient("", fetcher);

    await expect(client.loadMaterial("material-1")).resolves.toMatchObject({
      id: "material-1",
      pageCount: 12,
    });
  });

  it("posts a tutor turn and returns a validated response", async () => {
    let requestUrl = "";
    let requestBody = "";
    const fetcher: typeof fetch = async (input, init) => {
      requestUrl = String(input);
      requestBody = String(init?.body);
      return new Response(
        JSON.stringify({
          message: {
            id: "m1",
            role: "tutor",
            content: "Mình sẽ sắp xếp lại ý chính.",
            citations: ["T04-091"],
          },
          nextAction: "quiz_suggested",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const client = createApiClient("https://api.example.test", fetcher);
    const response = await client.sendTurn(turnRequest);

    expect(requestUrl).toBe("https://api.example.test/api/v1/tutor/turns");
    expect(JSON.parse(requestBody)).toEqual(turnRequest);
    expect(response.nextAction).toBe("quiz_suggested");
  });

  it("rejects an ungrounded quiz response", async () => {
    const fetcher: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          question: "Attention làm gì?",
          choices: ["Tính liên quan", "Lưu file", "Xóa token"],
          correctIndex: 0,
          explanation: "Theo nguồn.",
          citations: ["T99-999"],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const client = createApiClient("", fetcher);

    await expect(
      client.loadQuiz({
        sessionId: "session-1",
        materialId: "material-1",
        pageNumber: 4,
        sourceIds: ["T04-091"],
      }),
    ).rejects.toThrow("Dữ liệu quiz không hợp lệ.");
  });

  it("posts a quiz decline event", async () => {
    let requestUrl = "";
    let requestBody = "";
    const fetcher: typeof fetch = async (input, init) => {
      requestUrl = String(input);
      requestBody = String(init?.body);
      return new Response(null, { status: 204 });
    };

    const client = createApiClient("https://api.example.test/", fetcher);
    const decline = {
      sessionId: "session-1",
      materialId: "material-1",
      tutorTurnId: "m1",
    };
    await client.declineQuiz(decline);

    expect(requestUrl).toBe("https://api.example.test/api/v1/tutor/declines");
    expect(JSON.parse(requestBody)).toEqual(decline);
  });
});
