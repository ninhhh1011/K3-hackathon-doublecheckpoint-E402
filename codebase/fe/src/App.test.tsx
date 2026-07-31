import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("AI Reading Assistant shell", () => {
  it("renders the split reading and trace experience", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("AI Reading Assistant");
    expect(html).toContain("VLearn Tutor");
    expect(html).toContain("Đổi theme");
    expect(html).toContain("Upload PDF để bắt đầu đọc");
    expect(html).toContain("Agent Trace");
  });
});
