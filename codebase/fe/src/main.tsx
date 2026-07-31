import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

import App from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Không tìm thấy phần tử #root.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
