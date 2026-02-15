"use client";

import { Bot } from "lucide-react";

export function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center select-none">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-5 shadow-lg">
        <Bot className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">
        Local Chatbot Qwen 7B
      </h1>
      <p className="text-[15px] text-gray-400">
        Ada yang bisa saya bantu hari ini?
      </p>
    </div>
  );
}
