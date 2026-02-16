"use client";

import { useRef, useEffect } from "react";
import { ChatMessage } from "./chat-message";
import { WelcomeScreen } from "./welcome-screen";
import { Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  messages: Message[];
  isLoading: boolean;
}

export function ChatArea({ messages, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1088px] mx-auto px-5 py-6">
        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
              />
            ))}
            {isLoading &&
              messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                  <div className="flex items-center gap-1.5 py-2">
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
