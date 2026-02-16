<div align="center">

# <img src="public/icon.svg" width="40" height="40" alt="icon" /> Open Chatbot

### Zero File Leakage AI Chatbot — Your Documents Never Leave Your Server

**Solusi chatbot AI yang mengatasi kebocoran data dokumen perusahaan.**
File PDF, Word, Excel, dan gambar **tidak pernah dikirim mentah** ke AI provider.
Yang dikirim hanya **potongan teks (sliced JSON chunks)** — dan **tidak disimpan** oleh inference API.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![AI SDK](https://img.shields.io/badge/AI_SDK-6-FF6B35?style=for-the-badge)](https://sdk.vercel.ai/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[Masalah](#-masalah-kebocoran-data-dokumen) · [Solusi](#-bagaimana-open-chatbot-mengatasinya) · [Cara Kerja](#-cara-kerja-teknis) · [Quick Start](#-quick-start) · [Fitur](#-fitur-lengkap)

</div>

---

## 🚨 Masalah: Kebocoran Data Dokumen

Banyak perusahaan dan individu ingin memanfaatkan AI untuk menganalisis dokumen internal — laporan keuangan, kontrak, data HR, medical records, dokumen hukum — tapi menghadapi risiko serius:

| Risiko | Penjelasan |
|--------|-----------|
| **File dikirim utuh ke cloud** | Saat upload PDF/Word ke ChatGPT, Claude, atau AI lain, file asli dikirim ke server mereka |
| **Binary file tersimpan di server AI** | File `.pdf`, `.docx`, `.xlsx` disimpan sementara atau permanen di infrastruktur AI provider |
| **Metadata bocor** | Nama file, author, revision history, hidden comments ikut terkirim |
| **Tidak ada kontrol** | Setelah file terkirim, Anda tidak punya kendali atas retensi dan penggunaan data |
| **Compliance violation** | Melanggar GDPR, UU PDP, HIPAA, atau kebijakan internal perusahaan |

> **Contoh nyata:** Anda upload laporan keuangan Q4 ke ChatGPT. File PDF 5MB dikirim utuh ke server OpenAI — termasuk metadata, embedded images, hidden text, dan revision history. Anda tidak tahu berapa lama file itu disimpan.

---

## ✅ Bagaimana Open Chatbot Mengatasinya

Open Chatbot menggunakan arsitektur **Local Processing + Text-Only Inference** yang memastikan file asli tidak pernah meninggalkan infrastruktur Anda:

```
  INFRASTRUKTUR ANDA (On-Premise / VPS)              CLOUD (AI Provider)
  ==========================================          =======================

  📄 PDF  📝 DOCX  📊 XLSX  🖼️ Image              OpenAI / Claude /
       |                                             DeepSeek API
       v
  +-----------------------+                          Hanya menerima:
  | LOCAL FILE PROCESSOR  |                          ✅ Potongan teks (JSON)
  | • PDF → pdftotext     |                          ✅ Pertanyaan user
  | • DOCX → mammoth      |     teks JSON           ✅ System prompt
  | • XLSX → SheetJS      | ─────────────────────►
  | • Image → Tesseract   |   (max 30KB/file)       TIDAK menerima:
  | • OCR scanned docs    |                          ❌ File asli (binary)
  +-----------------------+                          ❌ Images / scans
       |                                             ❌ Metadata dokumen
       v                                             ❌ Revision history
  🗑️ File dihapus dari                               ❌ Hidden content
     memory setelah                                  ❌ Embedded objects
     ekstraksi teks
```

### Prinsip Keamanan

| Prinsip | Implementasi |
|---------|-------------|
| **File tidak pernah dikirim ke AI** | File diproses lokal → hanya teks hasil ekstraksi yang dikirim |
| **Teks dipotong (sliced)** | Setiap file dibatasi max **30KB teks** sebelum dikirim sebagai JSON chunk |
| **Tidak ada penyimpanan server** | File di-buffer di memory, diekstrak, lalu **langsung dihapus** dari temp |
| **API inference stateless** | DeepSeek, OpenAI, Claude API tidak menyimpan data dari API calls |
| **API key di browser** | Key disimpan di localStorage browser, tidak di server |
| **Zero binary transfer** | Yang dikirim ke AI: `{"role":"system","content":"teks..."}` — bukan file |

---

## 🔬 Cara Kerja Teknis

### 1. Upload & Pemrosesan Lokal

Saat user upload file, **semua pemrosesan terjadi di server Anda sendiri**:

```
POST /api/upload  →  FormData { files: [File] }
                            |
                            v
               ┌─────────────────────┐
               │  file-processor.ts  │
               │                     │
               │  PDF ──► pdftotext  │  CLI tool (poppler)
               │  PDF ──► OCR       │  tesseract CLI (fallback jika scanned)
               │  DOCX ──► mammoth   │  npm library
               │  DOC ──► word-ext   │  npm library
               │  XLSX ──► SheetJS   │  npm library
               │  IMG ──► tesseract  │  OCR engine
               │  TXT ──► buffer     │  native Node.js
               └─────────┬───────────┘
                         │
                         v
               { id, filename, text, size }  ← JSON response
                                               (teks saja, bukan file)
```

**Yang terjadi di memory:**
1. File di-buffer sebagai `Buffer` di RAM
2. Text diekstrak oleh library yang sesuai
3. Buffer dan temp files **langsung dihapus** setelah ekstraksi
4. Hanya `string` teks yang dikembalikan ke client

### 2. Pengiriman ke AI Provider

Saat user mengirim pesan, **yang dikirim ke AI API hanya JSON text**:

```typescript
// Yang SEBENARNYA dikirim ke API (dari chat/route.ts)
{
  "model": "deepseek-chat",
  "system": "Kamu adalah asisten AI...\n\n=== File: laporan.pdf ===\nTeks hasil ekstraksi di sini (max 30KB)...\n=== End File ===",
  "messages": [
    { "role": "user", "content": "Analisis laporan keuangan ini" }
  ],
  "max_tokens": 8192,
  "stream": true
}
```

**Perhatikan:**
- Tidak ada `file`, `attachment`, atau `binary` dalam payload
- Field `system` berisi **teks plain** hasil ekstraksi, bukan file
- Setiap file context di-**truncate** max 30.000 karakter (`fc.text.slice(0, 30000)`)
- Response di-stream sebagai `text-delta` chunks — bukan disimpan di server

### 3. Mengapa AI Provider Tidak Menyimpan Data Anda

| Provider | Kebijakan API |
|----------|--------------|
| **OpenAI** | Data dari API calls **tidak digunakan untuk training** dan tidak disimpan permanen (berbeda dengan ChatGPT web) |
| **Anthropic** | API calls **tidak disimpan** untuk training model. Retensi terbatas untuk abuse monitoring |
| **DeepSeek** | API mengikuti kebijakan data retention minimal untuk inference |

> **Catatan:** Ini berlaku untuk penggunaan via **API** (yang digunakan Open Chatbot), bukan via web interface (ChatGPT/Claude web). Web interface memiliki kebijakan berbeda.

---

## 📊 Perbandingan: Open Chatbot vs Upload Langsung ke AI

| Aspek | Upload ke ChatGPT/Claude Web | Open Chatbot |
|-------|------------------------------|-------------|
| File asli dikirim ke cloud | ✅ Ya, file utuh | ❌ Tidak, hanya teks |
| Binary/images terkirim | ✅ Ya | ❌ Tidak |
| Metadata dokumen terkirim | ✅ Ya (author, revisions) | ❌ Tidak |
| Data dipakai training | ⚠️ Mungkin (tergantung setting) | ❌ Tidak (API mode) |
| File disimpan di server AI | ⚠️ Sementara/permanen | ❌ Tidak ada file |
| Kontrol data retention | ❌ Minimal | ✅ Penuh (self-hosted) |
| Compliance friendly | ⚠️ Perlu review | ✅ Data tetap on-premise |
| Ukuran data terkirim | File utuh (MBs) | Teks saja (max 30KB/file) |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- API key dari salah satu provider: [DeepSeek](https://platform.deepseek.com/), [OpenAI](https://platform.openai.com/), atau [Anthropic](https://console.anthropic.com/)
- *(Opsional)* `poppler-utils` dan `tesseract-ocr` untuk PDF OCR

### Install & Run

```bash
# Clone repository
git clone https://github.com/romizone/chatbot-next.git
cd chatbot-next

# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) → klik **Pengaturan** → pilih provider → masukkan API key → mulai chat!

### Environment Variables (Opsional)

Buat `.env.local` untuk server-side fallback keys:

```env
DEEPSEEK_API_KEY=sk-...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Install OCR Tools (Opsional, untuk PDF scan & gambar)

```bash
# macOS
brew install poppler tesseract tesseract-lang

# Ubuntu/Debian
sudo apt install poppler-utils tesseract-ocr tesseract-ocr-ind

# Windows (via chocolatey)
choco install poppler tesseract
```

---

## 🎯 Fitur Lengkap

### Multi-Provider AI Engine

| Provider | Model | Max Output |
|----------|-------|------------|
| **DeepSeek** | DeepSeek Chat, DeepSeek Reasoner | 8K - 16K tokens |
| **OpenAI** | GPT-4o, GPT-4o Mini, GPT-4.1, GPT-4.1 Mini | 16K - 32K tokens |
| **Anthropic** | Claude Sonnet 4.5, Claude Haiku 4.5 | 8K - 16K tokens |

### Document Processing (Lokal)

| Format | Engine | Kapabilitas |
|--------|--------|------------|
| PDF | `pdftotext` CLI + Tesseract OCR | Ekstraksi teks + OCR untuk PDF scan (max 20 halaman) |
| DOCX | `mammoth` | Ekstraksi teks dan formatting |
| DOC | `word-extractor` | Dokumen Word legacy |
| XLSX/XLS | `xlsx` (SheetJS) | Spreadsheet ke structured text (CSV per sheet) |
| CSV | `xlsx` (SheetJS) | Parsing langsung |
| Images | `tesseract` CLI | OCR: PNG, JPG, BMP, TIFF, WebP |
| Text | Native `Buffer` | TXT, MD, JSON, XML, HTML, source code (20+ format) |

### Core Features

- **Zero File Leakage** — File diproses lokal, hanya teks yang dikirim ke AI via JSON
- **Per-Provider API Keys** — Setiap provider punya slot key terpisah di browser localStorage
- **Real-time Connection Indicator** — Status koneksi hijau/merah di sidebar
- **Auto-Continue** — Deteksi respons terpotong, otomatis minta kelanjutan
- **LaTeX Math (KaTeX)** — Rendering formula matematika: `$inline$` dan `$$block$$`
- **Syntax Highlighting** — Code blocks dengan deteksi bahasa (Prism theme)
- **Multi-Session** — Chat history dengan multiple session
- **File Context Persistence** — File context dipertahankan per session
- **Responsive UI** — Sidebar collapsible, Tailwind CSS + Radix UI
- **Streaming Response** — Respons real-time via Vercel AI SDK `streamText`

---

## 🏗️ Architecture

```
chatbot-next/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts          # Streaming chat endpoint (multi-provider)
│   │   │   └── upload/route.ts        # File processing endpoint (lokal)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── chat/
│   │   │   ├── chat-page.tsx          # Main orchestrator
│   │   │   ├── chat-area.tsx          # Area tampilan pesan
│   │   │   ├── chat-input.tsx         # Input + file upload
│   │   │   ├── chat-message.tsx       # Bubble pesan
│   │   │   ├── markdown-renderer.tsx  # Markdown + KaTeX + syntax highlight
│   │   │   ├── settings-dialog.tsx    # Pengaturan provider & API key
│   │   │   ├── sidebar.tsx            # Session list + connection indicator
│   │   │   └── welcome-screen.tsx     # Landing screen
│   │   └── ui/                        # Radix UI primitives
│   ├── hooks/
│   │   └── use-chat-store.ts          # State management (localStorage)
│   └── lib/
│       ├── constants.ts               # Model list, system prompt, defaults
│       ├── file-processor.ts          # Engine pemrosesan dokumen lokal
│       └── types.ts                   # TypeScript interfaces
├── public/
├── package.json
└── README.md
```

### Data Flow

```
User upload file ──────────────────────────────────────────────────
       │
       ▼
POST /api/upload
       │
       ▼
file-processor.ts ── [PDF → pdftotext] ── [DOCX → mammoth]
       │              [XLSX → SheetJS]     [IMG → tesseract OCR]
       │
       ▼
JSON response: { filename, text, size }    ← teks saja, file dihapus
       │
       ▼
Browser menyimpan text di memory
       │
       ▼
User kirim pesan
       │
       ▼
POST /api/chat ──► { messages, provider, model, apiKey, fileContexts }
       │
       ▼
Build system prompt + file text (sliced max 30KB/file)
       │
       ▼
streamText() ke AI Provider ──► text-delta chunks ──► UI
       │
       ▼
AI hanya menerima JSON text, bukan file binary
```

---

## 🐳 Deployment

### Self-Hosted (Rekomendasi untuk Perusahaan)

Untuk privasi data maksimal, deploy di infrastruktur sendiri:

```bash
npm run build
npm start
```

### Docker

```dockerfile
FROM node:18-alpine

# Install OCR tools (opsional)
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

> **Catatan:** Di Vercel (serverless), OCR features membutuhkan Tesseract binary yang mungkin tidak tersedia. Gunakan Docker deployment untuk full OCR support.

---

## 🔒 Security Summary

| Aspek | Detail |
|-------|--------|
| **File Processing** | 100% lokal di server Anda, file dihapus setelah ekstraksi |
| **Data ke AI Provider** | Hanya plain text JSON chunks (max 30KB/file) |
| **API Keys** | Disimpan di browser localStorage, dikirim per-request via HTTPS |
| **File Binary** | Tidak pernah dikirim ke AI provider |
| **Metadata Dokumen** | Stripped saat ekstraksi — hanya konten teks |
| **Temp Files** | Auto-cleanup setelah proses (using `finally` blocks) |
| **Data Retention** | Chat history hanya di localStorage browser |
| **Network Payload** | JSON `{ role, content }` — bukan multipart/form-data file |

---

## 🛠️ Tech Stack

| Layer | Teknologi |
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

Kontribusi sangat diterima! Silakan submit Pull Request.

1. Fork repository
2. Buat feature branch (`git checkout -b feature/nama-fitur`)
3. Commit perubahan (`git commit -m 'feat: deskripsi fitur'`)
4. Push ke branch (`git push origin feature/nama-fitur`)
5. Buka Pull Request

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Dibuat untuk mengatasi kebocoran data dokumen saat menggunakan AI.**

File Anda tetap di server Anda. Yang pergi ke cloud hanya teks.

Made with ❤️ by [Romi Nur Ismanto](https://github.com/romizone)

</div>
