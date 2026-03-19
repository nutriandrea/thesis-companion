import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle, Mic, FileText, Brain, Loader2, Sparkles, Zap, Target } from "lucide-react";
import VoiceConversation from "@/components/voice/VoiceConversation";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_HEADERS } from "@/lib/auth-headers";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import ThesisConfirmDialog from "@/components/journey/ThesisConfirmDialog";
import companiesData from "@/data/companies.json";
import supervisorsData from "@/data/supervisors.json";
import topicsData from "@/data/topics.json";
import type { Company, Supervisor, Topic } from "@/types/data";

interface SocratePageProps {
  explorationMode?: boolean;
  onThesisConfirmed?: () => void;
}

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function SocrateIcon({ size = "sm" }: { size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "w-16 h-16" : "w-8 h-8";
  return (
    <div className={`${dim} rounded-full bg-foreground flex items-center justify-center shrink-0`}>
      <span className={`font-display font-bold text-background ${size === "lg" ? "text-2xl" : "text-xs"}`}>S</span>
    </div>
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


export default function SocratePage({ explorationMode = false, onThesisConfirmed }: SocratePageProps = {}) {
  const { profile, user, updateProfile, setActiveSection, inputMode, setInputMode } = useApp();
  const { toast } = useToast();
  const [showThesisDialog, setShowThesisDialog] = useState(false);
  const [proposedThesisTopic, setProposedThesisTopic] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [severita, setSeverita] = useState<number | null>(null);
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
      supabase.from("student_profiles" as any).select("severita, thesis_stage").eq("user_id", user.id).single(),
    ]).then(([memRes, sugRes, spRes]) => {
      if (memRes.data) memoryRef.current = memRes.data;
      if ((sugRes as any).data) suggestionsRef.current = (sugRes as any).data;
      if ((spRes as any).data?.severita != null) setSeverita((spRes as any).data.severita);
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
              ? `**${profile.first_name} ${profile.last_name || ""}**.${profile.degree ? ` ${profile.degree}` : ""}${profile.university ? ` all'${profile.university}` : ""}.\n\nSono Socrate. Non sono qui per darti risposte — sono qui per farti le domande che non vuoi farti.\n\n**A che punto sei con la tesi?**\n\n1. **Ricerca** — sto ancora cercando un argomento\n2. **Struttura** — ho un topic ma devo organizzare i capitoli\n3. **Scrittura** — sto scrivendo attivamente\n4. **Revisione** — sto rivedendo e perfezionando`
              : `Benvenuto. Sono Socrate. Non ho i tuoi dati — presentati: chi sei, cosa studi, e cosa ti porta qui.`,
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
        title: "Analisi completata",
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
        // Strip hidden markers before saving
        const cleanContent = assistantContent
          .replace(/<!--\s*THESIS_TITLE:\s*.*?\s*-->/g, "")
          .replace(/<!--\s*THESIS_READY\s*-->/g, "")
          .trim();
        await supabase.from("socrate_messages").insert({ user_id: user.id, role: "assistant", content: cleanContent });

        // Check if Socrate proposed thesis confirmation
        // Safety: only trigger if response has marker AND doesn't end with questions
        const hasMarker = assistantContent.includes("<!-- THESIS_READY -->");
        const textWithoutMarkers = cleanContent.replace(/\*\*/g, "").trim();
        const endsWithQuestion = textWithoutMarkers.slice(-100).includes("?");
        
        if (hasMarker && !endsWithQuestion) {
          // Extract proposed title
          const titleMatch = assistantContent.match(/<!--\s*THESIS_TITLE:\s*(.*?)\s*-->/);
          const extractedTitle = titleMatch?.[1]?.trim() || "";
          if (extractedTitle) setProposedThesisTopic(extractedTitle);
          // Update displayed message to remove markers
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: cleanContent } : m));
          // Show thesis confirmation dialog after a brief delay
          setTimeout(() => setShowThesisDialog(true), 1500);
        }
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
        { id: `sep-${Date.now()}`, role: "assistant", content: "---\n\n## Report di Sessione\n" },
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

  // Build dataset summary for fusion engine
  const buildDatasetSummary = useCallback(() => {
    const companies = (companiesData as Company[]).map(c => `${c.id}: ${c.name} (${c.domains.join(", ")})`).join("\n");
    const sups = (supervisorsData as Supervisor[]).map(s => `${s.id}: ${s.title} ${s.firstName} ${s.lastName} — ${s.researchInterests.slice(0, 3).join(", ")}`).join("\n");
    const tops = (topicsData as Topic[]).slice(0, 30).map(t => `${t.id}: ${t.title} (${t.type}, fields: ${t.fieldIds.join(",")})`).join("\n");
    return `AZIENDE:\n${companies}\n\nPROFESSORI:\n${sups}\n\nTOPIC (primi 30):\n${tops}`;
  }, []);

  // Full fusion analysis
  const runFusionAnalysis = async () => {
    if (isStreaming || isExtracting || !user) return;
    setIsExtracting(true);
    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({
          studentContext,
          latexContent,
          datasetSummary: buildDatasetSummary(),
          mode: "analyze_full",
        }),
      });

      if (!resp.ok) {
        toast({ variant: "destructive", title: "Errore", description: "Fusione fallita." });
        setIsExtracting(false);
        return;
      }

      const result = await resp.json();
      toast({
        title: "🧬 Fusione completata",
        description: `Profilo aggiornato · ${result.summary?.affinitiesComputed || 0} affinità calcolate · ${result.summary?.newSuggestionsGenerated || 0} nuovi suggerimenti`,
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Errore", description: "Errore nella fusione dati." });
    } finally {
      setIsExtracting(false);
    }
  };

  // Get last assistant message for TTS
  const lastAssistantMsg = messages.filter(m => m.role === "assistant").slice(-1)[0]?.content || "";

  // VOICE MODE
  if (inputMode === "voice") {
    return (
      <div className="h-[calc(100vh-3rem)]">
        <VoiceConversation
          onTranscript={(text) => sendMessage(text)}
          onSwitchToText={() => setInputMode("text")}
          isStreaming={isStreaming}
          lastAssistantMessage={lastAssistantMsg}
          severity={severita ?? 0.5}
        />
      </div>
    );
  }

  // TEXT MODE
  return (
    <div className={`flex flex-col ${explorationMode ? "h-screen max-w-3xl mx-auto px-6" : "h-[calc(100vh-3rem)]"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <SocrateIcon size="sm" />
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">Socrate</h2>
          <p className="ds-caption">Hub centrale</p>
        </div>
        {severita !== null && (
          <div className="flex items-center gap-1.5 ml-2" title={`Severità: ${severita} — ${severita >= 0.8 ? "Spietato" : severita >= 0.6 ? "Critico" : severita >= 0.4 ? "Collaborativo" : "Supportivo"}`}>
            <div className="flex gap-0.5">
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((threshold, i) => (
                <div key={i} className={`w-1.5 h-3 rounded-sm ${severita >= threshold ? (severita >= 0.8 ? "bg-destructive" : severita >= 0.6 ? "bg-warning" : "bg-accent") : "bg-border"}`} />
              ))}
            </div>
            <span className="text-[9px] text-muted-foreground">
              {severita >= 0.8 ? "🔥" : severita >= 0.6 ? "⚡" : severita >= 0.4 ? "🤝" : "💡"}
            </span>
          </div>
        )}
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
          {messages.length >= 5 && (
            <button onClick={runFusionAnalysis} disabled={isStreaming || isExtracting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-ai/10 border border-ai/20 text-xs text-ai hover:bg-ai/20 transition-colors disabled:opacity-30">
              {isExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Fusione
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

      {/* Thesis confirmation button (exploration mode only) */}
      {explorationMode && messages.length >= 6 && (
        <div className="border-t border-border pt-3 pb-1 flex justify-center">
          <button
            onClick={() => setShowThesisDialog(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-accent/10 border border-accent/20 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors"
          >
            <Target className="w-4 h-4" />
            Ho scelto la mia tesi
          </button>
        </div>
      )}

      {/* Input */}
      <div className={`border-t border-border pt-4 flex items-center gap-3 ${explorationMode ? "max-w-3xl mx-auto w-full" : ""}`}>
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

      {/* Thesis confirm dialog */}
      <ThesisConfirmDialog
        open={showThesisDialog}
        onClose={() => setShowThesisDialog(false)}
        initialTopic={proposedThesisTopic || profile?.thesis_topic || ""}
        onConfirm={async (topic) => {
          setShowThesisDialog(false);
          await updateProfile({ thesis_topic: topic, journey_state: "topic_chosen" });

          // Update student_profiles phase so the progress bar reflects the transition
          if (user) {
            await supabase
              .from("student_profiles" as any)
              .update({ current_phase: "topic_supervisor", overall_completion: Math.max(17, 0) } as any)
              .eq("user_id", user.id);
          }

          onThesisConfirmed?.();
        }}
      />
    </div>
  );
}
