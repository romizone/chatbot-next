export const SUPPORTED_EXTENSIONS = [
  "pdf", "docx", "xlsx", "xls", "csv",
  "png", "jpg", "jpeg", "bmp", "tiff", "tif", "webp",
  "txt", "md", "json", "xml", "html", "log", "py", "js", "ts", "java", "c", "cpp",
];

export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "bmp", "tiff", "tif", "webp"];
export const TEXT_EXTENSIONS = ["txt", "md", "json", "xml", "html", "log", "py", "js", "ts", "java", "c", "cpp"];

export const ACCEPT_FILE_TYPES =
  ".pdf,.docx,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.bmp,.tiff,.tif,.webp,.txt,.md,.json,.xml,.html,.log,.py,.js,.ts,.java,.c,.cpp";

export const ANTHROPIC_MODELS = [
  { id: "claude-sonnet-4-5-20250929", name: "Qwen 7B Pro" },
  { id: "claude-haiku-4-5-20251001", name: "Qwen 7B Lite" },
];

export const OPENAI_MODELS = [
  { id: "gpt-4o", name: "Qwen 7B Ultra" },
  { id: "gpt-4o-mini", name: "Qwen 7B Mini" },
  { id: "gpt-4.1", name: "Qwen 7B Max" },
  { id: "gpt-4.1-mini", name: "Qwen 7B Fast" },
];

export const SYSTEM_PROMPT = `Kamu adalah asisten AI lokal bernama Qwen 7B yang membantu menganalisis dokumen dan menjawab pertanyaan. Jawab dalam bahasa yang sama dengan pertanyaan user. Jangan pernah menyebut bahwa kamu adalah Claude, GPT, atau model lain. Kamu adalah Qwen 7B.`;

export const DEFAULT_SETTINGS = {
  provider: "anthropic" as const,
  model: "claude-sonnet-4-5-20250929",
};

export const BADGE_COLORS: Record<string, string> = {
  pdf: "bg-red-500",
  docx: "bg-blue-500",
  doc: "bg-blue-500",
  xlsx: "bg-green-500",
  xls: "bg-green-500",
  csv: "bg-amber-500",
  png: "bg-purple-500",
  jpg: "bg-purple-500",
  jpeg: "bg-purple-500",
  bmp: "bg-purple-500",
  tiff: "bg-purple-500",
  tif: "bg-purple-500",
  webp: "bg-purple-500",
  txt: "bg-gray-500",
  md: "bg-gray-500",
  json: "bg-gray-600",
  xml: "bg-gray-600",
  html: "bg-orange-500",
  py: "bg-yellow-600",
  js: "bg-yellow-500",
  ts: "bg-blue-600",
};
