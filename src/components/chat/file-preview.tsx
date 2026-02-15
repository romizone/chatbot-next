"use client";

import { FileBadge } from "./file-badge";
import type { FileContext } from "@/lib/types";

interface Props {
  files: FileContext[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function FilePreview({ files, onRemove, onClearAll }: Props) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2">
      {files.map((file) => (
        <FileBadge
          key={file.id}
          file={file}
          onRemove={() => onRemove(file.id)}
        />
      ))}
      {files.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-gray-400 hover:text-gray-600 ml-1"
        >
          Hapus semua
        </button>
      )}
    </div>
  );
}
