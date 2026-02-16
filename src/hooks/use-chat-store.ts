"use client";

import { useState, useCallback, useEffect, useRef, useSyncExternalStore } from "react";
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

function readLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function readSettings(): AppSettings {
  const stored = readLocalStorage<AppSettings | null>(SETTINGS_KEY, null);
  if (!stored) return DEFAULT_SETTINGS;
  // Deep merge: preserves user choices while adding new fields from defaults
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    apiKeys: {
      ...DEFAULT_SETTINGS.apiKeys,
      ...(stored.apiKeys || {}),
    },
  };
}

// SSR-safe hydration detection using useSyncExternalStore
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function useHydrated(): boolean {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
}

export function useChatStore() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => readLocalStorage(SESSIONS_KEY, []));
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => readSettings());
  const hydrated = useHydrated();

  // Persist sessions (skip first render to avoid writing hydrated state back)
  const sessionsInitRef = useRef(false);
  useEffect(() => {
    if (!sessionsInitRef.current) {
      sessionsInitRef.current = true;
      return;
    }
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch {
      console.warn("[store] Failed to persist sessions to localStorage (quota?)");
    }
  }, [sessions]);

  // Persist settings
  const settingsInitRef = useRef(false);
  useEffect(() => {
    if (!settingsInitRef.current) {
      settingsInitRef.current = true;
      return;
    }
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      console.warn("[store] Failed to persist settings to localStorage (quota?)");
    }
  }, [settings]);

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
      try {
        // Only save metadata (no text) — text is too large for localStorage.
        // Files restored from localStorage will have empty text and need re-upload for full context.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const metadata = files.map(({ text: _t, ...rest }) => ({
          ...rest,
          text: "",
        }));
        localStorage.setItem(FILES_PREFIX + sessionId, JSON.stringify(metadata));
      } catch {
        console.warn("[store] Failed to persist file contexts to localStorage (quota?)");
      }
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
    try {
      localStorage.setItem(MESSAGES_PREFIX + sessionId, JSON.stringify(messages));
    } catch {
      console.warn("[store] Failed to persist messages to localStorage (quota?)");
    }
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
