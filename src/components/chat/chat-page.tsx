"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useChatStore } from "@/hooks/use-chat-store";
import type { FileContext } from "@/lib/types";
import { Sidebar } from "./sidebar";
import { ChatArea } from "./chat-area";
import { ChatInput } from "./chat-input";
import { SettingsDialog } from "./settings-dialog";

function getTextFromParts(parts: { type: string; text?: string }[]): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
}

export function ChatPage() {
  const {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    settings,
    updateSettings,
    createSession,
    deleteSession,
    getMessages,
    saveMessages,
    hydrated,
  } = useChatStore();

  const [files, setFiles] = useState<FileContext[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const prevMessagesRef = useRef<string>("");

  // Use refs so the transport body closure always gets latest values
  // without needing to recreate transport (which resets useChat state)
  // Update refs synchronously during render (not in useEffect which runs after)
  const filesRef = useRef<FileContext[]>(files);
  filesRef.current = files;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Create transport ONCE - body uses refs for latest values
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => {
          const currentFiles = filesRef.current;
          console.log("[transport body] files count:", currentFiles.length);
          if (currentFiles.length > 0) {
            console.log("[transport body] first file:", currentFiles[0].filename);
          }
          return {
            provider: settingsRef.current.provider,
            model: settingsRef.current.model,
            fileContexts: currentFiles,
          };
        },
      }),
    [] // intentionally empty - transport is stable
  );

  const {
    messages,
    setMessages,
    sendMessage,
    status,
  } = useChat({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Convert UIMessage[] to simple format for rendering
  const simpleMessages = useMemo(
    () =>
      messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: getTextFromParts(m.parts as { type: string; text?: string }[]),
        })),
    [messages]
  );

  // Load messages when switching sessions
  useEffect(() => {
    if (currentSessionId && hydrated) {
      const stored = getMessages(currentSessionId);
      setMessages(
        stored.map((m) => ({
          id: m.id,
          role: m.role,
          parts: [{ type: "text" as const, text: m.content }],
        }))
      );
      setFiles([]);
    } else {
      setMessages([]);
      setFiles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId, hydrated]);

  // Save messages when they change
  useEffect(() => {
    if (!currentSessionId || !hydrated) return;
    const serialized = JSON.stringify(simpleMessages);
    if (serialized !== prevMessagesRef.current && simpleMessages.length > 0) {
      prevMessagesRef.current = serialized;
      saveMessages(currentSessionId, simpleMessages);
    }
  }, [simpleMessages, currentSessionId, saveMessages, hydrated]);

  const handleSend = useCallback(
    (content: string) => {
      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = createSession();
      }
      sendMessage({ text: content });
    },
    [currentSessionId, createSession, sendMessage]
  );

  const handleNewChat = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
    setFiles([]);
  }, [setCurrentSessionId, setMessages]);

  const handleSelectSession = useCallback(
    (id: string) => {
      setCurrentSessionId(id);
    },
    [setCurrentSessionId]
  );

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      filesRef.current = updated;
      return updated;
    });
  }, []);

  const handleClearFiles = useCallback(() => {
    filesRef.current = [];
    setFiles([]);
  }, []);

  const handleFilesUploaded = useCallback((newFiles: FileContext[]) => {
    setFiles((prev) => {
      const updated = [...prev, ...newFiles];
      filesRef.current = updated; // sync ref immediately
      return updated;
    });
  }, []);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={deleteSession}
        onOpenSettings={() => setSettingsOpen(true)}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "ml-[280px]" : "ml-0"
        }`}
      >
        <ChatArea
          messages={simpleMessages}
          isLoading={isLoading}
        />
        <ChatInput
          onSend={handleSend}
          onFilesUploaded={handleFilesUploaded}
          files={files}
          onRemoveFile={handleRemoveFile}
          onClearFiles={handleClearFiles}
          isLoading={isLoading}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
        />
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSettingsChange={updateSettings}
      />
    </div>
  );
}
