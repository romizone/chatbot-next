"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ANTHROPIC_MODELS, OPENAI_MODELS } from "@/lib/constants";
import type { AppSettings } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: Props) {
  const models =
    settings.provider === "anthropic" ? ANTHROPIC_MODELS : OPENAI_MODELS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Pengaturan</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Provider */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["anthropic", "openai"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    const newModels =
                      p === "anthropic" ? ANTHROPIC_MODELS : OPENAI_MODELS;
                    onSettingsChange({
                      provider: p,
                      model: newModels[0].id,
                    });
                  }}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    settings.provider === p
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {p === "anthropic" ? "Engine A" : "Engine B"}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Model
            </label>
            <div className="space-y-2">
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() =>
                    onSettingsChange({ ...settings, model: m.id })
                  }
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${
                    settings.model === m.id
                      ? "bg-indigo-50 border-2 border-indigo-500 text-indigo-700 font-medium"
                      : "bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
