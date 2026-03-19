import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MicOff, Mic, Volume2, VolumeX, Send, Loader2 } from "lucide-react";
import { useScribe } from "@elevenlabs/react";
import VoiceWaveform from "./VoiceWaveform";
import { supabase } from "@/integrations/supabase/client";

type VoiceState = "idle" | "listening" | "processing" | "speaking";

interface VoiceConversationProps {
  onTranscript: (text: string) => void;
  onSwitchToText: () => void;
  isStreaming: boolean;
  lastAssistantMessage: string;
  severity: number;
}

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

export default function VoiceConversation({
  onTranscript,
  onSwitchToText,
  isStreaming,
  lastAssistantMessage,
  severity,
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

  // Keep mutedRef in sync
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // Scribe (STT)
  const scribe = useScribe({
    modelId: "scribe_v2_realtime" as any,
    commitStrategy: "vad" as any,
    onPartialTranscript: (data: any) => {
      setLiveTranscript(data.text);
    },
    onCommittedTranscript: (data: any) => {
      if (data.text.trim()) {
        setLiveTranscript("");
        onTranscript(data.text.trim());
        setVoiceState("processing");
      }
    },
  });

  // Start listening
  const startListening = useCallback(async () => {
    if (mutedRef.current || isSpeakingRef.current) return;
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (fnError || !data?.token) {
        setError("Impossibile avviare la trascrizione");
        return;
      }
      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setVoiceState("listening");
    } catch (e) {
      console.error("Start listening error:", e);
      setError("Microfono non disponibile");
    }
  }, [scribe]);

  // Auto-start on mount
  useEffect(() => {
    if (!hasAutoStarted.current) {
      hasAutoStarted.current = true;
      startListening();
    }
  }, [startListening]);

  // Stop audio
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    isSpeakingRef.current = false;
  }, []);

  // Speak text via TTS
  const speakText = useCallback(async (text: string) => {
    if (!audioEnabled || !text.trim()) return;

    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`(.*?)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .trim();

    if (!cleanText) return;

    // Disconnect mic before speaking
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
        console.error("TTS error:", response.status);
        isSpeakingRef.current = false;
        setVoiceState("idle");
        // Resume listening even on TTS error
        setTimeout(() => startListening(), 300);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        isSpeakingRef.current = false;
        URL.revokeObjectURL(audioUrl);
        audioUrlRef.current = null;
        audioRef.current = null;
        setVoiceState("idle");
        // Auto-resume listening after Socrate finishes
        setTimeout(() => startListening(), 300);
      };

      audio.onerror = () => {
        isSpeakingRef.current = false;
        setVoiceState("idle");
        setTimeout(() => startListening(), 300);
      };

      await audio.play();
    } catch (e) {
      console.error("TTS playback error:", e);
      isSpeakingRef.current = false;
      setVoiceState("idle");
      setTimeout(() => startListening(), 300);
    }
  }, [audioEnabled, severity, stopAudio, startListening, scribe]);

  // Watch for new assistant messages to auto-speak
  useEffect(() => {
    if (
      lastAssistantMessage &&
      lastAssistantMessage !== prevMessageRef.current &&
      !isStreaming &&
      audioEnabled
    ) {
      prevMessageRef.current = lastAssistantMessage;
      speakText(lastAssistantMessage);
    }
  }, [lastAssistantMessage, isStreaming, audioEnabled, speakText]);

  // Update state when streaming
  useEffect(() => {
    if (isStreaming && voiceState !== "speaking") {
      setVoiceState("processing");
    }
  }, [isStreaming]);

  // Cleanup
  useEffect(() => {
    return () => {
      scribe.disconnect();
      stopAudio();
    };
  }, []);

  // Mute/unmute
  const toggleMute = useCallback(() => {
    if (muted) {
      // Unmute → start listening
      setMuted(false);
      if (!isSpeakingRef.current) {
        setTimeout(() => startListening(), 100);
      }
    } else {
      // Mute → stop listening
      setMuted(true);
      scribe.disconnect();
      setLiveTranscript("");
      if (voiceState === "listening") {
        setVoiceState("idle");
      }
    }
  }, [muted, scribe, voiceState, startListening]);

  // Interrupt Socrate by tapping the orb
  const interruptSocrate = useCallback(() => {
    stopAudio();
    setVoiceState("idle");
    if (!mutedRef.current) {
      setTimeout(() => startListening(), 100);
    }
  }, [stopAudio, startListening]);

  // Send text message
  const handleTextSend = () => {
    if (!textInput.trim()) return;
    stopAudio();
    scribe.disconnect();
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

  return (
    <div className="flex flex-col items-center justify-center h-full relative select-none">
      {/* State indicator */}
      <motion.p
        key={`${voiceState}-${muted}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="ds-caption mb-8 uppercase tracking-widest text-[10px]"
      >
        {stateLabel}
      </motion.p>

      {/* Central orb */}
      <motion.div
        className="relative cursor-pointer"
        onClick={() => {
          if (voiceState === "speaking") interruptSocrate();
        }}
      >
        <motion.div
          className={`w-24 h-24 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${
            voiceState === "listening"
              ? "border-foreground"
              : voiceState === "processing"
              ? "border-muted-foreground/50"
              : voiceState === "speaking"
              ? "border-foreground/60"
              : muted
              ? "border-destructive/40"
              : "border-border"
          }`}
          animate={
            voiceState === "listening"
              ? { scale: [1, 1.04, 1] }
              : voiceState === "speaking"
              ? { scale: [1, 1.02, 1] }
              : {}
          }
          transition={
            voiceState === "listening" || voiceState === "speaking"
              ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
              : {}
          }
        >
          {voiceState === "processing" ? (
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          ) : voiceState === "listening" ? (
            <VoiceWaveform active />
          ) : voiceState === "speaking" ? (
            <Volume2 className="w-6 h-6 text-foreground/80" />
          ) : muted ? (
            <MicOff className="w-6 h-6 text-destructive/60" />
          ) : (
            <Mic className="w-6 h-6 text-muted-foreground" />
          )}
        </motion.div>
      </motion.div>

      {/* Live transcript */}
      <AnimatePresence>
        {(liveTranscript || voiceState === "listening") && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-8 max-w-md text-center px-4"
          >
            <p className="ds-body text-foreground/80 min-h-[1.5em]">
              {liveTranscript || (
                <span className="text-muted-foreground italic">Parla...</span>
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speaking hint */}
      {voiceState === "speaking" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          className="mt-6 text-[10px] text-muted-foreground"
        >
          Tocca per interrompere
        </motion.p>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-xs text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Bottom area: mute + text input */}
      <div className="absolute bottom-4 left-0 right-0 px-4 space-y-3">
        {/* Mute + audio toggle */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={toggleMute}
            className={`p-2.5 rounded-full transition-colors duration-150 ${
              muted
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
            title={muted ? "Riattiva microfono" : "Metti in muto"}
          >
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              setAudioEnabled(!audioEnabled);
              if (audioEnabled) stopAudio();
            }}
            className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-150"
            title={audioEnabled ? "Disattiva voce Socrate" : "Attiva voce Socrate"}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        {/* Text input fallback */}
        <div className="flex items-center gap-2 max-w-md mx-auto">
          <input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTextSend()}
            placeholder="Scrivi..."
            className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={handleTextSend}
            disabled={!textInput.trim()}
            className="p-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors disabled:opacity-30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
