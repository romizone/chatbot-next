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
    getFileContexts,
    saveFileContexts,
    hydrated,
  } = useChatStore();

  const [files, setFiles] = useState<FileContext[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const prevMessagesRef = useRef<string>("");
  const saveMessagesRef = useRef(saveMessages);
  saveMessagesRef.current = saveMessages;

  // Always-current ref for files — synced every render
  const filesRef = useRef<FileContext[]>(files);
  filesRef.current = files;

  // Refs for transport body — these are read asynchronously when body() is called
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Pending files: set right before sendMessage, read by transport body()
  const pendingFilesRef = useRef<FileContext[]>([]);

  // Stored file contexts for the current session (persisted in localStorage)
  const sessionFilesRef = useRef<FileContext[]>([]);

  const saveFileContextsRef = useRef(saveFileContexts);
  saveFileContextsRef.current = saveFileContexts;
  const getFileContextsRef = useRef(getFileContexts);
  getFileContextsRef.current = getFileContexts;

  // Create transport ONCE — body is a function that reads refs at call time
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => {
          // Merge: new uploaded files + stored session files (deduplicated by id)
          const newFiles = pendingFilesRef.current;
          const storedFiles = sessionFilesRef.current;
          const allFilesMap = new Map<string, FileContext>();
          for (const f of storedFiles) allFilesMap.set(f.id, f);
          for (const f of newFiles) allFilesMap.set(f.id, f);
          return {
            provider: settingsRef.current.provider,
            model: settingsRef.current.model,
            fileContexts: Array.from(allFilesMap.values()),
          };
        },
      }),
    []
  );

  const {
    messages,
    setMessages,
    sendMessage,
    status,
  } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";

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

  const isNewSessionRef = useRef(false);

  useEffect(() => {
    if (currentSessionId && hydrated) {
      if (isNewSessionRef.current) {
        isNewSessionRef.current = false;
        sessionFilesRef.current = [];
      } else {
        const stored = getMessages(currentSessionId);
        setMessages(
          stored.map((m) => ({
            id: m.id,
            role: m.role,
            parts: [{ type: "text" as const, text: m.content }],
          }))
        );
        setFiles([]);
        // Restore stored file contexts for this session
        sessionFilesRef.current = getFileContextsRef.current(currentSessionId);
      }
    } else {
      setMessages([]);
      setFiles([]);
      sessionFilesRef.current = [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId, hydrated]);

  useEffect(() => {
    if (!currentSessionId || !hydrated) return;
    const serialized = JSON.stringify(simpleMessages);
    if (serialized !== prevMessagesRef.current && simpleMessages.length > 0) {
      prevMessagesRef.current = serialized;
      saveMessagesRef.current(currentSessionId, simpleMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simpleMessages, currentSessionId, hydrated]);

  // Auto-continue: detect truncated responses and auto-send "lanjutkan"
  const autoContinueCountRef = useRef(0);

  useEffect(() => {
    if (status !== "ready" || simpleMessages.length === 0) return;
    const lastMsg = simpleMessages[simpleMessages.length - 1];
    if (lastMsg.role !== "assistant") return;

    const content = lastMsg.content.trim();

    // Check if response looks truncated:
    // 1. Ends with "[LANJUT]" (explicit continuation marker)
    // 2. Ends mid-table row (line ends with | but no complete row closure)
    // 3. Ends mid-word (last line has no sentence-ending punctuation and content is long enough)
    const endsWithLanjut = content.endsWith("[LANJUT]");
    const lastLine = content.split("\n").pop() || "";
    const endsInTable = lastLine.includes("|") && !lastLine.trim().endsWith("|") && content.length > 500;
    const isTruncatedMid = content.length > 1000 && !/[.!?\n]$/.test(content) && !content.endsWith("|");

    const shouldContinue = endsWithLanjut || endsInTable || isTruncatedMid;

    if (shouldContinue) {
      // Max 5 auto-continues to prevent infinite loop
      if (autoContinueCountRef.current >= 5) {
        autoContinueCountRef.current = 0;
        return;
      }
      autoContinueCountRef.current += 1;
      const timer = setTimeout(() => {
        sendMessage({ text: "lanjutkan" });
      }, 800);
      return () => clearTimeout(timer);
    } else {
      // Reset counter when response finishes naturally
      autoContinueCountRef.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, simpleMessages]);

  const handleSend = useCallback(
    (content: string) => {
      // Use ref (always current) instead of closure `files` which may be stale
      const newFiles = [...filesRef.current];
      pendingFilesRef.current = newFiles;

      let sessionId = currentSessionId;
      if (!sessionId) {
        isNewSessionRef.current = true;
        sessionId = createSession();
      }

      // If there are new files, merge with session files and persist
      if (newFiles.length > 0) {
        const merged = new Map<string, FileContext>();
        for (const f of sessionFilesRef.current) merged.set(f.id, f);
        for (const f of newFiles) merged.set(f.id, f);
        sessionFilesRef.current = Array.from(merged.values());
        saveFileContextsRef.current(sessionId, sessionFilesRef.current);
      }

      // sendMessage triggers transport.sendMessages which calls body()
      // body() reads pendingFilesRef + sessionFilesRef at that point
      sendMessage({ text: content });

      // Clear UI files after send
      setFiles([]);
    },
    [currentSessionId, createSession, sendMessage]
  );

  const handleNewChat = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
    setFiles([]);
    pendingFilesRef.current = [];
    sessionFilesRef.current = [];
  }, [setCurrentSessionId, setMessages]);

  const handleSelectSession = useCallback(
    (id: string) => {
      setCurrentSessionId(id);
    },
    [setCurrentSessionId]
  );

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleClearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const handleFilesUploaded = useCallback((newFiles: FileContext[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
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
