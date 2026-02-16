/* eslint-disable @typescript-eslint/no-require-imports */
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
    } else if (ext === "doc") {
      result.text = await processDoc(buffer);
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
  const { writeFile, readFile } = require("fs/promises");
  const { mkdtemp, rm } = require("fs/promises");
  const { tmpdir } = require("os");
  const path = require("path");
  const { execFile } = require("child_process");

  // Step 1: Try fast text extraction with pdftotext CLI (poppler)
  const tmpDir = await mkdtemp(path.join(tmpdir(), "pdf-txt-"));
  const pdfPath = path.join(tmpDir, "input.pdf");
  const txtPath = path.join(tmpDir, "output.txt");

  try {
    await writeFile(pdfPath, buffer);

    await new Promise<void>((resolve, reject) => {
      execFile(
        "pdftotext",
        ["-layout", pdfPath, txtPath],
        { timeout: 15000 },
        (error: Error | null) => {
          if (error) reject(error);
          else resolve();
        }
      );
    });

    const text = (await readFile(txtPath, "utf-8")).trim();
    console.log(`[pdf] pdftotext extracted ${text.length} chars`);

    if (text.length > 50) {
      return text;
    }
  } catch (e) {
    console.log(`[pdf] pdftotext failed: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }

  // Step 2: Fallback — convert PDF pages to images with pdftoppm, then OCR
  console.log("[pdf] Text extraction empty, starting OCR fallback...");
  return await ocrPdf(buffer);
}

async function ocrPdf(buffer: Buffer): Promise<string> {
  const { writeFile, readFile, readdir } = require("fs/promises");
  const { mkdtemp, rm } = require("fs/promises");
  const { tmpdir } = require("os");
  const path = require("path");
  const { execFile } = require("child_process");

  const tmpDir = await mkdtemp(path.join(tmpdir(), "pdf-ocr-"));
  const pdfPath = path.join(tmpDir, "input.pdf");

  try {
    await writeFile(pdfPath, buffer);

    // Convert PDF to PNG images using pdftoppm (poppler)
    // Always limit to 20 pages max to avoid excessive processing
    const args = ["-png", "-r", "300", "-l", "20", pdfPath, path.join(tmpDir, "page")];
    await new Promise<void>((resolve, reject) => {
      execFile(
        "pdftoppm",
        args,
        { timeout: 120000 },
        (error: Error | null) => {
          if (error) reject(error);
          else resolve();
        }
      );
    });

    // Find all generated page images
    const files = await readdir(tmpDir);
    const pageFiles = files
      .filter((f: string) => f.startsWith("page") && f.endsWith(".png"))
      .sort();

    if (pageFiles.length === 0) {
      return "(PDF berisi gambar tapi tidak dapat di-OCR)";
    }

    // OCR each page
    const results: string[] = [];
    for (const pageFile of pageFiles) {
      const imgPath = path.join(tmpDir, pageFile);
      const ocrBase = path.join(tmpDir, `ocr-${pageFile}`);
      const ocrPath = ocrBase + ".txt";

      try {
        await new Promise<void>((resolve, reject) => {
          execFile(
            "tesseract",
            [imgPath, ocrBase, "-l", "eng+ind"],
            { timeout: 60000 },
            (error: Error | null) => {
              if (error) reject(error);
              else resolve();
            }
          );
        });

        const pageText = await readFile(ocrPath, "utf-8");
        if (pageText.trim()) {
          results.push(`--- Halaman ${results.length + 1} ---\n${pageText.trim()}`);
        }
      } catch {
        // Skip pages that fail OCR
      }
    }

    return results.length > 0
      ? results.join("\n\n")
      : "(PDF berisi gambar tapi tidak dapat di-OCR)";
  } finally {
    // Clean up temp directory
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function processDoc(buffer: Buffer): Promise<string> {
  const { writeFile, unlink } = require("fs/promises");
  const { tmpdir } = require("os");
  const path = require("path");
  const tmpPath = path.join(tmpdir(), `doc-${uuidv4()}.doc`);
  try {
    await writeFile(tmpPath, buffer);
    const WordExtractor = require("word-extractor");
    const extractor = new WordExtractor();
    const doc = await extractor.extract(tmpPath);
    return doc.getBody().trim();
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
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
  const { writeFile, readFile, unlink } = require("fs/promises");
  const { tmpdir } = require("os");
  const path = require("path");
  const { execFile } = require("child_process");

  const inputPath = path.join(tmpdir(), `ocr-${uuidv4()}`);
  const outputBase = path.join(tmpdir(), `ocr-out-${uuidv4()}`);
  const outputPath = outputBase + ".txt";

  try {
    await writeFile(inputPath, buffer);

    // Use system tesseract CLI — avoids Turbopack module resolution issues
    await new Promise<void>((resolve, reject) => {
      execFile(
        "tesseract",
        [inputPath, outputBase, "-l", "eng+ind"],
        { timeout: 60000 },
        (error: Error | null) => {
          if (error) reject(error);
          else resolve();
        }
      );
    });

    const text = await readFile(outputPath, "utf-8");
    return text.trim();
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

function processText(buffer: Buffer): string {
  try {
    return buffer.toString("utf-8");
  } catch {
    return buffer.toString("latin1");
  }
}
