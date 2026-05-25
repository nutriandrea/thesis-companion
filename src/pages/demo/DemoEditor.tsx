import ReactMarkdown from "react-markdown";
import { DemoPageHeader } from "./DemoShell";
import { DEMO_EDITOR_CHAPTER } from "@/data/demo-mocks";
import { FileText } from "lucide-react";

export default function DemoEditor() {
  return (
    <div className="min-h-screen">
      <DemoPageHeader title="Editor" subtitle="Anteprima del capitolo in scrittura" />
      <div className="px-8 py-6 max-w-3xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-foreground" />
            <h3 className="text-sm font-semibold text-foreground">{DEMO_EDITOR_CHAPTER.title}</h3>
          </div>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>{DEMO_EDITOR_CHAPTER.word_count.toLocaleString()} parole</span>
            <span>·</span>
            <span>Salvato {new Date(DEMO_EDITOR_CHAPTER.updated_at).toLocaleDateString("it-IT")}</span>
          </div>
        </div>

        <article className="prose prose-sm max-w-none text-foreground prose-headings:font-display prose-headings:text-foreground prose-strong:text-foreground prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-pre:bg-secondary/50 prose-pre:border prose-pre:border-border">
          <ReactMarkdown>{DEMO_EDITOR_CHAPTER.body}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
