import { streamText, type UIMessage, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { SYSTEM_PROMPT } from "@/lib/constants";

const anthropic = createAnthropic({
  baseURL: "https://api.anthropic.com/v1",
  apiKey: process.env.CHATBOT_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
});

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export const maxDuration = 300;

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

    const providerName = provider || "deepseek";
    const modelName = model || "deepseek-chat";

    console.log("[chat] provider:", providerName, "model:", modelName, "files:", fileContexts?.length ?? 0);

    let modelInstance;
    if (providerName === "deepseek") {
      modelInstance = deepseek(modelName);
    } else if (providerName === "openai") {
      modelInstance = openai(modelName);
    } else {
      modelInstance = anthropic(modelName);
    }

    // Convert UIMessages to model messages
    const modelMessages = await convertToModelMessages(
      (messages || []) as UIMessage[]
    );

    // DeepSeek deepseek-chat supports max 8192 output tokens
    // DeepSeek deepseek-reasoner supports 16384
    // OpenAI gpt-4o supports 16384
    const maxTokens =
      providerName === "deepseek" && modelName === "deepseek-chat"
        ? 8192
        : 16384;

    const result = streamText({
      model: modelInstance,
      system: systemPrompt,
      messages: modelMessages,
      maxOutputTokens: maxTokens,
    });

    // Wrap the stream to detect finish_reason: "length" and append [LANJUT]
    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute: async ({ writer }) => {
          const reader = result.toUIMessageStream().getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              writer.write(value);
            }
          } finally {
            reader.releaseLock();
          }

          // Check if response was truncated by token limit
          const finishReason = await result.finishReason;
          console.log("[chat] finishReason:", finishReason);
          if (finishReason === "length") {
            // Append continuation marker so frontend auto-continue triggers
            writer.write({
              type: "text-delta",
              textDelta: "\n\n[LANJUT]",
            });
          }
        },
      }),
    });
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
