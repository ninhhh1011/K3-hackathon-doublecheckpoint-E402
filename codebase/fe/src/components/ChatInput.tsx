import { Paperclip, Plus, SendHorizonal } from "lucide-react";
import { useRef } from "react";

import type { PendingContext } from "../reading-assistant.types";
import ContextChip from "./ContextChip";

type ChatInputProps = {
  draft: string;
  pendingContexts: PendingContext[];
  onDraftChange: (value: string) => void;
  onRemoveContext: (id: string) => void;
  onAttachFile: (file: File) => void;
  onSend: () => void;
  disabled?: boolean;
};

export default function ChatInput({
  draft,
  pendingContexts,
  onDraftChange,
  onRemoveContext,
  onAttachFile,
  onSend,
  disabled = false,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="border-t border-slate-200 bg-white/90 p-4 backdrop-blur">
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="image/*,.pdf"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          if (file) {
            onAttachFile(file);
          }
          event.target.value = "";
        }}
      />

      <div className="rounded-[1.9rem] border border-slate-800 bg-[#1f1f1f] p-4 shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
        {pendingContexts.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-3">
            {pendingContexts.map((context) => (
              <ContextChip key={context.id} context={context} onRemove={onRemoveContext} />
            ))}
          </div>
        )}

        <div className="flex items-end gap-3">
          <button
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            aria-label="Thêm ảnh hoặc tệp"
          >
            <Plus className="h-7 w-7" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3 border-l border-white/25 pl-4">
            <Paperclip className="h-5 w-5 shrink-0 text-slate-400" />
            <textarea
              className="min-h-12 flex-1 resize-none bg-transparent py-2 text-lg text-white outline-none placeholder:text-slate-400"
              placeholder="Hỏi VLearn Tutor"
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSend();
                }
              }}
              disabled={disabled}
            />
          </div>

          <button
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            onClick={onSend}
            disabled={disabled || (!draft.trim() && pendingContexts.length === 0)}
            aria-label="Gửi câu hỏi"
          >
            <SendHorizonal className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
