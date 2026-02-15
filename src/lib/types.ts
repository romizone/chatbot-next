export interface FileContext {
  id: string;
  filename: string;
  extension: string;
  text: string;
  error: string | null;
  size: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  provider: "anthropic" | "openai";
  model: string;
}
