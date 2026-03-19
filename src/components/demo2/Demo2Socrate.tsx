import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic } from "lucide-react";
import { useDemo2 } from "@/contexts/Demo2Context";
import SocrateCoin from "@/components/shared/SocrateCoin";
import ReactMarkdown from "react-markdown";

export default function Demo2Socrate() {
  const { messages, addMessage, popResponse, profile } = useDemo2();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isTyping) return;
    addMessage({ id: `u-${Date.now()}`, role: "user", content: text });
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = popResponse();
      addMessage({ id: `a-${Date.now()}`, role: "assistant", content: response });
      setIsTyping(false);
    }, 1200);
  }, [isTyping, addMessage, popResponse]);

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto px-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <SocrateCoin size={36} interactive={false} isActive={isTyping} />
        <div>
          <h2 className="font-display text-base font-semibold text-foreground">Socrate</h2>
          <p className="text-[10px] text-muted-foreground">Demo2 — risposte predefinite</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-5">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
            <div className={`max-w-[75%] px-4 py-3 text-sm ${
              msg.role === "assistant" ? "bg-card border border-border rounded-2xl" : "bg-secondary border border-border rounded-2xl"
            }`}>
              <div className="prose prose-sm max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl px-4 py-3 flex gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: "0.3s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: "0.6s" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border pt-4 pb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-foreground">{profile.first_name?.[0] || "U"}</span>
        </div>
        <div className="flex-1 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Rispondi a Socrate..." disabled={isTyping}
            className="flex-1 bg-card border border-border rounded-full px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || isTyping}
            className="px-4 py-3 bg-accent text-accent-foreground rounded-full hover:bg-accent/90 transition-colors disabled:opacity-30">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
