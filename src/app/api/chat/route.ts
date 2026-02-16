import { streamText, type UIMessage, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { SYSTEM_PROMPT } from "@/lib/constants";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, provider, model, apiKey, fileContexts } = body;

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

    // Create provider instance per-request with API key from client (fallback to env var)
    let modelInstance;
    if (providerName === "deepseek") {
      const key = apiKey || process.env.DEEPSEEK_API_KEY;
      if (!key) {
        return new Response(
          JSON.stringify({ error: "DeepSeek API key belum diisi. Buka Pengaturan untuk memasukkan API key." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const ds = createDeepSeek({ apiKey: key });
      modelInstance = ds(modelName);
    } else if (providerName === "openai") {
      const key = apiKey || process.env.OPENAI_API_KEY;
      if (!key) {
        return new Response(
          JSON.stringify({ error: "OpenAI API key belum diisi. Buka Pengaturan untuk memasukkan API key." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const oai = createOpenAI({ apiKey: key });
      modelInstance = oai(modelName);
    } else {
      const key = apiKey || process.env.CHATBOT_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
      if (!key) {
        return new Response(
          JSON.stringify({ error: "Claude API key belum diisi. Buka Pengaturan untuk memasukkan API key." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const anth = createAnthropic({
        baseURL: "https://api.anthropic.com/v1",
        apiKey: key,
      });
      modelInstance = anth(modelName);
    }

    // Convert UIMessages to model messages
    const modelMessages = await convertToModelMessages(
      (messages || []) as UIMessage[]
    );

    // Max output tokens per model
    const MAX_TOKENS: Record<string, number> = {
      "deepseek-chat": 8192,
      "deepseek-reasoner": 16384,
      "gpt-4o": 16384,
      "gpt-4o-mini": 16384,
      "gpt-4.1": 32768,
      "gpt-4.1-mini": 32768,
      "claude-sonnet-4-5-20250929": 16384,
      "claude-haiku-4-5-20251001": 8192,
    };
    const maxTokens = MAX_TOKENS[modelName] || 8192;

    const result = streamText({
      model: modelInstance,
      system: systemPrompt,
      messages: modelMessages,
      maxOutputTokens: maxTokens,
    });

    // Wrap the stream: intercept chunks and inject [LANJUT] BEFORE finish-step
    // when finishReason is "length" (token limit hit)
    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute: async ({ writer }) => {
          // Start resolving finishReason in parallel (resolves when generation completes)
          const finishReasonPromise = result.finishReason;

          const uiStream = result.toUIMessageStream();
          const reader = uiStream.getReader();
          type UIStreamChunk = Parameters<typeof writer.write>[0];
          // Buffer: hold back finish-step/finish events so we can inject before them
          const buffered: UIStreamChunk[] = [];
          let foundFinishStep = false;
          let lastTextId = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              // Check if this chunk is a finish-step or finish event
              const chunk = value as { type?: string; id?: string };
              if (chunk.type === "finish-step" || chunk.type === "finish") {
                buffered.push(value);
                foundFinishStep = true;
                continue;
              }

              // Track the id of the last text-delta for injection
              if (chunk.type === "text-delta" && chunk.id) {
                lastTextId = chunk.id;
              }

              // If we already found finish-step but get more chunks, flush buffer first
              if (foundFinishStep) {
                for (const b of buffered) writer.write(b);
                buffered.length = 0;
                foundFinishStep = false;
              }

              writer.write(value);
            }
          } finally {
            reader.releaseLock();
          }

          // Now check finishReason and inject [LANJUT] BEFORE buffered finish events
          const finishReason = await finishReasonPromise;
          console.log("[chat] finishReason:", finishReason);

          if (finishReason === "length" && lastTextId) {
            // Inject [LANJUT] using the same text part id as the model's last delta
            writer.write({
              type: "text-delta",
              delta: "\n\n[LANJUT]",
              id: lastTextId,
            } as UIStreamChunk);
          }

          // Flush remaining buffered finish events
          for (const b of buffered) writer.write(b);
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
