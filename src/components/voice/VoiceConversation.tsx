import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Square, Volume2, VolumeX, Keyboard, Loader2 } from "lucide-react";
import { useScribe } from "@elevenlabs/react";
import VoiceWaveform from "./VoiceWaveform";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_HEADERS } from "@/lib/auth-headers";

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
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const prevMessageRef = useRef<string>("");
  const isSpeakingRef = useRef(false);

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
    setError(null);
    try {
      // Stop any playing audio
      stopAudio();

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

  // Stop listening
  const stopListening = useCallback(() => {
    scribe.disconnect();
    if (liveTranscript.trim()) {
      onTranscript(liveTranscript.trim());
      setLiveTranscript("");
    }
    setVoiceState("idle");
  }, [scribe, liveTranscript, onTranscript]);

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
    if (voiceState === "speaking") {
      setVoiceState("idle");
    }
  }, [voiceState]);

  // Speak text via TTS
  const speakText = useCallback(async (text: string) => {
    if (!audioEnabled || !text.trim()) return;

    // Clean markdown for speech
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
        const errData = await response.json().catch(() => ({}));
        console.error("TTS error:", errData);
        setVoiceState("idle");
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
        // Auto-resume listening after Socrate finishes speaking
        setTimeout(() => startListening(), 300);
      };

      audio.onerror = () => {
        isSpeakingRef.current = false;
        setVoiceState("idle");
      };

      await audio.play();
    } catch (e) {
      console.error("TTS playback error:", e);
      isSpeakingRef.current = false;
      setVoiceState("idle");
    }
  }, [audioEnabled, severity, stopAudio, startListening]);

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

  // Interrupt Socrate
  const interruptSocrate = useCallback(() => {
    stopAudio();
    startListening();
  }, [stopAudio, startListening]);

  const stateLabel = {
    idle: "Pronto",
    listening: "In ascolto",
    processing: "Elaborazione",
    speaking: "Socrate parla",
  }[voiceState];

  return (
    <div className="flex flex-col items-center justify-center h-full relative select-none">
      {/* State indicator - minimal */}
      <motion.p
        key={voiceState}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="ds-caption mb-8 uppercase tracking-widest text-[10px]"
      >
        {stateLabel}
      </motion.p>

      {/* Central orb - subtle pulse based on state */}
      <motion.div
        className="relative cursor-pointer"
        onClick={() => {
          if (voiceState === "idle") startListening();
          else if (voiceState === "listening") stopListening();
          else if (voiceState === "speaking") interruptSocrate();
        }}
      >
        {/* Outer ring - state indicator */}
        <motion.div
          className={`w-24 h-24 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${
            voiceState === "listening"
              ? "border-foreground"
              : voiceState === "processing"
              ? "border-muted-foreground/50"
              : voiceState === "speaking"
              ? "border-foreground/60"
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
            <Mic className="w-6 h-6 text-foreground" />
          ) : voiceState === "speaking" ? (
            <Volume2 className="w-6 h-6 text-foreground/80" />
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

      {/* Bottom controls */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4">
        {/* Toggle audio */}
        <button
          onClick={() => {
            setAudioEnabled(!audioEnabled);
            if (audioEnabled) stopAudio();
          }}
          className="p-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-150"
          title={audioEnabled ? "Disattiva audio" : "Attiva audio"}
        >
          {audioEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>

        {/* Stop button (when active) */}
        {(voiceState === "listening" || voiceState === "speaking") && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={() => {
              stopAudio();
              stopListening();
              setVoiceState("idle");
            }}
            className="p-2.5 rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors duration-150"
            title="Ferma"
          >
            <Square className="w-4 h-4" />
          </motion.button>
        )}

        {/* Switch to text */}
        <button
          onClick={() => {
            stopAudio();
            if (scribe.isConnected) scribe.disconnect();
            onSwitchToText();
          }}
          className="p-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-150"
          title="Passa alla tastiera"
        >
          <Keyboard className="w-4 h-4" />
        </button>
      </div>

      {/* Tap instruction */}
      {voiceState === "idle" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1 }}
          className="absolute bottom-20 text-[10px] text-muted-foreground"
        >
          Tocca per parlare
        </motion.p>
      )}
    </div>
  );
}
