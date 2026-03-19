import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Eye, Sparkles, Brain, Loader2, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Zap, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import { useSocrateSuggestions } from "@/hooks/useSocrateSuggestions";
import { AUTH_HEADERS } from "@/lib/auth-headers";
import { useToast } from "@/hooks/use-toast";

const SOCRATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socrate`;


const SAMPLE_LATEX = `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}
\\usepackage[italian]{babel}

\\title{Applying NLP to Automate Knowledge Discovery \\\\
       in Academic Research}
\\author{Luca Meier \\\\
  \\small MSc Computer Science, ETH Zurich \\\\
  \\small Supervisore: Prof. Dr. Martin Vechev}
\\date{\\today}

\\begin{document}
\\maketitle

\\begin{abstract}
Questa tesi esplora l'uso dei Large Language Models 
per accelerare la literature review e la generazione 
di ipotesi nella ricerca multidisciplinare.
\\end{abstract}

\\section{Introduzione}
La crescita esponenziale delle pubblicazioni scientifiche 
rende sempre più difficile per i ricercatori mantenere 
una visione completa della letteratura esistente. 
In questo lavoro, proponiamo un approccio basato su NLP 
per automatizzare il processo di knowledge discovery.

\\section{Background}
\\subsection{Natural Language Processing}
I recenti progressi nel campo del NLP, in particolare 
i modelli Transformer \\cite{vaswani2017attention}, 
hanno rivoluzionato la comprensione del linguaggio naturale.

\\subsection{Knowledge Graphs}
I knowledge graph rappresentano le relazioni tra entità 
in modo strutturato, facilitando il ragionamento automatico.

\\section{Metodologia}
La nostra metodologia si articola in tre fasi:
\\begin{enumerate}
  \\item Raccolta e preprocessing del corpus
  \\item Estrazione di entità e relazioni con BERT
  \\item Costruzione e analisi del knowledge graph
\\end{enumerate}

La funzione obiettivo è definita come:
\\begin{equation}
  \\mathcal{L} = -\\sum_{i=1}^{N} \\log P(y_i | x_i; \\theta)
\\end{equation}

\\section{Risultati}
\\textit{In corso di elaborazione...}

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}`;

function latexToPreview(latex: string): string {
  let html = latex;
  const docMatch = html.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (docMatch) html = docMatch[1];
  const titleMatch = latex.match(/\\title\{([\s\S]*?)\}/);
  const authorMatch = latex.match(/\\author\{([\s\S]*?)\}/);
  let preview = '<div style="font-family: Lora, serif; max-width: 600px; margin: 0 auto; line-height: 1.8;">';
  if (titleMatch) {
    const title = titleMatch[1].replace(/\\\\/g, ' ').replace(/\\small\s*/g, '');
    preview += `<h1 style="text-align:center;font-size:1.5rem;font-weight:bold;margin-bottom:0.5rem;">${title}</h1>`;
  }
  if (authorMatch) {
    const author = authorMatch[1].replace(/\\\\/g, '<br/>').replace(/\\small\s*/g, '');
    preview += `<p style="text-align:center;font-size:0.85rem;color:#64748b;margin-bottom:2rem;">${author}</p>`;
  }
  html = html.replace(/\\maketitle/g, '');
  html = html.replace(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/g,
    '<div style="margin:1.5rem 2rem;padding:1rem;border-left:3px solid #3B82F6;background:#f8fafc;font-style:italic;font-size:0.9rem;">$1</div>');
  html = html.replace(/\\section\{(.*?)\}/g, '<h2 style="font-size:1.25rem;font-weight:bold;margin-top:2rem;margin-bottom:0.5rem;">$1</h2>');
  html = html.replace(/\\subsection\{(.*?)\}/g, '<h3 style="font-size:1.1rem;font-weight:600;margin-top:1.5rem;margin-bottom:0.3rem;">$1</h3>');
  html = html.replace(/\\textit\{(.*?)\}/g, '<em>$1</em>');
  html = html.replace(/\\textbf\{(.*?)\}/g, '<strong>$1</strong>');
  html = html.replace(/\\cite\{(.*?)\}/g, '<sup style="color:#3B82F6;">[$1]</sup>');
  html = html.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, content) => {
    const items = content.split('\\item').filter((s: string) => s.trim());
    return '<ol style="padding-left:1.5rem;margin:0.5rem 0;">' + items.map((item: string) => `<li style="margin:0.25rem 0;">${item.trim()}</li>`).join('') + '</ol>';
  });
  html = html.replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g,
    '<div style="text-align:center;margin:1rem 0;padding:0.75rem;background:#f1f5f9;border-radius:0.5rem;font-family:monospace;font-size:0.9rem;">$1</div>');
  html = html.replace(/\\bibliographystyle\{.*?\}/g, '');
  html = html.replace(/\\bibliography\{.*?\}/g, '<p style="margin-top:2rem;font-size:0.85rem;color:#94a3b8;">[Riferimenti bibliografici]</p>');
  preview += html + '</div>';
  return preview;
}

interface SectionAnalysis {
  name: string;
  status: "complete" | "partial" | "missing" | "needs_revision";
  completeness: number;
  quality_notes: string;
  issues: string[];
  suggestions: string[];
}

interface EditorTask {
  priority: "critical" | "high" | "medium" | "low";
  section: string;
  title: string;
  detail: string;
  type: string;
}

interface LatexAnalysis {
  sectionAnalysis: {
    sections: SectionAnalysis[];
    overall_score: number;
    overall_assessment: string;
    detected_stage: string;
  } | null;
  editorTasks: EditorTask[];
  summary: { sectionsAnalyzed: number; overallScore: number; tasksGenerated: number; stage: string };
}

const statusIcons: Record<string, React.ElementType> = {
  complete: CheckCircle, partial: AlertTriangle, missing: AlertTriangle, needs_revision: RefreshCw,
};
const statusColors: Record<string, string> = {
  complete: "text-success", partial: "text-warning", missing: "text-destructive", needs_revision: "text-accent",
};
const statusLabels: Record<string, string> = {
  complete: "Completa", partial: "Parziale", missing: "Mancante", needs_revision: "Da rivedere",
};
const priorityColors: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive", high: "bg-warning/10 text-warning",
  medium: "bg-accent/10 text-accent", low: "bg-muted text-muted-foreground",
};

export default function EditorPage() {
  const { user, profile } = useApp();
  const { toast } = useToast();
  const [latex, setLatex] = useState(() => localStorage.getItem("thesis-latex-content") || SAMPLE_LATEX);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<LatexAnalysis | null>(null);
  const [showPanel, setShowPanel] = useState(true);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Realtime thesis feedback from Socrate
  const { suggestions: thesisFeedback } = useSocrateSuggestions(user?.id, ["thesis_feedback"]);
  const { suggestions: nextSteps } = useSocrateSuggestions(user?.id, ["next_step"]);

  // Persist LaTeX to localStorage (debounced)
  useEffect(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      localStorage.setItem("thesis-latex-content", latex);
      // Dispatch storage event for Socrate page to pick up
      window.dispatchEvent(new Event("storage"));
    }, 500);
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [latex]);

  const studentContext = profile
    ? `Nome: ${profile.first_name} ${profile.last_name}\nCorso: ${profile.degree || "N/A"}\nUniversità: ${profile.university || "N/A"}\nArgomento: ${profile.thesis_topic || "Non definito"}`
    : "";

  // Run LaTeX analysis
  const runAnalysis = useCallback(async () => {
    if (isAnalyzing || !user || latex.trim().length < 50) return;
    setIsAnalyzing(true);

    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          mode: "analyze_latex",
          latexContent: latex,
          studentContext,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Errore" }));
        toast({ variant: "destructive", title: "Errore", description: err.error || "Analisi fallita" });
        setIsAnalyzing(false);
        return;
      }

      const result: LatexAnalysis = await resp.json();
      setAnalysis(result);
      setShowPanel(true);

      toast({
        title: "Analisi LaTeX completata",
        description: `${result.summary.sectionsAnalyzed} sezioni · Punteggio: ${result.summary.overallScore}/10 · ${result.summary.tasksGenerated} task generati`,
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Errore", description: "Impossibile analizzare il LaTeX." });
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, user, latex, studentContext, toast]);

  const sidePanel = (
    <div className="space-y-4 overflow-y-auto h-full pb-4">
      {/* Analysis Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-ai" />
          <span className="text-sm font-semibold text-foreground">Analisi Socrate</span>
        </div>
        <button onClick={runAnalysis} disabled={isAnalyzing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ai/10 border border-ai/20 text-xs text-ai hover:bg-ai/20 transition-colors disabled:opacity-30">
          {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          Analizza
        </button>
      </div>

      {/* Overall Score */}
      {analysis?.sectionAnalysis && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Punteggio Tesi</span>
            <span className="text-2xl font-bold text-foreground">{analysis.sectionAnalysis.overall_score}<span className="text-sm text-muted-foreground">/10</span></span>
          </div>
          <Progress value={analysis.sectionAnalysis.overall_score * 10} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground">{analysis.sectionAnalysis.overall_assessment}</p>
          <Badge variant="secondary" className="mt-2 text-[10px]">
            Fase: {analysis.sectionAnalysis.detected_stage}
          </Badge>
        </motion.div>
      )}

      {/* Section Analysis */}
      {analysis?.sectionAnalysis?.sections && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Sezioni</h3>
          <div className="space-y-2">
            {analysis.sectionAnalysis.sections.map((sec, i) => {
              const Icon = statusIcons[sec.status] || AlertTriangle;
              const color = statusColors[sec.status] || "text-muted-foreground";
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-card border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                      <span className="text-xs font-medium text-foreground">{sec.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{statusLabels[sec.status]}</span>
                      <span className="text-xs font-bold text-foreground">{sec.completeness}%</span>
                    </div>
                  </div>
                  <Progress value={sec.completeness} className="h-1 mb-1.5" />
                  <p className="text-[10px] text-muted-foreground">{sec.quality_notes}</p>
                  {sec.issues.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {sec.issues.slice(0, 2).map((issue, j) => (
                        <p key={j} className="text-[10px] text-destructive/80">⚠ {issue}</p>
                      ))}
                    </div>
                  )}
                  {sec.suggestions.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {sec.suggestions.slice(0, 2).map((sug, j) => (
                        <p key={j} className="text-[10px] text-ai/80">{sug}</p>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Editor Tasks */}
      {analysis?.editorTasks && analysis.editorTasks.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Task Editor</h3>
          <div className="space-y-2">
            {analysis.editorTasks.map((task, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.04 }}
                className="bg-card border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${priorityColors[task.priority]}`}>
                    {task.priority}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">{task.section}</Badge>
                </div>
                <p className="text-xs font-medium text-foreground">{task.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{task.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Realtime Socrate Feedback */}
      {thesisFeedback.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Feedback Socrate</h3>
          <div className="space-y-2">
            {thesisFeedback.slice(0, 5).map((fb) => (
              <div key={fb.id} className="bg-ai/5 border border-ai/10 rounded-lg p-3">
                <p className="text-xs font-medium text-foreground">{fb.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{fb.detail}</p>
                {fb.reason && <p className="text-[10px] text-ai/70 mt-1 italic">💡 {fb.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps */}
      {nextSteps.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Prossimi Passi</h3>
          <div className="space-y-1.5">
            {nextSteps.slice(0, 5).map((ns) => (
              <div key={ns.id} className="flex items-start gap-2 text-xs">
                <Sparkles className="w-3 h-3 text-accent mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-foreground">{ns.title}</span>
                  <span className="text-muted-foreground"> — {ns.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!analysis && thesisFeedback.length === 0 && nextSteps.length === 0 && (
        <div className="bg-card border border-dashed rounded-xl p-6 text-center">
          <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Clicca "Analizza" per una valutazione dettagliata della tesi</p>
          <p className="text-xs text-muted-foreground mt-1">Socrate aggiornerà automaticamente il tuo profilo</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-2 rounded-lg bg-accent/10">
          <FileText className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display">Editor LaTeX</h1>
          <p className="text-sm text-muted-foreground">
            Scrivi la tesi · Socrate analizza in tempo reale
            {analysis && <span className="ml-2 text-ai">· Punteggio: {analysis.summary.overallScore}/10</span>}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isAnalyzing && (
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Analisi in corso...
            </span>
          )}
          <button onClick={() => setShowPanel(!showPanel)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Brain className="w-3.5 h-3.5" />
            {showPanel ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            Pannello
          </button>
        </div>
      </div>

      {/* Desktop: Editor + Side Panel */}
      <div className="flex-1 mt-4 overflow-hidden hidden md:flex gap-4">
        {/* Editor + Preview */}
        <div className={`flex gap-4 ${showPanel ? "flex-[3]" : "flex-1"}`}>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
              <FileText className="w-4 h-4" /> Sorgente LaTeX
            </div>
            <textarea
              value={latex}
              onChange={e => setLatex(e.target.value)}
              className="flex-1 w-full bg-card border rounded-lg p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
              <Eye className="w-4 h-4" /> Anteprima
            </div>
            <div
              className="flex-1 bg-card border rounded-lg p-6 overflow-y-auto shadow-inner"
              dangerouslySetInnerHTML={{ __html: latexToPreview(latex) }}
            />
          </div>
        </div>

        {/* Socrate Side Panel */}
        {showPanel && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="w-80 shrink-0 border-l border-border pl-4 overflow-y-auto">
            {sidePanel}
          </motion.div>
        )}
      </div>

      {/* Mobile */}
      <Tabs defaultValue="source" className="md:hidden flex-1 mt-4 flex flex-col">
        <TabsList>
          <TabsTrigger value="source">Sorgente</TabsTrigger>
          <TabsTrigger value="preview">Anteprima</TabsTrigger>
          <TabsTrigger value="analysis">Analisi</TabsTrigger>
        </TabsList>
        <TabsContent value="source" className="flex-1">
          <textarea
            value={latex}
            onChange={e => setLatex(e.target.value)}
            className="w-full h-full bg-card border rounded-lg p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
            spellCheck={false}
          />
        </TabsContent>
        <TabsContent value="preview" className="flex-1">
          <div
            className="h-full bg-card border rounded-lg p-4 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: latexToPreview(latex) }}
          />
        </TabsContent>
        <TabsContent value="analysis" className="flex-1 overflow-y-auto">
          {sidePanel}
        </TabsContent>
      </Tabs>
    </div>
  );
}
