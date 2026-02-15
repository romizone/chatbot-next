"use client";

import { useState, useCallback, useEffect } from "react";
import type { ChatSession, AppSettings, FileContext } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { v4 as uuid } from "uuid";

const SESSIONS_KEY = "chatbot-sessions";
const MESSAGES_PREFIX = "chatbot-msgs-";
const FILES_PREFIX = "chatbot-files-";
const SETTINGS_KEY = "chatbot-settings";

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function useChatStore() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const storedSessions = localStorage.getItem(SESSIONS_KEY);
      if (storedSessions) {
        setSessions(JSON.parse(storedSessions));
      }
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        // If stored provider differs from new default, reset to default
        if (parsed.provider !== DEFAULT_SETTINGS.provider) {
          setSettings(DEFAULT_SETTINGS);
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
        } else {
          setSettings(parsed);
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Persist sessions
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }
  }, [sessions, hydrated]);

  // Persist settings
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [settings, hydrated]);

  const createSession = useCallback((): string => {
    const id = uuid();
    const session: ChatSession = {
      id,
      title: "Chat Baru",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSessions((prev) => [session, ...prev]);
    setCurrentSessionId(id);
    return id;
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      localStorage.removeItem(MESSAGES_PREFIX + id);
      localStorage.removeItem(FILES_PREFIX + id);
      if (currentSessionId === id) {
        setCurrentSessionId(null);
      }
    },
    [currentSessionId]
  );

  const updateSessionTitle = useCallback((id: string, title: string) => {
    setSessions((prev) => {
      const session = prev.find((s) => s.id === id);
      // Skip update if title is already the same — prevents infinite re-render loop
      if (session && session.title === title) return prev;
      return prev.map((s) =>
        s.id === id ? { ...s, title, updatedAt: new Date().toISOString() } : s
      );
    });
  }, []);

  const getMessages = useCallback((sessionId: string): StoredMessage[] => {
    try {
      const stored = localStorage.getItem(MESSAGES_PREFIX + sessionId);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const saveFileContexts = useCallback((sessionId: string, files: FileContext[]) => {
    if (files.length > 0) {
      // Only store essential fields to save space (skip large text for storage, keep reference)
      localStorage.setItem(FILES_PREFIX + sessionId, JSON.stringify(files));
    }
  }, []);

  const getFileContexts = useCallback((sessionId: string): FileContext[] => {
    try {
      const stored = localStorage.getItem(FILES_PREFIX + sessionId);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const saveMessages = useCallback((sessionId: string, messages: StoredMessage[]) => {
    localStorage.setItem(MESSAGES_PREFIX + sessionId, JSON.stringify(messages));
    // Update title from first user message
    if (messages.length >= 1) {
      const firstUserMsg = messages.find((m) => m.role === "user");
      if (firstUserMsg) {
        const title = firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? "..." : "");
        updateSessionTitle(sessionId, title);
      }
    }
  }, [updateSessionTitle]);

  const updateSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
  }, []);

  return {
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
  };
}
