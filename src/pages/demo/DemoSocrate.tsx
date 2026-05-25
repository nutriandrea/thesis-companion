import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, Loader2 } from "lucide-react";
import SocrateCoin from "@/components/shared/SocrateCoin";
import { DemoPageHeader } from "./DemoShell";
import { DEMO_SOCRATE_HISTORY } from "@/data/demo-mocks";

const SOCRATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socrate`;
const STUDENT_CONTEXT = "Name: Marco Demo\nDegree: MSc CS @ ETH Zurich\nTopic: Explainable Vulnerability Detection with CoT for LLM Security Analysis\nPhase: Planning";

interface Msg { id: string; role: "user" | "assistant"; content: string; }

export default function DemoSocrate() {
  const [messages, setMessages] = useState<Msg[]>(DEMO_SOCRATE_HISTORY);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: input };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setIsStreaming(true);

    const apiMessages = next.slice(-20).map((m) => ({ role: m.role, content: m.content }));
    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ messages: apiMessages, studentContext: STUDENT_CONTEXT, mode: "chat" }),
      });
      if (!resp.ok) throw new Error("bad");
      const aid = `a-${Date.now()}`;
      setMessages((p) => [...p, { id: aid, role: "assistant", content: "" }]);
      const reader = resp.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let content = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") break;
          try {
            const d = JSON.parse(j).choices?.[0]?.delta?.content;
            if (d) {
              content += d;
              const clean = content.replace(/<!--.*?-->/g, "").trim();
              setMessages((p) => p.map((m) => (m.id === aid ? { ...m, content: clean } : m)));
            }
          } catch {}
        }
      }
    } catch {
      setMessages((p) => [...p, { id: `e-${Date.now()}`, role: "assistant", content: "Errore di connessione. Riprova." }]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <DemoPageHeader title="Socrate" subtitle="Conversazione con il tuo mentore AI" />
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 max-w-3xl mx-auto w-full">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && <SocrateCoin size={28} interactive={false} />}
            <div className={`max-w-[80%] px-4 py-3 text-xs border ${
              m.role === "assistant" ? "bg-secondary/40 border-border" : "bg-foreground text-background border-foreground"
            }`}>
              <div className="prose prose-xs max-w-none leading-relaxed">
                <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="border-t border-border px-8 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Rispondi a Socrate…"
          disabled={isStreaming}
          className="flex-1 bg-secondary/50 border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground transition-colors disabled:opacity-50"
        />
        <button type="submit" disabled={isStreaming || !input.trim()} className="p-2.5 bg-foreground text-background disabled:opacity-50">
          {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
