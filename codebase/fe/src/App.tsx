import { useEffect, useMemo, useState } from "react";

import { createApiClient } from "./api";
import Reader from "./components/Reader";
import Tutor from "./components/Tutor";
import type { Material } from "./types";

const DEMO_MATERIAL: Material = {
  id: "demo-material",
  title: "Tai lieu hoc tap demo",
  courseCode: "VINAI-101",
  pageNumber: 1,
  pageCount: 12,
  sourceIds: ["SRC-001", "SRC-002", "SRC-003"],
};

function queryMaterialId(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return new URLSearchParams(window.location.search).get("materialId") ?? "";
}

export default function App() {
  const api = useMemo(
    () => createApiClient(import.meta.env.VITE_API_BASE_URL ?? ""),
    [],
  );
  const materialId = useMemo(queryMaterialId, []);
  const [material, setMaterial] = useState<Material | null>(
    materialId ? null : DEMO_MATERIAL,
  );
  const [loading, setLoading] = useState(Boolean(materialId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tutorOpen, setTutorOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!materialId) {
      setMaterial(DEMO_MATERIAL);
      setLoadError(null);
      setLoading(false);
      return;
    }

    let active = true;
    api
      .loadMaterial(materialId)
      .then((value) => {
        if (active) {
          setMaterial(value);
          setLoadError(null);
        }
      })
      .catch(() => {
        if (active) {
          setLoadError("Backend chưa trả được metadata của tài liệu này.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [api, materialId]);

  return (
    <div className="app" data-theme={darkMode ? "dark" : "light"}>
      <header className="app-header">
        <div className="header-leading">
          <button
            className="icon-button header-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => window.history.back()}
          >
            ‹
          </button>
          <a className="brand" href="/" aria-label="VLearn">
            <span className="brand-mark" aria-hidden="true">
              V
            </span>
            <span>VLearn</span>
          </a>
          <div className="document-meta">
            <span className="document-icon" aria-hidden="true">
              ◫
            </span>
            <div>
              <strong>{material?.title ?? "Chưa chọn tài liệu"}</strong>
              <span>{material?.courseCode ?? "Adaptive Tutor prototype"}</span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <span className="language-pill">VI</span>
          <button
            className="icon-button"
            type="button"
            aria-label={
              darkMode ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"
            }
            onClick={() => setDarkMode((value) => !value)}
          >
            {darkMode ? "☀" : "☾"}
          </button>
          <span className="user-pill">
            <span aria-hidden="true">♙</span>
            Sinh viên
          </span>
        </div>
      </header>

      <main className={`workspace${tutorOpen ? "" : " tutor-is-collapsed"}`}>
        <Reader
          material={material}
          loading={loading}
          error={loadError}
          onOpenTutor={() => setTutorOpen(true)}
        />
        {tutorOpen && (
          <Tutor
            api={api}
            material={material}
            onClose={() => setTutorOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
