"use client";

import { Bot, User } from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";

interface Props {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[90%] ${
          isUser
            ? "bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-3 text-gray-900"
            : "text-gray-900 py-1"
        }`}
      >
        {isUser ? (
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="text-[15px] leading-relaxed prose prose-sm max-w-none">
            <MarkdownRenderer content={content} />
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
}
