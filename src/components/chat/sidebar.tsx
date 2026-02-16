"use client";

import { Bot, Plus, Settings, Trash2, MessageSquare, PanelLeftClose, PanelLeft, Zap, ZapOff } from "lucide-react";
import type { ChatSession, AppSettings } from "@/lib/types";
import { ANTHROPIC_MODELS, OPENAI_MODELS, DEEPSEEK_MODELS } from "@/lib/constants";

const PROVIDER_LABELS: Record<string, string> = {
  deepseek: "DeepSeek",
  openai: "OpenAI",
  anthropic: "Claude",
};

interface Props {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  onToggle: () => void;
  settings: AppSettings;
}

export function Sidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onOpenSettings,
  isOpen,
  onToggle,
  settings,
}: Props) {
  const hasKey = !!(settings.apiKeys[settings.provider]);
  const providerLabel = PROVIDER_LABELS[settings.provider] || settings.provider;
  const allModels = settings.provider === "anthropic"
    ? ANTHROPIC_MODELS
    : settings.provider === "deepseek"
      ? DEEPSEEK_MODELS
      : OPENAI_MODELS;
  const modelLabel = allModels.find((m) => m.id === settings.model)?.name || settings.model;
  return (
    <>
      {/* Toggle button when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-4 left-4 z-50 p-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <PanelLeft className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-[280px] bg-gray-50 border-r border-gray-200 flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">
              Open Chatbot
            </span>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        {/* API connection indicator */}
        <button
          onClick={onOpenSettings}
          className={`mx-3 mt-3 flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${
            hasKey
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              : "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
          }`}
        >
          {hasKey ? (
            <Zap className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <ZapOff className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <div className="flex flex-col items-start min-w-0">
            <span className="font-medium">
              {hasKey ? `Terhubung — ${providerLabel}` : "Tidak terhubung"}
            </span>
            <span className={`truncate w-full ${hasKey ? "text-emerald-500" : "text-red-400"}`}>
              {hasKey ? modelLabel : "API key belum diisi"}
            </span>
          </div>
        </button>

        {/* New chat button */}
        <div className="px-3 py-3">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Chat Baru
          </button>
        </div>

        {/* Chat history */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {sessions.length === 0 && (
            <p className="text-xs text-gray-400 text-center mt-8">
              Belum ada riwayat chat
            </p>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                currentSessionId === session.id
                  ? "bg-gray-200 text-gray-900"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              onClick={() => onSelectSession(session.id)}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm truncate flex-1">{session.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                className="p-1 rounded-lg hover:bg-gray-300 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Settings button */}
        <div className="px-3 py-3 border-t border-gray-200">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-gray-100 text-gray-600 text-sm transition-colors"
          >
            <Settings className="w-4 h-4" />
            Pengaturan
          </button>
        </div>
      </div>
    </>
  );
}
