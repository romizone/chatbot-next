"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const codeStr = String(children).replace(/\n$/, "");
          // Block code: has language class OR contains newlines (fenced block without lang)
          const isBlock = !!match || codeStr.includes("\n");
          const language = match ? match[1] : "text";
          return isBlock ? (
            <div className="my-3 rounded-lg overflow-hidden border border-gray-200">
              <div className="bg-gray-100 px-4 py-1.5 text-xs text-gray-500 font-mono border-b border-gray-200">
                {language}
              </div>
              <SyntaxHighlighter
                style={oneLight}
                language={language}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  padding: "1rem",
                  fontSize: "13px",
                  background: "#fafafa",
                }}
              >
                {codeStr}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code
              className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
        },
        ul({ children }) {
          return <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>;
        },
        h1({ children }) {
          return <h1 className="text-xl font-bold mb-3 mt-4">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-base font-semibold mb-2 mt-3">{children}</h3>;
        },
        table({ children }) {
          return (
            <div className="my-3 overflow-x-auto rounded-lg border border-gray-200 max-w-full">
              <table className="w-max min-w-full text-sm">{children}</table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="bg-gray-50 px-4 py-2 text-left font-medium text-gray-700 border-b">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="px-4 py-2 border-b border-gray-100">{children}</td>
          );
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-gray-300 pl-4 my-3 text-gray-600 italic">
              {children}
            </blockquote>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
