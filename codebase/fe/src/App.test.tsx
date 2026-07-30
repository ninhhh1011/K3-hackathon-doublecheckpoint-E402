import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import App, { resolveMaterialId } from "./App";

describe("VLearn shell", () => {
  it("loads demo slides when materialId is absent", () => {
    expect(resolveMaterialId("")).toBe("demo-slides");
  });

  it("keeps an explicit materialId", () => {
    expect(resolveMaterialId("?materialId=lesson-42")).toBe("lesson-42");
  });

  it("renders the default document loading state without fake lesson content", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("VLearn Tutor");
    expect(html).toContain("Đang tải tài liệu");
    expect(html).not.toContain("Attention liên hệ các token");
  });
});
