import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MicOff, Mic, Volume2, VolumeX, Send, Loader2, FileText, X } from "lucide-react";
import { useScribe } from "@elevenlabs/react";
import VoiceWaveform from "./VoiceWaveform";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

type VoiceState = "idle" | "listening" | "processing" | "speaking";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface VoiceConversationProps {
  onTranscript: (text: string) => void;
  onClose: () => void;
  isStreaming: boolean;
  lastAssistantMessage: string;
  severity: number;
  messages: ChatMsg[];
  onGenerateReport?: () => void;
  isGeneratingReport?: boolean;
}

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

export default function VoiceConversation({
  onTranscript,
  onClose,
  isStreaming,
  lastAssistantMessage,
  severity,
  messages,
  onGenerateReport,
  isGeneratingReport,
}: VoiceConversationProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [muted, setMuted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const prevMessageRef = useRef<string>("");
  const isSpeakingRef = useRef(false);
  const hasAutoStarted = useRef(false);
  const mutedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Scribe (STT)
  const scribe = useScribe({
    modelId: "scribe_v2_realtime" as any,
    commitStrategy: "vad" as any,
    onPartialTranscript: (data: any) => setLiveTranscript(data.text),
    onCommittedTranscript: (data: any) => {
      if (data.text.trim()) {
        setLiveTranscript("");
        onTranscript(data.text.trim());
        setVoiceState("processing");
      }
    },
  });

  const startListening = useCallback(async () => {
    if (mutedRef.current || isSpeakingRef.current) return;
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (fnError || !data?.token) { setError("Impossibile avviare la trascrizione"); return; }
      await scribe.connect({
        token: data.token,
        microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      setVoiceState("listening");
    } catch (e) {
      console.error("Start listening error:", e);
      setError("Microfono non disponibile");
    }
  }, [scribe]);

  useEffect(() => {
    if (!hasAutoStarted.current) { hasAutoStarted.current = true; startListening(); }
  }, [startListening]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; audioRef.current = null; }
    if (audioUrlRef.current) { URL.revokeObjectURL(audioUrlRef.current); audioUrlRef.current = null; }
    isSpeakingRef.current = false;
  }, []);

  const speakText = useCallback(async (text: string) => {
    if (!audioEnabled || !text.trim()) return;
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")
      .replace(/#{1,6}\s/g, "").replace(/```[\s\S]*?```/g, "")
      .replace(/`(.*?)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n{2,}/g, ". ").replace(/\n/g, " ").trim();
    if (!cleanText) return;

    scribe.disconnect();
    stopAudio();
    setVoiceState("speaking");
    isSpeakingRef.current = true;

    try {
      const response = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: cleanText, severity }),
      });
      if (!response.ok) {
        isSpeakingRef.current = false; setVoiceState("idle");
        setTimeout(() => startListening(), 300); return;
      }
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        isSpeakingRef.current = false;
        URL.revokeObjectURL(audioUrl); audioUrlRef.current = null; audioRef.current = null;
        setVoiceState("idle");
        setTimeout(() => startListening(), 300);
      };
      audio.onerror = () => { isSpeakingRef.current = false; setVoiceState("idle"); setTimeout(() => startListening(), 300); };
      await audio.play();
    } catch (e) {
      console.error("TTS playback error:", e);
      isSpeakingRef.current = false; setVoiceState("idle");
      setTimeout(() => startListening(), 300);
    }
  }, [audioEnabled, severity, stopAudio, startListening, scribe]);

  useEffect(() => {
    if (lastAssistantMessage && lastAssistantMessage !== prevMessageRef.current && !isStreaming && audioEnabled) {
      prevMessageRef.current = lastAssistantMessage;
      speakText(lastAssistantMessage);
    }
  }, [lastAssistantMessage, isStreaming, audioEnabled, speakText]);

  useEffect(() => { if (isStreaming && voiceState !== "speaking") setVoiceState("processing"); }, [isStreaming]);
  useEffect(() => { return () => { scribe.disconnect(); stopAudio(); }; }, []);

  const toggleMute = useCallback(() => {
    if (muted) { setMuted(false); if (!isSpeakingRef.current) setTimeout(() => startListening(), 100); }
    else { setMuted(true); scribe.disconnect(); setLiveTranscript(""); if (voiceState === "listening") setVoiceState("idle"); }
  }, [muted, scribe, voiceState, startListening]);

  const interruptSocrate = useCallback(() => {
    stopAudio(); setVoiceState("idle");
    if (!mutedRef.current) setTimeout(() => startListening(), 100);
  }, [stopAudio, startListening]);

  const handleTextSend = () => {
    if (!textInput.trim()) return;
    stopAudio(); scribe.disconnect();
    onTranscript(textInput.trim());
    setTextInput("");
    setVoiceState("processing");
  };

  const stateLabel = {
    idle: muted ? "In muto" : "Pronto",
    listening: "In ascolto",
    processing: "Elaborazione",
    speaking: "Socrate parla",
  }[voiceState];

  const showReport = messages.length >= 6 && onGenerateReport;

  return (
    <div className="flex flex-col h-full select-none">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
        <div className="flex-1 flex items-center gap-3">
          {/* Voice state orb */}
          <motion.div
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors duration-300 ${
              voiceState === "listening" ? "border-foreground"
              : voiceState === "processing" ? "border-muted-foreground/50"
              : voiceState === "speaking" ? "border-foreground/60"
              : muted ? "border-destructive/40" : "border-border"
            }`}
            animate={voiceState === "listening" ? { scale: [1, 1.06, 1] } : voiceState === "speaking" ? { scale: [1, 1.03, 1] } : {}}
            transition={voiceState === "listening" || voiceState === "speaking" ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
            onClick={() => { if (voiceState === "speaking") interruptSocrate(); }}
          >
            {voiceState === "processing" ? (
              <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
            ) : voiceState === "listening" ? (
              <VoiceWaveform active />
            ) : voiceState === "speaking" ? (
              <Volume2 className="w-3.5 h-3.5 text-foreground/80" />
            ) : muted ? (
              <MicOff className="w-3.5 h-3.5 text-destructive/60" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </motion.div>
          <div>
            <p className="text-sm font-bold text-foreground font-display">Socrate</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stateLabel}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button onClick={toggleMute}
            className={`p-2 rounded-lg transition-colors ${muted ? "text-destructive" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            title={muted ? "Riattiva microfono" : "Metti in muto"}>
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button onClick={() => { setAudioEnabled(!audioEnabled); if (audioEnabled) stopAudio(); }}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={audioEnabled ? "Disattiva voce" : "Attiva voce"}>
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {showReport && (
            <button onClick={onGenerateReport} disabled={isGeneratingReport || isStreaming}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
              title="Genera report">
              {isGeneratingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map(msg => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-4 py-3 text-sm rounded-xl ${
              msg.role === "assistant" ? "bg-secondary/50 border border-border" : "bg-accent/10 border border-accent/20"
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

        {/* Live transcript indicator */}
        {(liveTranscript || voiceState === "listening") && messages.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
            <div className="max-w-[80%] px-4 py-2 text-sm rounded-xl bg-accent/5 border border-accent/10 text-foreground/60 italic">
              {liveTranscript || "..."}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-5 py-1 text-xs text-destructive text-center">{error}</motion.p>
        )}
      </AnimatePresence>

      {/* Text input */}
      <div className="border-t border-border px-5 py-3 flex items-center gap-2 shrink-0">
        <input
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleTextSend()}
          placeholder="Scrivi a Socrate..."
          disabled={isStreaming}
          className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
        />
        <button onClick={handleTextSend} disabled={!textInput.trim() || isStreaming}
          className="p-2.5 bg-accent text-accent-foreground rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-30">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
