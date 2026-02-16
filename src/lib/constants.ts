export const SUPPORTED_EXTENSIONS = [
  "pdf", "doc", "docx", "xlsx", "xls", "csv",
  "png", "jpg", "jpeg", "bmp", "tiff", "tif", "webp",
  "txt", "md", "json", "xml", "html", "log", "py", "js", "ts", "java", "c", "cpp",
];

export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "bmp", "tiff", "tif", "webp"];
export const TEXT_EXTENSIONS = ["txt", "md", "json", "xml", "html", "log", "py", "js", "ts", "java", "c", "cpp"];

export const ACCEPT_FILE_TYPES =
  ".pdf,.doc,.docx,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.bmp,.tiff,.tif,.webp,.txt,.md,.json,.xml,.html,.log,.py,.js,.ts,.java,.c,.cpp";

export const ANTHROPIC_MODELS = [
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
];

export const OPENAI_MODELS = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "gpt-4.1", name: "GPT-4.1" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini" },
];

export const DEEPSEEK_MODELS = [
  { id: "deepseek-chat", name: "DeepSeek Chat" },
  { id: "deepseek-reasoner", name: "DeepSeek Reasoner" },
];

export const SYSTEM_PROMPT = `Kamu adalah asisten AI bernama Open Chatbot yang membantu menganalisis dokumen dan menjawab pertanyaan. Jawab dalam bahasa yang sama dengan pertanyaan user.

PENTING: Jawaban kamu memiliki batas panjang. Jika membuat tabel perbandingan, buat ringkas dan padat. Gunakan singkatan jika perlu. Jika tabel terlalu panjang, bagi menjadi beberapa bagian dan selesaikan bagian pertama dulu. Di akhir, tulis "[LANJUT]" jika masih ada bagian yang belum disampaikan, sehingga user bisa meminta kelanjutannya.

FORMAT MATEMATIKA: Saat menulis rumus atau ekspresi matematika, SELALU gunakan format LaTeX dengan delimiter:
- Inline math: $rumus$ (contoh: $x^2 + y^2 = z^2$)
- Block/display math: $$rumus$$ (contoh: $$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$)
JANGAN pernah menulis LaTeX tanpa delimiter $ atau $$. JANGAN gunakan \\[...\\] atau \\(...\\).`;

export const DEFAULT_SETTINGS = {
  provider: "deepseek" as const,
  model: "deepseek-chat",
  apiKeys: {
    openai: "",
    anthropic: "",
    deepseek: "",
  },
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
