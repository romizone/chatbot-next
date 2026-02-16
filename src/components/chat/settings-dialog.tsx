"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ANTHROPIC_MODELS, OPENAI_MODELS, DEEPSEEK_MODELS } from "@/lib/constants";
import type { AppSettings } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  deepseek: "DeepSeek",
  openai: "OpenAI",
  anthropic: "Claude",
};

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: Props) {
  const [showKey, setShowKey] = useState(false);

  const models =
    settings.provider === "anthropic"
      ? ANTHROPIC_MODELS
      : settings.provider === "deepseek"
        ? DEEPSEEK_MODELS
        : OPENAI_MODELS;

  const currentKey = settings.apiKeys[settings.provider] || "";

  const handleKeyChange = (value: string) => {
    onSettingsChange({
      ...settings,
      apiKeys: {
        ...settings.apiKeys,
        [settings.provider]: value,
      },
    });
  };

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
            <div className="grid grid-cols-3 gap-2">
              {(["deepseek", "openai", "anthropic"] as const).map((p) => {
                const hasKey = !!(settings.apiKeys[p]);
                return (
                  <button
                    key={p}
                    onClick={() => {
                      const newModels =
                        p === "anthropic"
                          ? ANTHROPIC_MODELS
                          : p === "deepseek"
                            ? DEEPSEEK_MODELS
                            : OPENAI_MODELS;
                      onSettingsChange({
                        ...settings,
                        provider: p,
                        model: newModels[0].id,
                      });
                      setShowKey(false);
                    }}
                    className={`relative px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      settings.provider === p
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {PROVIDER_LABELS[p]}
                    {/* Key status dot */}
                    <span
                      className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                        hasKey ? "bg-green-400" : "bg-red-400"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              API Key — {PROVIDER_LABELS[settings.provider]}
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={currentKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder={`Masukkan ${PROVIDER_LABELS[settings.provider]} API key...`}
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Key disimpan di browser. Tidak dikirim ke server lain.
            </p>
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
