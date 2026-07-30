import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("VLearn shell", () => {
  it("renders the tutor shell with demo material fallback", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("VLearn Tutor");
    expect(html).toContain("Tai lieu hoc tap demo");
    expect(html).toContain("VINAI-101");
    expect(html).toContain("Hỏi về nội dung đang học");
    expect(html).not.toContain("Attention lien he cac token");
  });
});
