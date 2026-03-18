import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle, Mic, FileText, Brain, Loader2, Sparkles, Zap } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import companiesData from "@/data/companies.json";
import supervisorsData from "@/data/supervisors.json";
import topicsData from "@/data/topics.json";
import type { Company, Supervisor, Topic } from "@/types/data";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function GradientOrb({ size = "lg" }: { size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "w-64 h-64 md:w-80 md:h-80" : "w-10 h-10";
  return (
    <div className={`${dim} rounded-full shrink-0`} style={{
      background: "radial-gradient(circle at 30% 40%, #f5a623, #e94e77 35%, #7b61ff 65%, #4a90d9 100%)",
    }} />
  );
}

function useLatexContent() {
  const [latex, setLatex] = useState("");
  useEffect(() => {
    const stored = localStorage.getItem("thesis-latex-content");
    if (stored) setLatex(stored);
    const handler = () => {
      const updated = localStorage.getItem("thesis-latex-content");
      if (updated) setLatex(updated);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
  return latex;
}

const SOCRATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socrate`;
const AUTH_HEADERS = { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

export default function SocratePage() {
  const { profile, user, updateProfile, setActiveSection, inputMode } = useApp();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const latexContent = useLatexContent();
  const exchangeCountRef = useRef(0);
  const memoryRef = useRef<any[]>([]);
  const suggestionsRef = useRef<any[]>([]);

  const studentContext = profile
    ? `Nome: ${profile.first_name} ${profile.last_name}\nCorso: ${profile.degree || "N/A"}\nUniversità: ${profile.university || "N/A"}\nCompetenze: ${profile.skills?.join(", ") || "N/A"}\nStato: ${profile.journey_state}\nArgomento: ${profile.thesis_topic || "Non definito"}`
    : "";

  // Load chat history + memory + suggestions
  useEffect(() => {
    if (!user) return;

    // Load existing memory & suggestions for context
    Promise.all([
      supabase.from("memory_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("socrate_suggestions" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    ]).then(([memRes, sugRes]) => {
      if (memRes.data) memoryRef.current = memRes.data;
      if ((sugRes as any).data) suggestionsRef.current = (sugRes as any).data;
    });

    supabase.from("socrate_messages").select("*").eq("user_id", user.id).order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(data.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
          exchangeCountRef.current = Math.floor(data.length / 2);
        } else {
          const welcome: ChatMsg = {
            id: "welcome", role: "assistant",
            content: profile?.first_name
              ? `**${profile.first_name}.** Finalmente ci incontriamo.\n\nSono Socrate. Non sono qui per darti risposte — sono qui per farti le domande che non vuoi farti.\n\nPrima di iniziare, dimmi: **a che punto sei con la tesi?**\n\n1. 🔍 **Ricerca** — sto ancora cercando un argomento\n2. 📐 **Struttura** — ho un topic ma devo organizzare i capitoli\n3. ✍️ **Scrittura** — sto scrivendo attivamente\n4. 🔄 **Revisione** — sto rivedendo e perfezionando`
              : `Benvenuto. Sono Socrate. Presentati: chi sei, cosa studi, e cosa ti porta qui.`,
          };
          setMessages([welcome]);
          if (user) supabase.from("socrate_messages").insert({ user_id: user.id, role: "assistant", content: welcome.content });
        }
      });
  }, [user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Background extraction: memory + suggestions (runs silently)
  const runBackgroundExtraction = useCallback(async (msgs: ChatMsg[], silent = false) => {
    if (!user) return;
    if (!silent) setIsExtracting(true);
    const recentMsgs = msgs.slice(-20).map((m) => ({ role: m.role, content: m.content }));

    const [memResp, sugResp] = await Promise.allSettled([
      fetch(SOCRATE_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({
          messages: recentMsgs,
          studentContext,
          latexContent,
          memoryEntries: memoryRef.current.slice(-20),
          mode: "extract_memory",
        }),
      }),
      fetch(SOCRATE_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({
          messages: recentMsgs,
          studentContext,
          latexContent,
          existingSuggestions: suggestionsRef.current.slice(-30),
          mode: "extract_suggestions",
        }),
      }),
    ]);

    let newMemories = 0;
    let newSuggestions = 0;

    if (memResp.status === "fulfilled" && memResp.value.ok) {
      try {
        const data = await memResp.value.json();
        if (data.entries?.length > 0) {
          await supabase.from("memory_entries").insert(
            data.entries.map((e: any) => ({ user_id: user.id, type: e.type, title: e.title, detail: e.detail }))
          );
          memoryRef.current = [...data.entries, ...memoryRef.current];
          newMemories = data.entries.length;
        }
      } catch (e) { console.error("Memory save error:", e); }
    }

    if (sugResp.status === "fulfilled" && sugResp.value.ok) {
      try {
        const data = await sugResp.value.json();
        if (data.suggestions?.length > 0) {
          await supabase.from("socrate_suggestions" as any).insert(
            data.suggestions.map((s: any) => ({
              user_id: user.id, category: s.category, title: s.title, detail: s.detail, reason: s.reason,
            }))
          );
          suggestionsRef.current = [...data.suggestions, ...suggestionsRef.current];
          newSuggestions = data.suggestions.length;
        }
      } catch (e) { console.error("Suggestions save error:", e); }
    }

    if (!silent && (newMemories > 0 || newSuggestions > 0)) {
      toast({
        title: "🧠 Analisi completata",
        description: `${newMemories} memorie + ${newSuggestions} suggerimenti estratti e distribuiti nelle sezioni.`,
      });
    }
    if (!silent) setIsExtracting(false);
  }, [user, studentContext, latexContent, toast]);

  // Stream helper
  const streamResponse = useCallback(async (resp: Response, msgId: string): Promise<string> => {
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";

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
          const delta = JSON.parse(jsonStr).choices?.[0]?.delta?.content;
          if (delta) {
            content += delta;
            setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content } : m));
          }
        } catch {}
      }
    }
    return content;
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming || !user) return;
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    await supabase.from("socrate_messages").insert({ user_id: user.id, role: "user", content: text });

    // Include memory context in the API call for continuity
    const apiMessages = [...messages, userMsg].slice(-20).map((m) => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({
          messages: apiMessages,
          studentContext,
          latexContent,
          memoryEntries: memoryRef.current.slice(-15),
          mode: "chat",
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Errore" }));
        toast({ variant: "destructive", title: "Errore", description: err.error || `Errore ${resp.status}` });
        setIsStreaming(false);
        return;
      }

      const assistantId = `a-${Date.now()}`;
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
      const assistantContent = await streamResponse(resp, assistantId);

      if (assistantContent) {
        await supabase.from("socrate_messages").insert({ user_id: user.id, role: "assistant", content: assistantContent });
      }
      if (!profile?.socrate_done) await updateProfile({ socrate_done: true });

      // Auto-extract every 3 exchanges (6 messages)
      exchangeCountRef.current += 1;
      if (exchangeCountRef.current % 3 === 0) {
        runBackgroundExtraction([...messages, userMsg, { id: assistantId, role: "assistant", content: assistantContent }], true);
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Errore", description: "Impossibile contattare Socrate." });
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, user, messages, studentContext, profile, updateProfile, toast, latexContent, streamResponse, runBackgroundExtraction]);

  // Generate report + trigger full extraction
  const generateReport = async () => {
    if (isStreaming || isGeneratingReport || !user || messages.length < 3) return;
    setIsGeneratingReport(true);

    const apiMessages = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({
          messages: apiMessages,
          studentContext,
          latexContent,
          memoryEntries: memoryRef.current.slice(-15),
          mode: "report",
        }),
      });

      if (!resp.ok) {
        toast({ variant: "destructive", title: "Errore", description: "Impossibile generare il report." });
        setIsGeneratingReport(false);
        return;
      }

      const reportId = `report-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: `sep-${Date.now()}`, role: "assistant", content: "---\n\n## 📋 Report di Sessione\n" },
        { id: reportId, role: "assistant", content: "" },
      ]);

      const reportContent = await streamResponse(resp, reportId);

      if (reportContent) {
        await supabase.from("socrate_messages").insert({ user_id: user.id, role: "assistant", content: `📋 REPORT:\n${reportContent}` });
      }

      // Always run full extraction on report
      await runBackgroundExtraction(messages);
      toast({ title: "📋 Report generato", description: "I contenuti sono stati distribuiti nelle sezioni del sito." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Errore", description: "Errore nella generazione del report." });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // VOICE MODE
  if (inputMode === "voice") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3rem)] relative">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1, ease: "easeOut" }} className="animate-subtle-float">
          <GradientOrb size="lg" />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-foreground text-lg font-bold tracking-[0.15em] uppercase mt-8 text-center leading-relaxed">
          SPEAK WITH<br />ME
        </motion.h2>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="absolute bottom-8 left-8">
          <button className="w-10 h-10 bg-secondary border border-border rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Mic className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  // TEXT MODE
  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <GradientOrb size="sm" />
        <div>
          <h1 className="text-sm font-bold text-foreground tracking-wide uppercase">Socrate</h1>
          <p className="text-[10px] text-muted-foreground">Hub centrale · Profiler silenzioso</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isExtracting && (
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Analisi in corso...
            </span>
          )}
          {messages.length >= 3 && (
            <button onClick={generateReport} disabled={isStreaming || isGeneratingReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30">
              {isGeneratingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Report
            </button>
          )}
          {messages.length >= 5 && (
            <button onClick={() => runBackgroundExtraction(messages)} disabled={isStreaming || isExtracting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30">
              <Brain className="w-3.5 h-3.5" /> Analizza
            </button>
          )}
          {profile?.socrate_done && (
            <button onClick={() => setActiveSection("dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <CheckCircle className="w-3.5 h-3.5 text-success" /> Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-5">
        {messages.map((msg) => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] px-4 py-3 text-sm ${msg.role === "assistant" ? "bg-card border border-border rounded-lg" : "bg-secondary border border-border rounded-lg"}`}>
              {msg.content === "" && (isStreaming || isGeneratingReport) ? (
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: "0.3s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: "0.6s" }} />
                </div>
              ) : (
                <div className="prose prose-sm max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
              )}
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border pt-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-secondary border border-border flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-foreground">{profile?.first_name?.[0] || "U"}</span>
        </div>
        <div className="flex-1 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Rispondi a Socrate..." disabled={isStreaming}
            className="flex-1 bg-card border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || isStreaming}
            className="px-4 py-3 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors disabled:opacity-30">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
