"use client";

import { useRef, useState, useCallback } from "react";
import { Paperclip, ArrowUp, Loader2 } from "lucide-react";
import { ACCEPT_FILE_TYPES } from "@/lib/constants";
import type { FileContext } from "@/lib/types";
import { FilePreview } from "./file-preview";

interface Props {
  onSend: (message: string) => void;
  onFilesUploaded: (files: FileContext[]) => void;
  files: FileContext[];
  onRemoveFile: (id: string) => void;
  onClearFiles: () => void;
  isLoading: boolean;
  isUploading: boolean;
  setIsUploading: (v: boolean) => void;
}

export function ChatInput({
  onSend,
  onFilesUploaded,
  files,
  onRemoveFile,
  onClearFiles,
  isLoading,
  isUploading,
  setIsUploading,
}: Props) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(selectedFiles).forEach((f) => formData.append("files", f));

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.files) {
        onFilesUploaded(data.files);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-[760px] mx-auto px-4 pb-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <FilePreview files={files} onRemove={onRemoveFile} onClearAll={onClearFiles} />
        <div className="flex items-end gap-2 px-3 py-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mb-0.5"
            title="Attach file"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_FILE_TYPES}
            onChange={handleFileSelect}
            className="hidden"
          />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Tulis pesan..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-gray-900 placeholder-gray-400 text-[15px] leading-relaxed focus:outline-none max-h-[200px] py-1.5"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-xl flex-shrink-0 mb-0.5 transition-colors ${
              input.trim() && !isLoading
                ? "bg-gray-900 text-white hover:bg-gray-700"
                : "bg-gray-100 text-gray-300 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
      <p className="text-[11px] text-purple-900 text-center mt-2">
        <strong>Local ChatBot Qwen 7B dapat membuat kesalahan. Periksa informasi penting.</strong>
      </p>
    </div>
  );
}
