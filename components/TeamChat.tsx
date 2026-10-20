"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

interface ChatMessage {
  id: string;
  content: string;
  teamId: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
}

export default function TeamChat({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch initial message history
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/teams/${teamId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data || []);
      }
    } catch (err) {
      console.error("Error loading chat messages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // 1. Subscribe to Supabase Realtime for instant chat delivery (< 200ms)
    const channelName = `chat-team-${teamId}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `teamId=eq.${teamId}`,
        },
        async (payload: any) => {
          const newMsg = payload.new;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [
              ...prev,
              {
                id: newMsg.id,
                content: newMsg.content,
                teamId: newMsg.teamId,
                senderId: newMsg.senderId,
                createdAt: newMsg.createdAt,
                sender: {
                  id: newMsg.senderId,
                  name: "Team Member",
                  email: "",
                },
              },
            ];
          });
          // Refresh to get full sender relation
          fetchMessages();
        }
      )
      .subscribe();

    // 2. Background polling fallback (every 3 seconds) for guaranteed cross-browser sync
    const interval = setInterval(() => {
      fetch(`/api/teams/${teamId}/messages`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data)) {
            setMessages((prev) => {
              if (data.length !== prev.length || (data.length > 0 && prev.length > 0 && data[data.length - 1].id !== prev[prev.length - 1].id)) {
                return data;
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    }, 3000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const messageContent = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const res = await fetch(`/api/teams/${teamId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent }),
      });

      if (res.ok) {
        const savedMessage = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === savedMessage.id)) return prev;
          return [...prev, savedMessage];
        });
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Chat Room Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs text-lg">
            💬
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              {teamName} Chat
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Real-time collaboration across team members
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-600">Live Channel</span>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
        {loading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
            Loading chat history...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center text-center p-6 text-slate-400">
            <span className="text-3xl mb-2">👋</span>
            <span className="text-sm font-bold text-slate-700">No messages yet</span>
            <span className="text-xs mt-1">Start the conversation with your team!</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[80%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Sender Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white uppercase shadow-2xs ${
                    isMe
                      ? "bg-indigo-600"
                      : "bg-gradient-to-tr from-violet-600 to-indigo-500"
                  }`}
                >
                  {msg.sender.name ? msg.sender.name.charAt(0) : "U"}
                </div>

                {/* Message Bubble */}
                <div className="flex flex-col">
                  <div className={`flex items-center gap-2 text-[11px] mb-1 font-semibold ${isMe ? "justify-end" : ""}`}>
                    <span className="text-slate-700">{isMe ? "You" : msg.sender.name}</span>
                    <span className="text-slate-400 font-normal">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                      isMe
                        ? "bg-indigo-600 text-white rounded-tr-none font-medium"
                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-none font-medium"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <form
        onSubmit={handleSendMessage}
        className="border-t border-slate-200 bg-white p-4 flex items-center gap-3"
      >
        <input
          type="text"
          placeholder="Type your message and press Enter..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
        />

        <button
          type="submit"
          disabled={sending || !inputText.trim()}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50 transition cursor-pointer"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
