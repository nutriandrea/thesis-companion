import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/types/data";

const SOCRATE_RESPONSES = [
  "Interessante affermazione. Ma hai considerato le implicazioni controfattuali? Se la tua ipotesi fosse falsa, quali evidenze osserveresti?",
  "Noto una potenziale fragilità nel tuo ragionamento: stai assumendo una correlazione causale senza controllo per variabili confondenti. Come potresti rafforzare questo punto?",
  "Buona osservazione. Tuttavia, la letteratura recente di Smith et al. (2025) suggerisce un meccanismo alternativo. Come lo integreresti nel tuo framework?",
  "Il tuo argomento ha solidità logica, ma manca di evidenza empirica. Quali dati potresti raccogliere per supportarlo? Suggerisco di esplorare dataset aperti come quelli di SNSF.",
  "Vedo tre punti di forza e una debolezza nel tuo ragionamento:\n\n**Forza 1:** Buona connessione alla teoria esistente\n**Forza 2:** Approccio metodologico chiaro\n**Forza 3:** Rilevanza pratica evidente\n\n**Debolezza:** La generalizzabilità è limitata al contesto svizzero. Come estenderesti?",
  "Riflessione stimolante! Ma poniamoci la domanda fondamentale: *perché* questo problema è importante? Quale gap nella conoscenza colmi esattamente?",
];

export default function SocratePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Benvenuto nel **Socrate Duello**. Sono qui per sfidare il tuo ragionamento, evidenziare fragilità logiche e aiutarti a costruire argomentazioni più solide per la tua tesi.\n\nPresentami la tua tesi o un argomento che vuoi discutere.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const response = SOCRATE_RESPONSES[Math.floor(Math.random() * SOCRATE_RESPONSES.length)];
      setMessages(prev => [
        ...prev,
        { id: `msg-${Date.now()}`, role: "assistant", content: response, timestamp: new Date() },
      ]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-2 rounded-lg bg-ai/10">
          <Sparkles className="w-5 h-5 text-ai" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display">Socrate Duello</h1>
          <p className="text-sm text-muted-foreground">Sfida il tuo ragionamento con l'AI</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        <AnimatePresence>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "assistant" ? "bg-ai/10" : "bg-accent/10"
              }`}>
                {msg.role === "assistant" ? <Bot className="w-4 h-4 text-ai" /> : <User className="w-4 h-4 text-accent" />}
              </div>
              <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === "assistant"
                  ? "bg-card border shadow-sm"
                  : "bg-accent text-accent-foreground"
              }`}>
                {msg.content.split(/(\*\*.*?\*\*)/).map((part, i) =>
                  part.startsWith("**") && part.endsWith("**")
                    ? <strong key={i}>{part.slice(2, -2)}</strong>
                    : part.startsWith("*") && part.endsWith("*")
                    ? <em key={i}>{part.slice(1, -1)}</em>
                    : <span key={i}>{part}</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-ai/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-ai" />
            </div>
            <div className="bg-card border rounded-xl px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-ai animate-pulse-soft" />
                <span className="w-2 h-2 rounded-full bg-ai animate-pulse-soft" style={{ animationDelay: "0.3s" }} />
                <span className="w-2 h-2 rounded-full bg-ai animate-pulse-soft" style={{ animationDelay: "0.6s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t pt-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Presenta il tuo argomento o fai una domanda..."
            className="flex-1 bg-card border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <Button variant="ai" size="icon" onClick={handleSend} disabled={!input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
