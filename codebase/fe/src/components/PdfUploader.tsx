import { FileUp, FileText } from "lucide-react";
import { useState } from "react";

type PdfUploaderProps = {
  onFileSelect: (file: File) => void;
};

export default function PdfUploader({ onFileSelect }: PdfUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  function acceptFile(file: File | null | undefined) {
    if (!file || file.type !== "application/pdf") {
      return;
    }
    onFileSelect(file);
  }

  return (
    <label
      className={`flex min-h-[420px] cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed px-8 py-12 text-center transition ${
        isDragging
          ? "border-amber-400 bg-amber-50"
          : "border-slate-300 bg-white/80 hover:border-amber-300 hover:bg-white"
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        acceptFile(event.dataTransfer.files?.[0]);
      }}
    >
      <input
        className="hidden"
        type="file"
        accept="application/pdf"
        onChange={(event) => acceptFile(event.target.files?.[0])}
      />
      <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-slate-900 text-white shadow-lg shadow-slate-900/10">
        <FileUp className="h-9 w-9" />
      </div>
      <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700">
        Tải tài liệu lên
      </div>
      <h2 className="mt-3 font-display text-3xl text-slate-900">
        Upload PDF để bắt đầu đọc
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
        Kéo thả file PDF vào đây hoặc bấm để chọn file. Sau khi tải lên, trình xem
        chỉ hiển thị một trang tại một thời điểm để bạn tập trung đọc, highlight,
        chọn vùng hỏi AI và theo dõi trace.
      </p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
        <FileText className="h-4 w-4" />
        Chỉ hỗ trợ tệp PDF
      </div>
    </label>
  );
}
