import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("VLearn shell", () => {
  it("renders an API-ready empty state without fake lesson content", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("VLearn Tutor");
    expect(html).toContain("Chưa chọn tài liệu");
    expect(html).toContain("materialId");
    expect(html).toContain("Reader tải đúng nội dung từ API");
    expect(html).not.toContain("Attention liên hệ các token");
  });
});
