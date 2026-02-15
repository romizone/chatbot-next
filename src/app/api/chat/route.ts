import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { SYSTEM_PROMPT } from "@/lib/constants";

const anthropic = createAnthropic({
  baseURL: "https://api.anthropic.com/v1",
  apiKey: process.env.CHATBOT_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
});

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, provider, model, fileContexts } = body;

    let systemPrompt = SYSTEM_PROMPT;

    if (fileContexts && fileContexts.length > 0) {
      const parts = fileContexts
        .filter((fc: { error: string | null; text: string }) => !fc.error && fc.text)
        .map((fc: { filename: string; text: string }) => {
          const text = fc.text.length > 30000 ? fc.text.slice(0, 30000) : fc.text;
          return `=== File: ${fc.filename} ===\n${text}\n=== End File ===`;
        });

      if (parts.length > 0) {
        systemPrompt +=
          "\n\nBerikut adalah isi file yang di-upload oleh user:\n\n" +
          parts.join("\n\n");
      }
    }

    console.log("[chat] FULL BODY KEYS:", Object.keys(body));
    console.log("[chat] provider:", body.provider, "model:", body.model);
    console.log("[chat] fileContexts:", body.fileContexts);
    console.log("[chat] fileContexts count:", fileContexts?.length ?? 0);
    if (fileContexts?.length > 0) {
      console.log("[chat] fileContexts[0].filename:", fileContexts[0].filename);
      console.log("[chat] fileContexts[0].text length:", fileContexts[0].text?.length ?? 0);
      console.log("[chat] fileContexts[0].error:", fileContexts[0].error);
    }

    const providerName = provider || "anthropic";
    const modelName = model || "claude-sonnet-4-5-20250929";

    const modelInstance =
      providerName === "openai" ? openai(modelName) : anthropic(modelName);

    // Convert UIMessages to model messages
    const modelMessages = await convertToModelMessages(
      (messages || []) as UIMessage[]
    );

    const result = streamText({
      model: modelInstance,
      system: systemPrompt,
      messages: modelMessages,
      maxOutputTokens: 8192,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    console.error("Chat API Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
