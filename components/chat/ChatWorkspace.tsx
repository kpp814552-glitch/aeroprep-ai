"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUpRight, Bot, MessageSquareText, Send, Sparkles } from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import { GlassButton, GlassCard, GlassPanel } from "@/components/ui/glass";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const defaultSystemMessage: ChatMessage = {
  role: "system",
  content:
    "你是 AeroPrep AI，专注为民航大学学生提供专业、准确、简洁的民航知识与求职问答支持。",
};

const starterPrompts = [
  "飞行员校招自我介绍怎么讲更专业？",
  "签派员面试常问哪些运行控制问题？",
  "机务维修岗位如何回答安全意识题？",
  "英语面试中如何解释选择民航行业？",
];

const chatHistoryStorageKey = "aeroprep-chat-history";

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Record<string, unknown>;
  return (
    (message.role === "system" ||
      message.role === "user" ||
      message.role === "assistant") &&
    typeof message.content === "string"
  );
}

function getInitialMessages() {
  if (typeof window === "undefined") {
    return [defaultSystemMessage];
  }

  try {
    const stored = localStorage.getItem(chatHistoryStorageKey);
    if (!stored) return [defaultSystemMessage];

    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every(isChatMessage)) {
      const normalized = parsed.filter((message) => message.role !== "system");
      return [defaultSystemMessage, ...normalized];
    }
  } catch {
    localStorage.removeItem(chatHistoryStorageKey);
  }

  return [defaultSystemMessage];
}

export default function ChatWorkspace() {
  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const visibleMessages = messages.filter((message) => message.role !== "system");
    localStorage.setItem(chatHistoryStorageKey, JSON.stringify(visibleMessages));
  }, [messages]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim() || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: input.trim() },
    ];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof payload?.error === "string" ? payload.error : "问答请求失败"
        );
      }

      const assistantContent =
        typeof payload?.assistant === "string" && payload.assistant.trim()
          ? payload.assistant
          : "我暂时没有生成有效回复，请重新提问一次。";

      setMessages((currentMessages) => [
        ...currentMessages,
        { role: "assistant", content: assistantContent },
      ]);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "问答请求失败"
      );
    } finally {
      setLoading(false);
    }
  }

  const visibleMessages = messages.filter((message) => message.role !== "system");

  return (
    <AppFrame backHref="/" backLabel="返回首页">
      <main className="relative z-10 px-5 pb-16 pt-8 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.84fr_1.16fr]">
          <GlassPanel className="soft-enter overflow-hidden px-6 py-8 md:px-8 md:py-10">
            <div className="absolute inset-x-10 top-0 h-28 rounded-full bg-cyan-100/70 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/44 px-4 py-2 text-xs font-medium uppercase tracking-[0.26em] text-slate-500">
                <Sparkles className="h-4 w-4 text-cyan-500" />
                AI Q&A
              </div>
              <h1 className="mt-8 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
                民航AI问答
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                围绕民航知识、岗位认知、英语面试和面试准备随时提问，保持连续对话上下文。
              </p>

              <div className="mt-10 space-y-3">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/38 bg-white/28 px-4 py-4 text-left text-sm text-slate-700 transition hover:bg-white/45"
                  >
                    <span>{prompt}</span>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>

              <div className="mt-10 rounded-[28px] border border-white/38 bg-slate-950/84 p-5 text-white shadow-[0_22px_50px_rgba(10,18,36,0.3)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                    <Bot className="h-5 w-5 text-cyan-300" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                      Response Style
                    </p>
                    <p className="mt-1 text-sm text-slate-200">
                      简洁、专业、偏民航语境
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="soft-enter-delay flex min-h-[72vh] flex-col px-4 py-4 md:px-5 md:py-5">
            <div className="flex items-center justify-between rounded-[24px] border border-white/34 bg-white/26 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/62 text-slate-900">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">AeroPrep AI 问答</p>
                  <p className="text-xs text-slate-500">保持上下文的民航学习对话</p>
                </div>
              </div>

              <button
                type="button"
                className="rounded-full bg-white/42 px-4 py-2 text-sm text-slate-600 transition hover:bg-white/58"
                onClick={() => {
                  setMessages([defaultSystemMessage]);
                  setError("");
                  localStorage.removeItem(chatHistoryStorageKey);
                }}
              >
                清空对话
              </button>
            </div>

            <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-[28px] border border-white/32 bg-white/18 p-4 md:p-5">
              {visibleMessages.length === 0 ? (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/35 bg-white/16 px-6 text-center">
                  <p className="text-lg font-medium text-slate-900">开始一段新的问答</p>
                  <p className="mt-3 max-w-md text-sm leading-7 text-slate-500">
                    你可以直接提问岗位认知、民航知识点、英语面试表达或模拟面试准备。
                  </p>
                </div>
              ) : null}

              {visibleMessages.map((message, index) => {
                const isAssistant = message.role === "assistant";

                return (
                  <GlassCard
                    key={`${message.role}-${index}`}
                    className={`overflow-hidden px-4 py-4 md:px-5 ${
                      isAssistant ? "mr-0 md:mr-10" : "ml-0 md:ml-10"
                    }`}
                  >
                    <div className="relative">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                        {isAssistant ? "AeroPrep AI" : "你"}
                      </div>
                      <div className="prose prose-slate mt-3 max-w-none text-sm leading-7 text-slate-700">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}

              {loading ? (
                <div className="rounded-[24px] border border-white/32 bg-white/22 px-5 py-4 text-sm text-slate-500">
                  正在生成回复...
                </div>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} className="mt-4">
              <div className="rounded-[28px] border border-white/34 bg-white/28 p-3 shadow-[0_18px_40px_rgba(28,43,78,0.08)]">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  rows={4}
                  placeholder="输入你的民航问题，例如：飞行员校招一面通常会怎么追问？"
                  className="w-full resize-none rounded-[20px] border border-transparent bg-transparent px-3 py-3 text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400"
                />

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    聚焦民航专业、岗位面试与学习场景
                  </p>
                  <GlassButton type="submit" disabled={loading || !input.trim()}>
                    发送
                    <Send className="h-4 w-4" />
                  </GlassButton>
                </div>
              </div>
            </form>

            {error ? (
              <p className="mt-3 text-sm text-rose-600">{error}</p>
            ) : null}

            <div className="mt-4 text-center text-xs text-slate-500">
              <Link href="/interview" className="underline underline-offset-4">
                切换到 AI 面试准备
              </Link>
            </div>
          </GlassPanel>
        </div>
      </main>
    </AppFrame>
  );
}
