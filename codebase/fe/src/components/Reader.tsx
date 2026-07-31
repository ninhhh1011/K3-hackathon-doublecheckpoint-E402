import { useEffect, useMemo, useRef, useState } from "react";

import type { ChangeEvent, KeyboardEvent } from "react";

import type { Material } from "../types";

type ReaderProps = {
  material: Material | null;
  loading: boolean;
  error: string | null;
  onOpenTutor: () => void;
  selectedText: string;
  onSelectedTextChange: (value: string) => void;
};

export default function Reader({
  material,
  loading,
  error,
  onOpenTutor,
  selectedText,
  onSelectedTextChange,
}: ReaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const controlsDisabled = !material;
  const canUpload = !loading && !error;
  const activeDocumentUrl = uploadedUrl ?? material?.documentUrl ?? null;
  const documentTitle = uploadedFile?.name ?? material?.title ?? "Tai lieu tai len";

  const uploadHint = useMemo(() => {
    if (uploadedFile) {
      return `Da chon: ${uploadedFile.name}`;
    }
    return "Bam vao noi dung de chon file PDF hoac anh";
  }, [uploadedFile]);

  useEffect(() => {
    if (!uploadedFile) {
      setUploadedUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(uploadedFile);
    setUploadedUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [uploadedFile]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setUploadedFile(nextFile);
    event.target.value = "";
  }

  function handlePaperKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  }

  function focusSelectionInput() {
    selectionInputRef.current?.focus();
  }

  return (
    <section className="reader" aria-label="Tai lieu bai hoc">
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept=".pdf,image/*"
        onChange={handleFileChange}
      />

      <div className="reader-toolbar" role="toolbar" aria-label="Cong cu doc">
        <div className="toolbar-group">
          <button
            className="tool-button is-active"
            type="button"
            aria-pressed="true"
            disabled={!canUpload}
            onClick={openFilePicker}
          >
            <span aria-hidden="true">⌁</span>
            Tai file
          </button>
          <button className="tool-button" type="button" disabled>
            <span aria-hidden="true">✎</span>
            But
          </button>
          <button
            className={`tool-button${selectedText ? " is-active" : ""}`}
            type="button"
            onClick={focusSelectionInput}
          >
            <span aria-hidden="true">⌇</span>
            Highlight
          </button>
        </div>

        <div className="page-context">
          {material
            ? `Trang ${material.pageNumber} / ${material.pageCount}`
            : "Chua co trang"}
        </div>

        <div className="toolbar-group zoom-controls">
          <button
            className="icon-button"
            type="button"
            aria-label="Thu nho"
            disabled={controlsDisabled}
          >
            −
          </button>
          <span>100%</span>
          <button
            className="icon-button"
            type="button"
            aria-label="Phong to"
            disabled={controlsDisabled}
          >
            +
          </button>
        </div>
      </div>

      <div className="reader-stage">
        <div
          className={`paper${canUpload ? " is-uploadable" : ""}`}
          role={canUpload ? "button" : undefined}
          tabIndex={canUpload ? 0 : undefined}
          aria-label={canUpload ? "Chon file tai lieu" : undefined}
          onClick={canUpload ? openFilePicker : undefined}
          onKeyDown={canUpload ? handlePaperKeyDown : undefined}
        >
          {loading && (
            <div className="reader-state" aria-live="polite">
              <div className="loading-orbit" aria-hidden="true" />
              <h1>Dang tai tai lieu</h1>
              <p>Reader dang lay metadata tu API cua VLearn.</p>
            </div>
          )}

          {!loading && error && (
            <div className="reader-state">
              <span className="state-icon error-icon" aria-hidden="true">
                !
              </span>
              <h1>Khong the mo tai lieu</h1>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && !material && (
            <div className="reader-state">
              <span className="state-icon" aria-hidden="true">
                ◫
              </span>
              <span className="eyebrow">Reader API-ready</span>
              <h1>Chua chon tai lieu</h1>
              <p>
                Them <code>materialId</code> vao URL de Reader tai dung noi dung
                tu API.
              </p>
              <code className="url-example">?materialId=...</code>
              <p className="upload-hint">{uploadHint}</p>
            </div>
          )}

          {!loading && !error && material && !activeDocumentUrl && (
            <div className="reader-state">
              <span className="state-icon" aria-hidden="true">
                ◫
              </span>
              <span className="eyebrow">{material.courseCode}</span>
              <h1>{material.title}</h1>
              <p>
                Metadata da san sang. Backend chua tra <code>documentUrl</code>{" "}
                de hien thi noi dung.
              </p>
              <p className="upload-hint">{uploadHint}</p>
            </div>
          )}

          {!loading && !error && activeDocumentUrl && (
            <>
              <div className="upload-chip" aria-live="polite">
                <span className="eyebrow">Noi dung</span>
                <strong>{documentTitle}</strong>
                <span>{uploadHint}</span>
              </div>
              <iframe
                className="document-frame"
                src={activeDocumentUrl}
                title={documentTitle}
              />
            </>
          )}
        </div>

        <button
          className="tutor-handle"
          type="button"
          onClick={onOpenTutor}
          aria-label="Mo VLearn Tutor"
        >
          <span aria-hidden="true">✦</span>
        </button>
      </div>

      <div className="selection-panel">
        <div className="selection-copy">
          <span className="eyebrow">Selection Context</span>
          <strong>Doan ban muon AI giai thich</strong>
        </div>
        <textarea
          ref={selectionInputRef}
          rows={3}
          value={selectedText}
          placeholder="Dan hoac nhap doan vua boi den de gui cung cau hoi."
          onChange={(event) => onSelectedTextChange(event.target.value)}
        />
      </div>

      <div className="reader-footer">
        <button
          className="icon-button"
          type="button"
          aria-label="Trang truoc"
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
