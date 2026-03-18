import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle, Mic, MicOff } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import socrateImg from "@/assets/socrate.png";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function SocratePage() {
  const { profile, user, updateProfile, setActiveSection, inputMode } = useApp();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const studentContext = profile
    ? `Nome: ${profile.first_name} ${profile.last_name}\nCorso: ${profile.degree || "N/A"}\nUniversità: ${profile.university || "N/A"}\nCompetenze: ${profile.skills?.join(", ") || "N/A"}\nStato: ${profile.journey_state}\nArgomento: ${profile.thesis_topic || "Non definito"}`
    : "";

  useEffect(() => {
    if (!user) return;
    supabase
      .from("socrate_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(data.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
        } else {
          const welcome: ChatMsg = {
            id: "welcome",
            role: "assistant",
            content: profile?.first_name
              ? `**${profile.first_name}.** Finalmente ci incontriamo.\n\nSono Socrate. Non sono qui per darti risposte — sono qui per farti le domande che non vuoi farti.\n\n${
                  profile.thesis_topic
                    ? `Mi dicono che vuoi esplorare "${profile.thesis_topic}". Interessante. Ma dimmi una cosa: **perché** questo argomento?`
                    : `Non hai ancora un argomento. Bene — è meglio partire dal dubbio che dalla falsa certezza.\n\nDimmi: **cosa ti affascina?**`
                }`
              : `Benvenuto. Sono Socrate. Presentati: chi sei, cosa studi, e cosa ti porta qui.`,
          };
          setMessages([welcome]);
          if (user) {
            supabase.from("socrate_messages").insert({ user_id: user.id, role: "assistant", content: welcome.content });
          }
        }
        setLoaded(true);
      });
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming || !user) return;
      const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsStreaming(true);

      await supabase.from("socrate_messages").insert({ user_id: user.id, role: "user", content: text });

      const apiMessages = [...messages, userMsg].slice(-20).map((m) => ({ role: m.role, content: m.content }));

      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socrate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ messages: apiMessages, studentContext }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Errore" }));
          toast({ variant: "destructive", title: "Errore", description: err.error || `Errore ${resp.status}` });
          setIsStreaming(false);
          return;
        }

        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantContent = "";
        const assistantId = `a-${Date.now()}`;
        setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: assistantContent } : m));
              }
            } catch {}
          }
        }

        if (assistantContent) {
          await supabase.from("socrate_messages").insert({ user_id: user.id, role: "assistant", content: assistantContent });
        }
        if (!profile?.socrate_done) {
          await updateProfile({ socrate_done: true });
        }
      } catch (e) {
        console.error(e);
        toast({ variant: "destructive", title: "Errore di connessione", description: "Impossibile contattare Socrate." });
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, user, messages, studentContext, profile, updateProfile, toast]
  );

  const canAccessOtherPages = profile?.socrate_done;

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-accent/20 animate-subtle-float">
            <img src={socrateImg} alt="Socrate" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display text-foreground">Socrate Duello</h1>
            <p className="text-xs text-muted-foreground">
              {canAccessOtherPages ? "Continua il dialogo" : "Parla con Socrate per sbloccare la piattaforma"}
            </p>
          </div>
        </div>
        {!canAccessOtherPages && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent/10 text-accent text-xs font-medium">
            <span className="animate-pulse">●</span> Sblocca parlando
          </div>
        )}
        {canAccessOtherPages && (
          <button
            onClick={() => setActiveSection("dashboard")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5 text-success" /> Dashboard
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
              msg.role === "assistant" ? "ring-1 ring-accent/20" : "bg-secondary"
            }`}>
              {msg.role === "assistant" ? (
                <img src={socrateImg} alt="S" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-semibold text-foreground">{profile?.first_name?.[0] || "U"}</span>
              )}
            </div>
            <div className={`max-w-[75%] rounded-lg px-4 py-3 text-sm ${
              msg.role === "assistant"
                ? "bg-card border border-border"
                : "bg-accent/10 border border-accent/20 text-foreground"
            }`}>
              {msg.content === "" && isStreaming ? (
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: "0.3s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: "0.6s" }} />
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border pt-4">
        {inputMode === "text" ? (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="Rispondi a Socrate..."
              className="flex-1 bg-card border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              disabled={isStreaming}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              className="px-4 py-3 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <button className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center hover:bg-accent/20 transition-all animate-glow-pulse">
              <Mic className="w-6 h-6 text-accent" />
            </button>
            <p className="ml-4 text-xs text-muted-foreground">Premi per parlare con Socrate</p>
          </div>
        )}
      </div>
    </div>
  );
}
