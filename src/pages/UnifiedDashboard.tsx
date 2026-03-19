import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Loader2, ShieldAlert, Flame, Target, Users, Building2,
  CheckCircle2, Circle, GraduationCap, LogOut, MessageCircle,
  ChevronLeft, ChevronRight, X
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSocrateTasks } from "@/hooks/useSocrateTasks";
import { useAffinityScores } from "@/hooks/useSocrateSuggestions";
import ReactMarkdown from "react-markdown";
import supervisorsData from "@/data/supervisors.json";
import companiesData from "@/data/companies.json";
import fieldsData from "@/data/fields.json";
import type { Supervisor, Company, Field } from "@/types/data";

const supervisors = supervisorsData as Supervisor[];
const companies = companiesData as Company[];
const fields = fieldsData as Field[];

interface ChatMsg { id: string; role: "user" | "assistant"; content: string; }
interface Vulnerability { id: string; type: string; title: string; description: string; severity: string; }

const SOCRATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socrate`;
const AUTH_HEADERS = { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

const STAGES = [
  { key: "exploration", label: "Esplorazione" },
  { key: "topic_chosen", label: "Topic" },
  { key: "structuring", label: "Struttura" },
  { key: "writing", label: "Scrittura" },
  { key: "revision", label: "Revisione" },
];

// ─── GRADIENT ORB ───
function GradientOrb({ size = 160, isActive = false }: { size?: number; isActive?: boolean }) {
  return (
    <motion.div
      className="relative mx-auto"
      style={{ width: size, height: size / 2, overflow: "hidden" }}
      animate={isActive ? { scale: [1, 1.03, 1] } : {}}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          top: 0,
          left: 0,
          background: "radial-gradient(circle at 35% 40%, #f5a623 0%, #e94e77 25%, #7b61ff 50%, #4a90d9 75%, #7b61ff 100%)",
          filter: "blur(1px)",
        }}
      />
      {/* Glow */}
      <div
        className="absolute rounded-full opacity-30"
        style={{
          width: size * 1.4,
          height: size * 1.4,
          top: -(size * 0.2),
          left: -(size * 0.2),
          background: "radial-gradient(circle, rgba(245,166,35,0.3) 0%, rgba(123,97,255,0.15) 40%, transparent 70%)",
          filter: "blur(30px)",
        }}
      />
    </motion.div>
  );
}

// ─── CARD COMPONENT ───
function DashboardCard({
  title, icon: Icon, children, badge, action, className = ""
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  badge?: number | null;
  action?: { label: string; onClick: () => void; loading?: boolean };
  className?: string;
}) {
  return (
    <div className={`bg-card/60 backdrop-blur-sm border border-border rounded-xl flex flex-col h-full ${className}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Icon className="w-4 h-4 text-accent" />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex-1">{title}</span>
        {badge != null && badge > 0 && (
          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-destructive/20 text-destructive">{badge}</span>
        )}
        {action && (
          <button
            onClick={action.onClick}
            disabled={action.loading}
            className="text-[10px] font-medium px-2 py-1 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-40"
          >
            {action.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : action.label}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {children}
      </div>
    </div>
  );
}

// ─── TASK PANEL ───
function TaskContent({ userId }: { userId: string }) {
  const { tasks, updateTaskStatus } = useSocrateTasks(userId);
  const activeTasks = tasks.filter(t => t.status !== "completed").slice(0, 5);
  const completedCount = tasks.filter(t => t.status === "completed").length;
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...activeTasks].sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));

  if (sorted.length === 0) return <p className="text-xs text-muted-foreground text-center py-6">Nessun task. Parla con Socrate.</p>;

  return (
    <div className="space-y-2">
      {sorted.map(task => (
        <button key={task.id} onClick={() => updateTaskStatus(task.id, "completed")}
          className="w-full flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors text-left group">
          <Circle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
            task.priority === "critical" ? "text-destructive" : task.priority === "high" ? "text-warning" : "text-muted-foreground"
          } group-hover:text-success transition-colors`} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground leading-tight">{task.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
          </div>
        </button>
      ))}
      {completedCount > 0 && <p className="text-[10px] text-success text-center pt-1">✓ {completedCount} completati</p>}
    </div>
  );
}

// ─── CONTACTS PANEL ───
function ContactsContent({ userId }: { userId: string }) {
  const { affinities } = useAffinityScores(userId, "supervisor");
  const items = useMemo(() => {
    if (affinities.length > 0) {
      return affinities.slice(0, 5).map(a => {
        const sup = supervisors.find(s => s.id === a.entity_id);
        return { id: a.entity_id, name: a.entity_name, score: a.score, fields: sup?.researchInterests?.slice(0, 2) || [] };
      });
    }
    return supervisors.slice(0, 5).map(s => ({
      id: s.id, name: `${s.title} ${s.firstName} ${s.lastName}`, score: null, fields: s.researchInterests.slice(0, 2),
    }));
  }, [affinities]);

  return (
    <div className="space-y-2">
      {items.map(sup => (
        <div key={sup.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
          <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{sup.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{sup.fields.join(", ")}</p>
          </div>
          {sup.score !== null && <span className="text-[10px] font-bold text-accent shrink-0">{sup.score}%</span>}
        </div>
      ))}
    </div>
  );
}

// ─── COMPANIES PANEL ───
function CompaniesContent({ userId }: { userId: string }) {
  const { affinities } = useAffinityScores(userId, "company");
  const items = useMemo(() => {
    if (affinities.length > 0) {
      return affinities.slice(0, 5).map(a => {
        const comp = companies.find(c => c.id === a.entity_id);
        return { id: a.entity_id, name: a.entity_name, score: a.score, domains: comp?.domains?.slice(0, 2) || [] };
      });
    }
    return companies.slice(0, 5).map(c => ({ id: c.id, name: c.name, score: null, domains: c.domains.slice(0, 2) }));
  }, [affinities]);

  return (
    <div className="space-y-2">
      {items.map(comp => (
        <div key={comp.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
          <div className="w-7 h-7 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-warning" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{comp.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{comp.domains.join(", ")}</p>
          </div>
          {comp.score !== null && <span className="text-[10px] font-bold text-warning shrink-0">{comp.score}%</span>}
        </div>
      ))}
    </div>
  );
}

// ─── VULNERABILITIES PANEL ───
function VulnerabilitiesContent({ vulnerabilities }: { vulnerabilities: Vulnerability[] }) {
  if (vulnerabilities.length === 0) return <p className="text-xs text-muted-foreground text-center py-6">Nessuna vulnerabilità rilevata.</p>;
  return (
    <div className="space-y-2">
      {vulnerabilities.slice(0, 5).map(v => (
        <div key={v.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-destructive/[0.04]">
          <ShieldAlert className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${v.severity === "critical" ? "text-destructive" : "text-warning"}`} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground leading-tight">{v.title}</p>
            <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2 mt-0.5">{v.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── CHAT OVERLAY ───
function ChatOverlay({
  messages, input, setInput, sendMessage, isStreaming, onClose
}: {
  messages: ChatMsg[];
  input: string;
  setInput: (v: string) => void;
  sendMessage: (text: string) => void;
  isStreaming: boolean;
  onClose: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="fixed inset-4 lg:inset-x-[15%] lg:inset-y-8 z-50 flex flex-col bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Chat header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
        <div className="w-8 h-8 rounded-full" style={{
          background: "radial-gradient(circle at 35% 40%, #f5a623, #e94e77 35%, #7b61ff 65%, #4a90d9 100%)"
        }} />
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">Socrate</p>
          <p className="text-[10px] text-muted-foreground">Il tuo mentore critico</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map(msg => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-4 py-3 text-sm rounded-xl ${
              msg.role === "assistant"
                ? "bg-secondary/50 border border-border"
                : "bg-accent/10 border border-accent/20"
            }`}>
              {msg.content === "" && isStreaming ? (
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: "0.3s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: "0.6s" }} />
                </div>
              ) : (
                <div className="prose prose-sm prose-invert max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
              )}
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-5 py-3 flex items-center gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="Rispondi a Socrate..."
          disabled={isStreaming}
          className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isStreaming}
          className="p-2.5 bg-accent text-accent-foreground rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-30"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── MAIN DASHBOARD ───
export default function UnifiedDashboard() {
  const { profile, user, updateProfile, signOut } = useApp();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const exchangeCountRef = useRef(0);
  const memoryRef = useRef<any[]>([]);

  const studentContext = profile
    ? `Nome: ${profile.first_name} ${profile.last_name}\nCorso: ${profile.degree || "N/A"}\nUniversità: ${profile.university || "N/A"}\nCompetenze: ${profile.skills?.join(", ") || "N/A"}\nStato: ${profile.journey_state}\nArgomento: ${profile.thesis_topic || "Non definito"}`
    : "";
  const thesisContent = "";

  // Load data
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
      if ((spRes as any).data) setStudentProfile((spRes as any).data);
      if ((vulnRes as any).data) setVulnerabilities((vulnRes as any).data);
    });
  }, [user]);

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
        setIsStreaming(false); return;
      }
      const assistantId = `a-${Date.now()}`;
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);
      const assistantContent = await streamResponse(resp, assistantId);
      if (assistantContent) await supabase.from("socrate_messages").insert({ user_id: user.id, role: "assistant", content: assistantContent });
      if (!profile?.socrate_done) await updateProfile({ socrate_done: true });
      exchangeCountRef.current += 1;
      if (exchangeCountRef.current % 3 === 0) runBackgroundExtraction([...messages, userMsg, { id: assistantId, role: "assistant", content: assistantContent }]);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Errore", description: "Impossibile contattare Socrate." });
    } finally { setIsStreaming(false); }
  }, [isStreaming, user, messages, studentContext, thesisContent, profile, updateProfile, toast, streamResponse]);

  const runBackgroundExtraction = useCallback(async (msgs: ChatMsg[]) => {
    if (!user) return;
    const recentMsgs = msgs.slice(-20).map(m => ({ role: m.role, content: m.content }));
    try {
      await Promise.allSettled([
        fetch(SOCRATE_URL, { method: "POST", headers: AUTH_HEADERS, body: JSON.stringify({ messages: recentMsgs, studentContext, latexContent: thesisContent, memoryEntries: memoryRef.current.slice(-20), mode: "extract_memory" }) }),
        fetch(SOCRATE_URL, { method: "POST", headers: AUTH_HEADERS, body: JSON.stringify({ messages: recentMsgs, studentContext, latexContent: thesisContent, mode: "extract_suggestions" }) }),
      ]);
    } catch {}
  }, [user, studentContext, thesisContent]);

  const scanVulnerabilities = useCallback(async () => {
    if (!user || isScanning) return;
    setIsScanning(true);
    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({ messages: messages.slice(-20).map(m => ({ role: m.role, content: m.content })), studentContext, latexContent: thesisContent, mode: "extract_vulnerabilities" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        toast({ title: "🔥 Scansione completata", description: `${data.vulnerabilities?.length || 0} vulnerabilità rilevate.` });
        const { data: fresh } = await supabase.from("vulnerabilities" as any).select("*").eq("user_id", user.id).eq("resolved", false).order("created_at", { ascending: false }).limit(8);
        if (fresh) setVulnerabilities(fresh as any);
      }
    } catch { toast({ variant: "destructive", title: "Errore" }); }
    finally { setIsScanning(false); }
  }, [user, isScanning, messages, studentContext, thesisContent, toast]);

  // Progress
  const completion = studentProfile?.overall_completion || 0;
  const stage = studentProfile?.thesis_stage || profile?.journey_state || "exploration";
  const currentStageIndex = STAGES.findIndex(s => s.key === stage);
  const name = profile?.first_name || "Studente";
  const lastMessage = messages.filter(m => m.role === "assistant").slice(-1)[0]?.content || "";

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden relative">
      {/* ─── TOP: Orb + Identity ─── */}
      <div className="flex flex-col items-center pt-8 pb-4 shrink-0 relative">
        {/* Logout */}
        <button onClick={signOut} className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <LogOut className="w-4 h-4" />
        </button>

        {/* Orb */}
        <GradientOrb size={140} isActive={isStreaming} />

        {/* Identity */}
        <motion.div className="text-center mt-4 space-y-1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 className="text-lg font-bold text-foreground font-display">{name}</h1>
          <p className="text-xs text-muted-foreground max-w-md mx-auto px-4 truncate">
            {profile?.thesis_topic || "Tesi non definita"}
          </p>
        </motion.div>

        {/* Talk to Socrate button */}
        <motion.button
          onClick={() => setChatOpen(true)}
          className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium hover:bg-accent/20 transition-all"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <MessageCircle className="w-4 h-4" />
          Parla con Socrate
        </motion.button>

        {/* Last Socrate message preview */}
        {lastMessage && !chatOpen && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] text-muted-foreground max-w-lg mx-auto px-6 mt-3 text-center line-clamp-2 italic"
          >
            "{lastMessage.slice(0, 120)}…"
          </motion.p>
        )}
      </div>

      {/* ─── CARDS GRID ─── */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 xl:px-16 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {/* Card 1: Tasks */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <DashboardCard title="Task" icon={Target}>
              <TaskContent userId={user?.id || ""} />
            </DashboardCard>
          </motion.div>

          {/* Card 2: Vulnerabilità */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <DashboardCard
              title="Vulnerabilità"
              icon={ShieldAlert}
              badge={vulnerabilities.length}
              action={{ label: "Scansiona", onClick: scanVulnerabilities, loading: isScanning }}
            >
              <VulnerabilitiesContent vulnerabilities={vulnerabilities} />
            </DashboardCard>
          </motion.div>

          {/* Card 3: Supervisori */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <DashboardCard title="Supervisori" icon={Users}>
              <ContactsContent userId={user?.id || ""} />
            </DashboardCard>
          </motion.div>
        </div>

        {/* Companies row */}
        <motion.div className="max-w-6xl mx-auto mt-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <DashboardCard title="Aziende" icon={Building2}>
            <CompaniesContent userId={user?.id || ""} />
          </DashboardCard>
        </motion.div>
      </div>

      {/* ─── BOTTOM STEPPER ─── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border py-3 px-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {STAGES.map((s, i) => {
            const isCompleted = i < currentStageIndex;
            const isCurrent = i === currentStageIndex;
            return (
              <div key={s.key} className="flex flex-col items-center gap-1.5 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                  isCompleted
                    ? "bg-accent text-accent-foreground"
                    : isCurrent
                      ? "bg-accent/20 text-accent border border-accent/40"
                      : "bg-secondary text-muted-foreground"
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-[9px] font-medium ${isCurrent ? "text-accent" : isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── CHAT OVERLAY ─── */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
              onClick={() => setChatOpen(false)}
            />
            <ChatOverlay
              messages={messages}
              input={input}
              setInput={setInput}
              sendMessage={sendMessage}
              isStreaming={isStreaming}
              onClose={() => setChatOpen(false)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
