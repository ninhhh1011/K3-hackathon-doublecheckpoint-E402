import type { Material } from "../types";

type ReaderProps = {
  material: Material | null;
  loading: boolean;
  error: string | null;
  onOpenTutor: () => void;
};

export default function Reader({
  material,
  loading,
  error,
  onOpenTutor,
}: ReaderProps) {
  const controlsDisabled = !material;

  return (
    <section className="reader" aria-label="Tài liệu bài học">
      <div className="reader-toolbar" role="toolbar" aria-label="Công cụ đọc">
        <div className="toolbar-group">
          <button
            className="tool-button is-active"
            type="button"
            aria-pressed="true"
          >
            <span aria-hidden="true">⌁</span>
            Đọc
          </button>
          <button className="tool-button" type="button" disabled>
            <span aria-hidden="true">✎</span>
            Bút
          </button>
          <button className="tool-button" type="button" disabled>
            <span aria-hidden="true">⌇</span>
            Highlight
          </button>
        </div>

        <div className="page-context">
          {material
            ? `Trang ${material.pageNumber} / ${material.pageCount}`
            : "Chưa có trang"}
        </div>

        <div className="toolbar-group zoom-controls">
          <button
            className="icon-button"
            type="button"
            aria-label="Thu nhỏ"
            disabled={controlsDisabled}
          >
            −
          </button>
          <span>100%</span>
          <button
            className="icon-button"
            type="button"
            aria-label="Phóng to"
            disabled={controlsDisabled}
          >
            +
          </button>
        </div>
      </div>

      <div className="reader-stage">
        <div className="paper">
          {loading && (
            <div className="reader-state" aria-live="polite">
              <div className="loading-orbit" aria-hidden="true" />
              <h1>Đang tải tài liệu</h1>
              <p>Reader đang lấy metadata từ API của VLearn.</p>
            </div>
          )}

          {!loading && error && (
            <div className="reader-state">
              <span className="state-icon error-icon" aria-hidden="true">
                !
              </span>
              <h1>Không thể mở tài liệu</h1>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && !material && (
            <div className="reader-state">
              <span className="state-icon" aria-hidden="true">
                ◫
              </span>
              <span className="eyebrow">Reader API-ready</span>
              <h1>Chưa chọn tài liệu</h1>
              <p>
                Thêm <code>materialId</code> vào URL để Reader tải đúng nội dung
                từ API.
              </p>
              <code className="url-example">?materialId=…</code>
            </div>
          )}

          {!loading && !error && material && !material.documentUrl && (
            <div className="reader-state">
              <span className="state-icon" aria-hidden="true">
                ◫
              </span>
              <span className="eyebrow">{material.courseCode}</span>
              <h1>{material.title}</h1>
              <p>
                Metadata đã sẵn sàng. Backend chưa trả <code>documentUrl</code>{" "}
                để hiển thị nội dung.
              </p>
            </div>
          )}

          {!loading && !error && material?.documentUrl && (
            <iframe
              className="document-frame"
              src={material.documentUrl}
              title={material.title}
            />
          )}
        </div>

        <button
          className="tutor-handle"
          type="button"
          onClick={onOpenTutor}
          aria-label="Mở VLearn Tutor"
        >
          <span aria-hidden="true">✦</span>
        </button>
      </div>

      <div className="reader-footer">
        <button
          className="icon-button"
          type="button"
          aria-label="Trang trước"
          disabled={controlsDisabled || material?.pageNumber === 1}
        >
          ‹
        </button>
        <span>
          {material
            ? `Trang ${material.pageNumber} / ${material.pageCount}`
            : "Trang — / —"}
        </span>
        <button
          className="icon-button"
          type="button"
          aria-label="Trang sau"
          disabled={
            controlsDisabled || material?.pageNumber === material?.pageCount
          }
        >
          ›
        </button>
      </div>
    </section>
  );
}
