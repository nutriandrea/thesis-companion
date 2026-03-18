import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Eye, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";

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

interface ThesisFeedback { id: string; title: string; detail: string; reason: string; }

export default function EditorPage() {
  const { user } = useApp();
  const [latex, setLatex] = useState(() => {
    return localStorage.getItem("thesis-latex-content") || SAMPLE_LATEX;
  });
  const [feedback, setFeedback] = useState<ThesisFeedback[]>([]);

  useEffect(() => {
    localStorage.setItem("thesis-latex-content", latex);
  }, [latex]);

  // Load Socrate thesis feedback
  useEffect(() => {
    if (!user) return;
    supabase.from("socrate_suggestions" as any).select("*").eq("user_id", user.id).eq("category", "thesis_feedback").order("created_at", { ascending: false }).limit(10)
      .then(({ data }: any) => { if (data) setFeedback(data); });
  }, [user]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-2 rounded-lg bg-accent/10">
          <FileText className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display">Editor LaTeX</h1>
          <p className="text-sm text-muted-foreground">Scrivi e visualizza la tua tesi in tempo reale</p>
        </div>
      </div>

      {/* Socrate Feedback Panel */}
      {feedback.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mt-3 bg-gradient-to-r from-ai/5 to-warning/5 border border-ai/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-ai" />
            <p className="text-sm font-semibold text-foreground">Feedback di Socrate sulla tesi</p>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {feedback.map(fb => (
              <div key={fb.id} className="text-xs">
                <span className="font-medium text-foreground">{fb.title}</span>
                <span className="text-muted-foreground"> — {fb.detail}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Editor */}
      <div className="flex-1 mt-4 overflow-hidden">
        <div className="hidden md:grid grid-cols-2 gap-4 h-full">
          <div className="flex flex-col h-full">
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
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
              <Eye className="w-4 h-4" /> Anteprima
            </div>
            <div
              className="flex-1 bg-card border rounded-lg p-6 overflow-y-auto shadow-inner"
              dangerouslySetInnerHTML={{ __html: latexToPreview(latex) }}
            />
          </div>
        </div>

        <Tabs defaultValue="source" className="md:hidden h-full flex flex-col">
          <TabsList>
            <TabsTrigger value="source">Sorgente</TabsTrigger>
            <TabsTrigger value="preview">Anteprima</TabsTrigger>
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
        </Tabs>
      </div>
    </div>
  );
}
