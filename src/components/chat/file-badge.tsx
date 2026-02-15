"use client";

import { X } from "lucide-react";
import { BADGE_COLORS } from "@/lib/constants";
import type { FileContext } from "@/lib/types";

interface Props {
  file: FileContext;
  onRemove?: () => void;
}

export function FileBadge({ file, onRemove }: Props) {
  const bgColor = BADGE_COLORS[file.extension] || "bg-gray-500";
  const label = file.extension.toUpperCase().slice(0, 4);

  return (
    <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm group">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold ${bgColor}`}
      >
        {label}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate max-w-[140px]">
          {file.filename}
        </div>
        <div className="text-xs text-gray-400">
          {file.error
            ? "Error"
            : `${(file.size / 1024).toFixed(1)} KB`}
        </div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
