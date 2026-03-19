import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Mic, PenTool, Loader2, Brain, Zap, FileText,
  ShieldAlert, Flame, Target, Users, Building2, ChevronRight,
  CheckCircle2, Circle, AlertTriangle, GraduationCap, LogOut,
  ChevronDown, ChevronUp, Sparkles, MessageCircle
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSocrateTasks, type SocrateTask } from "@/hooks/useSocrateTasks";
import { useAffinityScores } from "@/hooks/useSocrateSuggestions";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import socrateImg from "@/assets/socrate.png";
import supervisorsData from "@/data/supervisors.json";
import companiesData from "@/data/companies.json";
import fieldsData from "@/data/fields.json";
import topicsData from "@/data/topics.json";
import type { Supervisor, Company, Field, Topic } from "@/types/data";

const supervisors = supervisorsData as Supervisor[];
const companies = companiesData as Company[];
const fields = fieldsData as Field[];
const topics = topicsData as Topic[];
function getFieldName(id: string) { return fields.find(f => f.id === id)?.name || id; }

interface ChatMsg { id: string; role: "user" | "assistant"; content: string; }
interface Vulnerability { id: string; type: string; title: string; description: string; severity: string; }

const SOCRATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socrate`;
const AUTH_HEADERS = { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

function GradientOrb({ size = "sm" }: { size?: "sm" | "md" }) {
  const dim = size === "md" ? "w-10 h-10" : "w-7 h-7";
  return (
    <div className={`${dim} rounded-full shrink-0`} style={{
      background: "radial-gradient(circle at 30% 40%, #f5a623, #e94e77 35%, #7b61ff 65%, #4a90d9 100%)",
    }} />
  );
}

// ─── COMPACT TASK PANEL ───
function TaskPanel({ userId }: { userId: string }) {
  const { tasks, updateTaskStatus } = useSocrateTasks(userId);
  const activeTasks = tasks.filter(t => t.status !== "completed").slice(0, 6);
  const completedCount = tasks.filter(t => t.status === "completed").length;

  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...activeTasks].sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));

  return (
    <div className="space-y-1.5">
      {sorted.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-3">Nessun task. Parla con Socrate.</p>
      ) : sorted.map(task => (
        <button
          key={task.id}
          onClick={() => updateTaskStatus(task.id, "completed")}
          className="w-full flex items-start gap-2 p-2 rounded-md hover:bg-secondary/50 transition-colors text-left group"
        >
          <Circle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
            task.priority === "critical" ? "text-destructive" : task.priority === "high" ? "text-warning" : "text-muted-foreground"
          } group-hover:text-success transition-colors`} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-foreground leading-tight truncate">{task.title}</p>
            <p className="text-[9px] text-muted-foreground truncate">{task.description}</p>
          </div>
        </button>
      ))}
      {completedCount > 0 && (
        <p className="text-[9px] text-success text-center pt-1">✓ {completedCount} completati</p>
      )}
    </div>
  );
}

// ─── COMPACT CONTACTS PANEL ───
function ContactsPanel({ userId }: { userId: string }) {
  const { affinities } = useAffinityScores(userId, "supervisor");
  const topSupervisors = useMemo(() => {
    if (affinities.length > 0) {
      return affinities.slice(0, 4).map(a => {
        const sup = supervisors.find(s => s.id === a.entity_id);
        return { id: a.entity_id, name: a.entity_name, score: a.score, reason: a.reasoning, fields: sup?.researchInterests?.slice(0, 2) || [] };
      });
    }
    return supervisors.slice(0, 4).map(s => ({
      id: s.id, name: `${s.title} ${s.firstName} ${s.lastName}`, score: null, reason: null, fields: s.researchInterests.slice(0, 2),
    }));
  }, [affinities]);

  return (
    <div className="space-y-1.5">
      {topSupervisors.map(sup => (
        <div key={sup.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary/50 transition-colors">
          <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-3 h-3 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-foreground truncate">{sup.name}</p>
            <p className="text-[9px] text-muted-foreground truncate">{sup.fields.join(", ")}</p>
          </div>
          {sup.score !== null && (
            <span className="text-[10px] font-bold text-accent shrink-0">{sup.score}%</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── COMPACT COMPANIES PANEL ───
function CompaniesPanel({ userId }: { userId: string }) {
  const { affinities } = useAffinityScores(userId, "company");
  const topCompanies = useMemo(() => {
    if (affinities.length > 0) {
      return affinities.slice(0, 4).map(a => {
        const comp = companies.find(c => c.id === a.entity_id);
        return { id: a.entity_id, name: a.entity_name, score: a.score, domains: comp?.domains?.slice(0, 2) || [] };
      });
    }
    return companies.slice(0, 4).map(c => ({
      id: c.id, name: c.name, score: null, domains: c.domains.slice(0, 2),
    }));
  }, [affinities]);

  return (
    <div className="space-y-1.5">
      {topCompanies.map(comp => (
        <div key={comp.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary/50 transition-colors">
          <div className="w-6 h-6 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
            <Building2 className="w-3 h-3 text-warning" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-foreground truncate">{comp.name}</p>
            <p className="text-[9px] text-muted-foreground truncate">{comp.domains.join(", ")}</p>
          </div>
          {comp.score !== null && (
            <span className="text-[10px] font-bold text-warning shrink-0">{comp.score}%</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── VULNERABILITIES MINI ───
function VulnerabilitiesPanel({ vulnerabilities }: { vulnerabilities: Vulnerability[] }) {
  if (vulnerabilities.length === 0) return (
    <p className="text-[10px] text-muted-foreground text-center py-3">Nessuna vulnerabilità. Lancia una scansione.</p>
  );
  return (
    <div className="space-y-1.5">
      {vulnerabilities.slice(0, 4).map(v => (
        <div key={v.id} className="flex items-start gap-2 p-2 rounded-md bg-destructive/[0.03]">
          <ShieldAlert className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${v.severity === "critical" ? "text-destructive" : "text-warning"}`} />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-foreground leading-tight">{v.title}</p>
            <p className="text-[9px] text-muted-foreground leading-snug line-clamp-2">{v.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN UNIFIED DASHBOARD ───
export default function UnifiedDashboard() {
  const { profile, user, updateProfile, signOut, inputMode, setInputMode } = useApp();
  const { toast } = useToast();

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [severita, setSeverita] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const exchangeCountRef = useRef(0);
  const memoryRef = useRef<any[]>([]);

  // Side panel state
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<string | null>("tasks");
  const [studentProfile, setStudentProfile] = useState<any>(null);

  const studentContext = profile
    ? `Nome: ${profile.first_name} ${profile.last_name}\nCorso: ${profile.degree || "N/A"}\nUniversità: ${profile.university || "N/A"}\nCompetenze: ${profile.skills?.join(", ") || "N/A"}\nStato: ${profile.journey_state}\nArgomento: ${profile.thesis_topic || "Non definito"}`
    : "";
  // Google Docs will be the source of thesis content — no local LaTeX
  const thesisContent = "";

  // Load initial data
  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("socrate_messages").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("memory_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("student_profiles" as any).select("*").eq("user_id", user.id).single(),
      supabase.from("vulnerabilities" as any).select("*").eq("user_id", user.id).eq("resolved", false).order("created_at", { ascending: false }).limit(8),
    ]).then(([msgsRes, memRes, spRes, vulnRes]) => {
      if (msgsRes.data?.length) {
        setMessages(msgsRes.data.map(m => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
        exchangeCountRef.current = Math.floor(msgsRes.data.length / 2);
      } else {
        const welcome: ChatMsg = {
          id: "welcome", role: "assistant",
          content: profile?.thesis_topic
            ? `**${profile.first_name}.** Hai scelto la tua tesi: *"${profile.thesis_topic}"*.\n\nBene. Adesso viene il bello.\n\nSpiegami in modo preciso: **qual è il problema che vuoi risolvere?** Non il tema — il *problema*. Se non riesci a dirlo in una frase, significa che non l'hai ancora capito.`
            : `**${profile?.first_name || "Studente"}.** Benvenuto. Sono Socrate.\n\nDimmi: a che punto sei con la tesi?`,
        };
        setMessages([welcome]);
        supabase.from("socrate_messages").insert({ user_id: user.id, role: "assistant", content: welcome.content });
      }
      if (memRes.data) memoryRef.current = memRes.data;
      if ((spRes as any).data) {
        setStudentProfile((spRes as any).data);
        setSeverita((spRes as any).data.severita);
      }
      if ((vulnRes as any).data) setVulnerabilities((vulnRes as any).data);
    });
  }, [user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Stream helper
  const streamResponse = useCallback(async (resp: Response, msgId: string): Promise<string> => {
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "", content = "";
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
          if (delta) { content += delta; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content } : m)); }
        } catch {}
      }
    }
    return content;
  }, []);

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming || !user) return;
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    await supabase.from("socrate_messages").insert({ user_id: user.id, role: "user", content: text });
    const apiMessages = [...messages, userMsg].slice(-20).map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({ messages: apiMessages, studentContext, latexContent: thesisContent, memoryEntries: memoryRef.current.slice(-15), mode: "chat" }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Errore" }));
        toast({ variant: "destructive", title: "Errore", description: err.error || `Errore ${resp.status}` });
        setIsStreaming(false);
        return;
      }
      const assistantId = `a-${Date.now()}`;
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);
      const assistantContent = await streamResponse(resp, assistantId);
      if (assistantContent) await supabase.from("socrate_messages").insert({ user_id: user.id, role: "assistant", content: assistantContent });
      if (!profile?.socrate_done) await updateProfile({ socrate_done: true });

      exchangeCountRef.current += 1;
      // Auto-extract every 3 exchanges
      if (exchangeCountRef.current % 3 === 0) {
        runBackgroundExtraction([...messages, userMsg, { id: assistantId, role: "assistant", content: assistantContent }]);
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Errore", description: "Impossibile contattare Socrate." });
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, user, messages, studentContext, thesisContent, profile, updateProfile, toast, streamResponse]);

  // Background extraction
  const runBackgroundExtraction = useCallback(async (msgs: ChatMsg[]) => {
    if (!user) return;
    const recentMsgs = msgs.slice(-20).map(m => ({ role: m.role, content: m.content }));
    try {
      await Promise.allSettled([
        fetch(SOCRATE_URL, { method: "POST", headers: AUTH_HEADERS, body: JSON.stringify({ messages: recentMsgs, studentContext, latexContent, memoryEntries: memoryRef.current.slice(-20), mode: "extract_memory" }) }),
        fetch(SOCRATE_URL, { method: "POST", headers: AUTH_HEADERS, body: JSON.stringify({ messages: recentMsgs, studentContext, latexContent, mode: "extract_suggestions" }) }),
      ]);
    } catch {}
  }, [user, studentContext, latexContent]);

  // Vulnerability scan
  const scanVulnerabilities = useCallback(async () => {
    if (!user || isScanning) return;
    setIsScanning(true);
    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({ messages: messages.slice(-20).map(m => ({ role: m.role, content: m.content })), studentContext, latexContent, mode: "extract_vulnerabilities" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        toast({ title: "🔥 Scansione completata", description: `${data.vulnerabilities?.length || 0} vulnerabilità rilevate.` });
        const { data: fresh } = await supabase.from("vulnerabilities" as any).select("*").eq("user_id", user.id).eq("resolved", false).order("created_at", { ascending: false }).limit(8);
        if (fresh) setVulnerabilities(fresh as any);
      }
    } catch { toast({ variant: "destructive", title: "Errore" }); }
    finally { setIsScanning(false); }
  }, [user, isScanning, messages, studentContext, latexContent, toast]);

  // Progress metrics
  const completion = studentProfile?.overall_completion || 0;
  const stage = studentProfile?.thesis_stage || profile?.journey_state || "exploration";
  const stageLabels: Record<string, string> = { exploration: "Esplorazione", topic_chosen: "Topic scelto", structuring: "Struttura", writing: "Scrittura", revision: "Revisione" };

  const togglePanel = (id: string) => setExpandedPanel(prev => prev === id ? null : id);

  const name = profile?.first_name || "Studente";

  // Panel config
  const panels = [
    { id: "tasks", label: "Task", icon: Target, badge: null, content: <TaskPanel userId={user?.id || ""} /> },
    { id: "vulns", label: "Vulnerabilità", icon: ShieldAlert, badge: vulnerabilities.length || null, content: <VulnerabilitiesPanel vulnerabilities={vulnerabilities} />, action: { label: isScanning ? "..." : "Scan", icon: isScanning ? Loader2 : Flame, onClick: scanVulnerabilities } },
    { id: "contacts", label: "Supervisori", icon: Users, badge: null, content: <ContactsPanel userId={user?.id || ""} /> },
    { id: "companies", label: "Aziende", icon: Building2, badge: null, content: <CompaniesPanel userId={user?.id || ""} /> },
  ];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* ─── HEADER ─── */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card/50 shrink-0">
        <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-accent/20 shrink-0">
          <img src={socrateImg} alt="S" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-foreground truncate">{name}</h1>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium shrink-0">
              {stageLabels[stage] || stage}
            </span>
            {severita !== null && (
              <div className="flex gap-0.5 ml-1">
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((t, i) => (
                  <div key={i} className={`w-1 h-2.5 rounded-sm ${severita >= t ? (severita >= 0.8 ? "bg-destructive" : severita >= 0.6 ? "bg-warning" : "bg-accent") : "bg-border"}`} />
                ))}
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground truncate max-w-md">
            {profile?.thesis_topic || "Tesi non definita"}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-xs font-bold text-foreground">{completion}%</p>
            <p className="text-[9px] text-muted-foreground">completamento</p>
          </div>
          <div className="w-20">
            <Progress value={completion} className="h-1.5" />
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-secondary rounded-md p-0.5 shrink-0">
          <button onClick={() => setInputMode("text")} className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${inputMode === "text" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>
            <PenTool className="w-3 h-3" />
          </button>
          <button onClick={() => setInputMode("voice")} className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${inputMode === "voice" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>
            <Mic className="w-3 h-3" />
          </button>
        </div>

        <button onClick={signOut} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── CHAT (DOMINANT) ─── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-4 space-y-4">
            {messages.map(msg => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] lg:max-w-[70%] px-4 py-3 text-sm ${
                  msg.role === "assistant"
                    ? "bg-card border border-border rounded-lg"
                    : "bg-secondary border border-border rounded-lg"
                }`}>
                  {msg.content === "" && isStreaming ? (
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
          <div className="border-t border-border px-4 lg:px-8 py-3 flex items-center gap-3 bg-card/30">
            <GradientOrb size="sm" />
            <div className="flex-1 flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
                placeholder="Rispondi a Socrate..."
                disabled={isStreaming}
                className="flex-1 bg-card border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming}
                className="px-4 py-2.5 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors disabled:opacity-30"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <aside className="hidden lg:flex w-72 xl:w-80 border-l border-border flex-col bg-card/30 overflow-y-auto">
          {panels.map(panel => {
            const isOpen = expandedPanel === panel.id;
            return (
              <div key={panel.id} className="border-b border-border">
                <button
                  onClick={() => togglePanel(panel.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-secondary/50 transition-colors"
                >
                  <panel.icon className={`w-3.5 h-3.5 ${panel.id === "vulns" ? "text-destructive" : "text-accent"}`} />
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex-1 text-left">{panel.label}</span>
                  {panel.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-destructive/20 text-destructive">{panel.badge}</span>
                  )}
                  {panel.action && (
                    <button
                      onClick={e => { e.stopPropagation(); panel.action!.onClick(); }}
                      className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
                    >
                      <panel.action.icon className={`w-3 h-3 ${isScanning ? "animate-spin" : ""}`} />
                    </button>
                  )}
                  {isOpen ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3">
                        {panel.content}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
