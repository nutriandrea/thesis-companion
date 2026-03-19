import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MicOff, Mic, Volume2, VolumeX, Loader2, FileText, X, Keyboard } from "lucide-react";
import { useScribe } from "@elevenlabs/react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import SocrateCoin from "@/components/shared/SocrateCoin";

type VoiceState = "idle" | "listening" | "processing" | "speaking";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface VoiceConversationProps {
  onTranscript: (text: string) => void;
  onClose: () => void;
  onSwitchToText?: () => void;
  isStreaming: boolean;
  lastAssistantMessage: string;
  severity: number;
  messages: ChatMsg[];
  onGenerateReport?: () => void;
  isGeneratingReport?: boolean;
}

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

// Concentric ring animation for speaking state
function SpeakingRings({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border border-foreground/[0.08]"
          initial={{ scale: 1, opacity: 0 }}
          animate={{
            scale: [1, 1.3 + i * 0.2, 1.5 + i * 0.3],
            opacity: [0.3 - i * 0.08, 0.15, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeOut",
          }}
        />
      ))}
    </>
  );
}

// Subtle breathing ring for listening state
function ListeningPulse({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <motion.div
      className="absolute inset-0 rounded-full border border-foreground/10"
      animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.15, 0.3] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export default function VoiceConversation({
  onTranscript,
  onClose,
  onSwitchToText,
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
  
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const prevMessageRef = useRef<string>("");
  const isSpeakingRef = useRef(false);
  const hasAutoStarted = useRef(false);
  const mutedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const unmountedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

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
    if (!audioEnabled || !text.trim() || unmountedRef.current) return;
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")
      .replace(/#{1,6}\s/g, "").replace(/```[\s\S]*?```/g, "")
      .replace(/`(.*?)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n{2,}/g, ". ").replace(/\n/g, " ").trim();
    if (!cleanText) return;

    scribe.disconnect();
    stopAudio();
    // Abort any previous in-flight TTS fetch
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

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
        signal: controller.signal,
      });
      if (unmountedRef.current) return;
      if (!response.ok) {
        isSpeakingRef.current = false; setVoiceState("idle");
        if (!unmountedRef.current) setTimeout(() => startListening(), 300); return;
      }
      const audioBlob = await response.blob();
      if (unmountedRef.current) return;
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        isSpeakingRef.current = false;
        URL.revokeObjectURL(audioUrl); audioUrlRef.current = null; audioRef.current = null;
        if (!unmountedRef.current) {
          setVoiceState("idle");
          setTimeout(() => { if (!unmountedRef.current) startListening(); }, 300);
        }
      };
      audio.onerror = () => {
        isSpeakingRef.current = false;
        if (!unmountedRef.current) {
          setVoiceState("idle");
          setTimeout(() => { if (!unmountedRef.current) startListening(); }, 300);
        }
      };
      if (unmountedRef.current) { URL.revokeObjectURL(audioUrl); return; }
      await audio.play();
    } catch (e) {
      if ((e as any)?.name === "AbortError") return; // Expected on close
      console.error("TTS playback error:", e);
      isSpeakingRef.current = false;
      if (!unmountedRef.current) {
        setVoiceState("idle");
        setTimeout(() => { if (!unmountedRef.current) startListening(); }, 300);
      }
    }
  }, [audioEnabled, severity, stopAudio, startListening, scribe]);

  useEffect(() => {
    if (lastAssistantMessage && lastAssistantMessage !== prevMessageRef.current && !isStreaming && audioEnabled) {
      prevMessageRef.current = lastAssistantMessage;
      speakText(lastAssistantMessage);
    }
  }, [lastAssistantMessage, isStreaming, audioEnabled, speakText]);

  useEffect(() => { if (isStreaming && voiceState !== "speaking") setVoiceState("processing"); }, [isStreaming]);

  // Cleanup on unmount — empty deps so it only runs once on unmount
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      abortRef.current?.abort();
      try { scribe.disconnect(); } catch(e) {}
      stopAudio();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = useCallback(() => {
    if (muted) { setMuted(false); if (!isSpeakingRef.current) setTimeout(() => startListening(), 100); }
    else { setMuted(true); scribe.disconnect(); setLiveTranscript(""); if (voiceState === "listening") setVoiceState("idle"); }
  }, [muted, scribe, voiceState, startListening]);

  const interruptSocrate = useCallback(() => {
    stopAudio(); setVoiceState("idle");
    if (!mutedRef.current) setTimeout(() => startListening(), 100);
  }, [stopAudio, startListening]);


  const stateLabel = {
    idle: muted ? "Muted" : "Ready",
    listening: "Listening...",
    processing: "Thinking...",
    speaking: "Speaking",
  }[voiceState];

  const showReport = messages.length >= 6 && onGenerateReport;
  const lastAssistant = messages.filter(m => m.role === "assistant").slice(-1)[0]?.content || "";

  return (
    <div className="flex flex-col h-full select-none bg-background relative overflow-hidden">

      {/* Top bar - minimal controls */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <button onClick={toggleMute}
            className={`p-2 rounded-full transition-colors ${muted ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            title={muted ? "Unmute" : "Mute"}>
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button onClick={() => { setAudioEnabled(!audioEnabled); if (audioEnabled) stopAudio(); }}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={audioEnabled ? "Mute Socrate" : "Unmute Socrate"}>
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`p-2 rounded-full transition-colors ${showTranscript ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            title="Toggle transcript">
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              unmountedRef.current = true;
              abortRef.current?.abort();
              try { scribe.disconnect(); } catch(e) {}
              stopAudio();
              setVoiceState("idle");
              onClose();
            }}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Passa alla chat testuale">
            <Keyboard className="w-4 h-4" />
          </button>
          {showReport && (
            <button onClick={onGenerateReport} disabled={isGeneratingReport || isStreaming}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
              title="Generate report">
              {isGeneratingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            </button>
          )}
          <button onClick={() => {
            unmountedRef.current = true;
            abortRef.current?.abort();
            try { scribe.disconnect(); } catch(e) {}
            stopAudio();
            setVoiceState("idle");
            onClose();
          }} className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Central area - Coin is the hero */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">

        {/* The Socrate Coin - central and dominant */}
        <div className="relative flex items-center justify-center">
          {/* Speaking rings animation */}
          <div className="absolute" style={{ width: 200, height: 200 }}>
            <SpeakingRings active={voiceState === "speaking"} />
          </div>

          {/* Listening pulse */}
          <div className="absolute" style={{ width: 200, height: 200 }}>
            <ListeningPulse active={voiceState === "listening"} />
          </div>

          {/* Processing spinner ring */}
          {voiceState === "processing" && (
            <motion.div
              className="absolute rounded-full border-2 border-transparent"
              style={{
                width: 210,
                height: 210,
                borderTopColor: "hsl(var(--foreground) / 0.15)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          )}

          {/* The coin itself */}
          <motion.div
            animate={
              voiceState === "speaking"
                ? { scale: [1, 1.03, 1] }
                : voiceState === "listening"
                ? { scale: [1, 1.01, 1] }
                : {}
            }
            transition={
              voiceState === "speaking"
                ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                : voiceState === "listening"
                ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
                : {}
            }
            onClick={() => { if (voiceState === "speaking") interruptSocrate(); }}
            className="cursor-pointer"
          >
            <SocrateCoin size={180} interactive={false} isActive={voiceState === "speaking" || voiceState === "listening"} />
          </motion.div>
        </div>

        {/* State label */}
        <motion.p
          key={stateLabel}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-xs text-muted-foreground uppercase tracking-[0.2em] font-medium"
        >
          {stateLabel}
        </motion.p>

        {/* Live transcript (what user is saying) */}
        <AnimatePresence>
          {liveTranscript && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 text-sm text-foreground/50 italic text-center max-w-md px-6"
            >
              {liveTranscript}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Last assistant message - shown below the coin, subtle */}
        <AnimatePresence>
          {lastAssistant && !showTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 max-w-lg px-8 text-center"
            >
              <div className="text-sm text-foreground/40 leading-relaxed line-clamp-4">
                <ReactMarkdown>{lastAssistant}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full transcript panel - slides up from bottom */}
      <AnimatePresence>
        {showTranscript && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border max-h-[50vh] flex flex-col"
          >
            <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Transcript</p>
              <button onClick={() => setShowTranscript(false)} className="p-1 rounded hover:bg-secondary">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3 py-2 text-xs rounded-lg ${
                    msg.role === "assistant"
                      ? "bg-secondary/30 text-foreground/70"
                      : "bg-accent/5 text-foreground/60"
                  }`}>
                    {msg.content === "" && isStreaming ? (
                      <span className="text-muted-foreground">...</span>
                    ) : (
                      <div className="prose prose-xs max-w-none [&_p]:my-0.5 [&_strong]:text-foreground/80">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute bottom-20 left-0 right-0 text-xs text-destructive text-center z-10">{error}</motion.p>
        )}
      </AnimatePresence>

    </div>
  );
}
