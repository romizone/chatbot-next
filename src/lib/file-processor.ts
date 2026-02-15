import { IMAGE_EXTENSIONS, TEXT_EXTENSIONS, SUPPORTED_EXTENSIONS } from "./constants";
import type { FileContext } from "./types";
import { v4 as uuidv4 } from "uuid";

function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export async function processFile(
  buffer: Buffer,
  filename: string
): Promise<FileContext> {
  const ext = getExtension(filename);
  const result: FileContext = {
    id: uuidv4(),
    filename,
    extension: ext,
    text: "",
    error: null,
    size: buffer.length,
  };

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    result.error = `Format '.${ext}' belum didukung.`;
    return result;
  }

  try {
    if (ext === "pdf") {
      result.text = await processPdf(buffer);
    } else if (ext === "docx") {
      result.text = await processDocx(buffer);
    } else if (ext === "xlsx" || ext === "xls") {
      result.text = processExcel(buffer);
    } else if (ext === "csv") {
      result.text = processCsv(buffer);
    } else if (IMAGE_EXTENSIONS.includes(ext)) {
      result.text = await processImage(buffer);
    } else if (TEXT_EXTENSIONS.includes(ext)) {
      result.text = processText(buffer);
    } else {
      result.text = processText(buffer);
    }
  } catch (e: unknown) {
    result.error = `Error memproses '${filename}': ${e instanceof Error ? e.message : String(e)}`;
  }

  return result;
}

async function processPdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return data.text.trim();
}

async function processDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

function processExcel(buffer: Buffer): string {
  const XLSX = require("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const texts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    texts.push(`--- Sheet: ${sheetName} ---\n${csv}`);
  }

  return texts.join("\n\n");
}

function processCsv(buffer: Buffer): string {
  const XLSX = require("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_csv(sheet);
}

async function processImage(buffer: Buffer): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker("eng+ind");
  const {
    data: { text },
  } = await worker.recognize(buffer);
  await worker.terminate();
  return text.trim();
}

function processText(buffer: Buffer): string {
  try {
    return buffer.toString("utf-8");
  } catch {
    return buffer.toString("latin1");
  }
}
