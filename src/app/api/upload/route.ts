import { NextRequest, NextResponse } from "next/server";
import { processFile } from "@/lib/file-processor";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB per file
    const MAX_FILES = 10;

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maksimum ${MAX_FILES} file per upload.` },
        { status: 400 }
      );
    }

    // Process files sequentially to avoid memory spikes from parallel large buffers
    const results = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        results.push({
          id: crypto.randomUUID(),
          filename: file.name,
          extension: file.name.split(".").pop()?.toLowerCase() || "",
          text: "",
          error: `File '${file.name}' terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimum 20MB.`,
          size: file.size,
        });
        continue;
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      results.push(await processFile(buffer, file.name));
    }

    return NextResponse.json({ files: results });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
