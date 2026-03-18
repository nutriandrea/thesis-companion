import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, CheckCircle, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface Props {
  mode?: "voice" | "text";
}

export default function SocratePage({ mode = "text" }: Props) {
  const { profile, user, updateProfile, setActiveSection } = useApp();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const studentContext = profile
    ? `
Nome: ${profile.first_name} ${profile.last_name}
Email: ${profile.email}
Corso: ${profile.degree || "Non specificato"}
Università: ${profile.university || "Non specificata"}
Competenze: ${profile.skills?.join(", ") || "Non specificate"}
Stato nel percorso: ${profile.journey_state}
Argomento tesi: ${profile.thesis_topic || "Non ancora definito"}
    `.trim()
    : "";

  // Load history
  useEffect(() => {
    if (!user) return;
    supabase
      .from("socrate_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(
            data.map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
          );
        } else {
          const welcome: ChatMsg = {
            id: "welcome",
            role: "assistant",
            content: profile?.first_name
              ? `**${profile.first_name}.** Finalmente ci incontriamo.\n\nSono Socrate. Non sono qui per darti risposte — sono qui per farti le domande che non vuoi farti.\n\n${
                  profile.thesis_topic
                    ? `Mi dicono che vuoi esplorare "${profile.thesis_topic}". Interessante. Ma dimmi una cosa: **perché** questo argomento? Cosa ti brucia dentro?`
                    : `Non hai ancora un argomento. Bene — è meglio partire dal dubbio che dalla falsa certezza.\n\nDimmi: **cosa ti affascina?** Non pensare alla tesi. Pensa a cosa ti fa venire voglia di capire di più.`
                }`
              : `Benvenuto. Sono Socrate. Presentati: chi sei, cosa studi, e cosa ti porta qui.`,
          };
          setMessages([welcome]);
          if (user) {
            supabase.from("socrate_messages").insert({
              user_id: user.id,
              role: "assistant",
              content: welcome.content,
            });
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

      const userMsg: ChatMsg = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsStreaming(true);

      await supabase
        .from("socrate_messages")
        .insert({ user_id: user.id, role: "user", content: text });

      const apiMessages = [...messages, userMsg]
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socrate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ messages: apiMessages, studentContext }),
          }
        );

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Errore" }));
          toast({
            variant: "destructive",
            title: "Errore",
            description: err.error || `Errore ${resp.status}`,
          });
          setIsStreaming(false);
          return;
        }

        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantContent = "";
        const assistantId = `a-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: "" },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: assistantContent }
                      : m
                  )
                );
              }
            } catch {}
          }
        }

        if (assistantContent) {
          await supabase.from("socrate_messages").insert({
            user_id: user.id,
            role: "assistant",
            content: assistantContent,
          });
        }

        if (!profile?.socrate_done) {
          await updateProfile({ socrate_done: true });
        }
      } catch (e) {
        console.error(e);
        toast({
          variant: "destructive",
          title: "Errore di connessione",
          description: "Impossibile contattare Socrate.",
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, user, messages, studentContext, profile, updateProfile, toast]
  );

  const canAccessOtherPages = profile?.socrate_done;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-ai/20">
            <img src={socrateImg} alt="Socrate" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display">Socrate Duello</h1>
            <p className="text-sm text-muted-foreground">
              {canAccessOtherPages
                ? "Continua il dialogo o esplora la piattaforma"
                : "Parla con Socrate per sbloccare la piattaforma"}
            </p>
          </div>
        </div>
        {!canAccessOtherPages && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warning/10 text-warning text-xs font-medium">
            <span className="animate-pulse">●</span> Parla con Socrate per continuare
          </div>
        )}
        {canAccessOtherPages && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveSection("dashboard")}
            className="gap-1.5"
          >
            <CheckCircle className="w-3.5 h-3.5 text-success" /> Vai alla Dashboard
          </Button>
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
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
                msg.role === "assistant" ? "ring-1 ring-ai/20" : "bg-accent/10"
              }`}
            >
              {msg.role === "assistant" ? (
                <img src={socrateImg} alt="Socrate" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-accent">
                  {profile?.first_name?.[0] || "U"}
                </span>
              )}
            </div>
            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${
                msg.role === "assistant"
                  ? "bg-card border border-border shadow-sm"
                  : "bg-accent text-accent-foreground"
              }`}
            >
              {msg.content === "" && isStreaming ? (
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-ai animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-ai animate-pulse" style={{ animationDelay: "0.3s" }} />
                  <span className="w-2 h-2 rounded-full bg-ai animate-pulse" style={{ animationDelay: "0.6s" }} />
                </div>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert">
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
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && sendMessage(input)
            }
            placeholder="Rispondi a Socrate..."
            className="flex-1 bg-card border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ai"
            disabled={isStreaming}
          />
          <Button
            variant="ai"
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
