<div align="center">

# <img src="public/icon.svg" width="40" height="40" alt="icon" /> Open Chatbot

### Zero File Leakage AI Chatbot — Your Documents Never Leave Your Server

**An AI chatbot that prevents document data leakage.**
PDF, Word, Excel, and image files are **never sent raw** to AI providers.
Only **sliced text JSON chunks** are transmitted — and **nothing is stored** by inference APIs.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![AI SDK](https://img.shields.io/badge/AI_SDK-6-FF6B35?style=for-the-badge)](https://sdk.vercel.ai/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[The Problem](#-the-problem-document-data-leakage) · [The Solution](#-how-open-chatbot-solves-it) · [How It Works](#-how-it-works-technically) · [Quick Start](#-quick-start) · [Features](#-full-features)

</div>

---

## 🚨 The Problem: Document Data Leakage

Many companies and individuals want to leverage AI to analyze internal documents — financial reports, contracts, HR data, medical records, legal documents — but face serious risks:

| Risk | Explanation |
|------|------------|
| **Files sent raw to cloud** | When uploading PDF/Word to ChatGPT, Claude, or other AI, the original file is sent to their servers |
| **Binary files stored on AI servers** | `.pdf`, `.docx`, `.xlsx` files are stored temporarily or permanently on AI provider infrastructure |
| **Metadata leakage** | Filenames, author info, revision history, hidden comments are all transmitted |
| **No control** | Once a file is sent, you have no control over data retention and usage |
| **Compliance violation** | Violates GDPR, HIPAA, SOC 2, or internal corporate policies |

> **Real-world example:** You upload a Q4 financial report to ChatGPT. The 5MB PDF is sent in full to OpenAI's servers — including metadata, embedded images, hidden text, and revision history. You have no idea how long that file is retained.

---

## ✅ How Open Chatbot Solves It

Open Chatbot uses a **Local Processing + Text-Only Inference** architecture that ensures original files never leave your infrastructure:

```
  YOUR INFRASTRUCTURE (On-Premise / VPS)              CLOUD (AI Provider)
  ==========================================          =======================

  📄 PDF  📝 DOCX  📊 XLSX  🖼️ Image              OpenAI / Claude /
       |                                             DeepSeek API
       v
  +-----------------------+                          Only receives:
  | LOCAL FILE PROCESSOR  |                          ✅ Sliced text (JSON)
  | • PDF → pdftotext     |                          ✅ User questions
  | • DOCX → mammoth      |     text JSON            ✅ System prompt
  | • XLSX → SheetJS      | ─────────────────────►
  | • Image → Tesseract   |   (max 30KB/file)       Never receives:
  | • OCR scanned docs    |                          ❌ Original files (binary)
  +-----------------------+                          ❌ Images / scans
       |                                             ❌ Document metadata
       v                                             ❌ Revision history
  🗑️ File deleted from                               ❌ Hidden content
     memory after                                    ❌ Embedded objects
     text extraction
```

### Security Principles

| Principle | Implementation |
|-----------|---------------|
| **Files never sent to AI** | Files are processed locally → only extracted text is transmitted |
| **Text is sliced** | Each file is capped at max **30KB of text** before being sent as a JSON chunk |
| **No server storage** | Files are buffered in memory, extracted, then **immediately deleted** from temp |
| **Stateless API inference** | DeepSeek, OpenAI, Claude APIs do not store data from API calls |
| **API keys in browser** | Keys stored in browser localStorage, never on the server |
| **Zero binary transfer** | What's sent to AI: `{"role":"system","content":"text..."}` — not files |

---

## 🔬 How It Works Technically

### 1. Upload & Local Processing

When a user uploads a file, **all processing happens on your own server**:

```
POST /api/upload  →  FormData { files: [File] }
                            |
                            v
               ┌─────────────────────┐
               │  file-processor.ts  │
               │                     │
               │  PDF ──► pdftotext  │  CLI tool (poppler)
               │  PDF ──► OCR       │  tesseract CLI (fallback for scanned docs)
               │  DOCX ──► mammoth   │  npm library
               │  DOC ──► word-ext   │  npm library
               │  XLSX ──► SheetJS   │  npm library
               │  IMG ──► tesseract  │  OCR engine
               │  TXT ──► buffer     │  native Node.js
               └─────────┬───────────┘
                         │
                         v
               { id, filename, text, size }  ← JSON response
                                               (text only, not the file)
```

**What happens in memory:**
1. File is buffered as a `Buffer` in RAM
2. Text is extracted by the appropriate library
3. Buffer and temp files are **immediately deleted** after extraction
4. Only a `string` of text is returned to the client

### 2. Sending to AI Provider

When the user sends a message, **only JSON text is sent to the AI API**:

```typescript
// What is ACTUALLY sent to the API (from chat/route.ts)
{
  "model": "deepseek-chat",
  "system": "You are an AI assistant...\n\n=== File: report.pdf ===\nExtracted text here (max 30KB)...\n=== End File ===",
  "messages": [
    { "role": "user", "content": "Analyze this financial report" }
  ],
  "max_tokens": 8192,
  "stream": true
}
```

**Notice:**
- There is no `file`, `attachment`, or `binary` in the payload
- The `system` field contains **plain text** from extraction, not a file
- Each file context is **truncated** to max 30,000 characters (`fc.text.slice(0, 30000)`)
- Responses are streamed as `text-delta` chunks — not stored on the server

### 3. Why AI Providers Don't Store Your Data

| Provider | API Policy |
|----------|-----------|
| **OpenAI** | Data from API calls is **not used for training** and not permanently stored (unlike the ChatGPT web interface) |
| **Anthropic** | API calls are **not stored** for model training. Limited retention for abuse monitoring only |
| **DeepSeek** | API follows minimal data retention policy for inference |

> **Note:** This applies to usage via **API** (which Open Chatbot uses), not via web interfaces (ChatGPT/Claude web). Web interfaces have different policies.

---

## 📊 Comparison: Open Chatbot vs Direct Upload to AI

| Aspect | Upload to ChatGPT/Claude Web | Open Chatbot |
|--------|------------------------------|-------------|
| Original file sent to cloud | ✅ Yes, full file | ❌ No, text only |
| Binary/images transmitted | ✅ Yes | ❌ No |
| Document metadata transmitted | ✅ Yes (author, revisions) | ❌ No |
| Data used for training | ⚠️ Possibly (depends on settings) | ❌ No (API mode) |
| File stored on AI server | ⚠️ Temporarily/permanently | ❌ No file at all |
| Data retention control | ❌ Minimal | ✅ Full (self-hosted) |
| Compliance friendly | ⚠️ Requires review | ✅ Data stays on-premise |
| Data size transmitted | Full file (MBs) | Text only (max 30KB/file) |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- An API key from at least one provider: [DeepSeek](https://platform.deepseek.com/), [OpenAI](https://platform.openai.com/), or [Anthropic](https://console.anthropic.com/)
- *(Optional)* `poppler-utils` and `tesseract-ocr` for PDF OCR

### Install & Run

```bash
# Clone the repository
git clone https://github.com/romizone/chatbot-next.git
cd chatbot-next

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → click **Settings** → select a provider → enter your API key → start chatting!

### Environment Variables (Optional)

Create a `.env.local` file for server-side fallback keys:

```env
DEEPSEEK_API_KEY=sk-...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Install OCR Tools (Optional, for scanned PDFs & images)

```bash
# macOS
brew install poppler tesseract tesseract-lang

# Ubuntu/Debian
sudo apt install poppler-utils tesseract-ocr tesseract-ocr-eng

# Windows (via chocolatey)
choco install poppler tesseract
```

---

## 🎯 Full Features

### Multi-Provider AI Engine

| Provider | Models | Max Output |
|----------|--------|------------|
| **DeepSeek** | DeepSeek Chat, DeepSeek Reasoner | 8K - 16K tokens |
| **OpenAI** | GPT-4o, GPT-4o Mini, GPT-4.1, GPT-4.1 Mini | 16K - 32K tokens |
| **Anthropic** | Claude Sonnet 4.5, Claude Haiku 4.5 | 8K - 16K tokens |

### Local Document Processing

| Format | Engine | Capability |
|--------|--------|-----------|
| PDF | `pdftotext` CLI + Tesseract OCR | Text extraction + OCR for scanned PDFs (max 20 pages) |
| DOCX | `mammoth` | Full text and formatting extraction |
| DOC | `word-extractor` | Legacy Word document support |
| XLSX/XLS | `xlsx` (SheetJS) | Spreadsheet to structured text (CSV per sheet) |
| CSV | `xlsx` (SheetJS) | Direct parsing |
| Images | `tesseract` CLI | OCR: PNG, JPG, BMP, TIFF, WebP |
| Text | Native `Buffer` | TXT, MD, JSON, XML, HTML, source code (20+ formats) |

### Core Features

- **Zero File Leakage** — Files processed locally, only text sent to AI via JSON
- **Per-Provider API Keys** — Each provider has its own key slot in browser localStorage
- **Real-time Connection Indicator** — Green/red status in sidebar
- **Auto-Continue** — Detects truncated responses and automatically requests continuation
- **LaTeX Math (KaTeX)** — Mathematical formula rendering: `$inline$` and `$$block$$`
- **Syntax Highlighting** — Code blocks with language detection (Prism theme)
- **Multi-Session** — Chat history with multiple sessions
- **File Context Persistence** — File contexts preserved per session
- **Responsive UI** — Collapsible sidebar, Tailwind CSS + Radix UI
- **Streaming Response** — Real-time responses via Vercel AI SDK `streamText`

---

## 🏗️ Architecture

```
chatbot-next/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts          # Streaming chat endpoint (multi-provider)
│   │   │   └── upload/route.ts        # Local file processing endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── chat/
│   │   │   ├── chat-page.tsx          # Main orchestrator
│   │   │   ├── chat-area.tsx          # Message display area
│   │   │   ├── chat-input.tsx         # Input with file upload
│   │   │   ├── chat-message.tsx       # Message bubble
│   │   │   ├── markdown-renderer.tsx  # Markdown + KaTeX + syntax highlight
│   │   │   ├── settings-dialog.tsx    # Provider & API key settings
│   │   │   ├── sidebar.tsx            # Session list + connection indicator
│   │   │   └── welcome-screen.tsx     # Landing screen
│   │   └── ui/                        # Radix UI primitives
│   ├── hooks/
│   │   └── use-chat-store.ts          # State management (localStorage)
│   └── lib/
│       ├── constants.ts               # Model list, system prompt, defaults
│       ├── file-processor.ts          # Local document processing engine
│       └── types.ts                   # TypeScript interfaces
├── public/
├── package.json
└── README.md
```

### Data Flow

```
User uploads file ─────────────────────────────────────────────────
       │
       ▼
POST /api/upload
       │
       ▼
file-processor.ts ── [PDF → pdftotext] ── [DOCX → mammoth]
       │              [XLSX → SheetJS]     [IMG → tesseract OCR]
       │
       ▼
JSON response: { filename, text, size }    ← text only, file deleted
       │
       ▼
Browser stores text in memory
       │
       ▼
User sends message
       │
       ▼
POST /api/chat ──► { messages, provider, model, apiKey, fileContexts }
       │
       ▼
Build system prompt + file text (sliced max 30KB/file)
       │
       ▼
streamText() to AI Provider ──► text-delta chunks ──► UI
       │
       ▼
AI only receives JSON text, never file binaries
```

---

## 🐳 Deployment

### Self-Hosted (Recommended for Enterprise)

For maximum data privacy, deploy on your own infrastructure:

```bash
npm run build
npm start
```

### Docker

```dockerfile
FROM node:18-alpine

# Install OCR tools (optional)
RUN apk add --no-cache poppler-utils tesseract-ocr

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t open-chatbot .
docker run -p 3000:3000 open-chatbot
```

### Vercel

```bash
npx vercel
```

> **Note:** On Vercel (serverless), OCR features require the Tesseract binary which may not be available. Use Docker deployment for full OCR support.

---

## 🔒 Security Summary

| Aspect | Detail |
|--------|--------|
| **File Processing** | 100% local on your server, files deleted after extraction |
| **Data to AI Provider** | Plain text JSON chunks only (max 30KB/file) |
| **API Keys** | Stored in browser localStorage, sent per-request via HTTPS |
| **File Binaries** | Never sent to AI providers |
| **Document Metadata** | Stripped during extraction — only text content |
| **Temp Files** | Auto-cleanup after processing (using `finally` blocks) |
| **Data Retention** | Chat history in browser localStorage only |
| **Network Payload** | JSON `{ role, content }` — not multipart/form-data files |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **UI** | React 19, Tailwind CSS 4, Radix UI, Lucide Icons |
| **AI Integration** | Vercel AI SDK 6 (`streamText`, `createUIMessageStream`) |
| **Document Processing** | pdftotext (poppler), mammoth, word-extractor, SheetJS, Tesseract |
| **Math Rendering** | KaTeX, remark-math, rehype-katex |
| **Code Highlighting** | react-syntax-highlighter (Prism) |
| **Language** | TypeScript 5 (strict mode) |

---

## 🤝 Contributing

Contributions are welcome! Feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built to prevent document data leakage when using AI.**

Your files stay on your server. Only text goes to the cloud.

Made with ❤️ by [Romi Nur Ismanto](https://github.com/romizone)

</div>
