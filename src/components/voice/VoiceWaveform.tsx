import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const BAR_COUNT = 5;
const FFT_SIZE = 64;

export default function VoiceWaveform({ active }: { active: boolean }) {
  const [levels, setLevels] = useState<number[]>(Array(BAR_COUNT).fill(0));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setLevels(Array(BAR_COUNT).fill(0));
      return;
    }

    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(dataArray);

          // Pick evenly spaced bins and normalize to 0-1
          const step = Math.floor(dataArray.length / BAR_COUNT);
          const newLevels = Array.from({ length: BAR_COUNT }, (_, i) => {
            const val = dataArray[i * step] ?? 0;
            return Math.min(val / 200, 1); // normalize, cap at 1
          });

          setLevels(newLevels);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // Mic not available — silent fail, Scribe handles the actual recording
      }
    };

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      analyserRef.current = null;
    };
  }, [active]);

  return (
    <div className="flex items-center justify-center gap-[3px] h-6">
      {levels.map((level, i) => (
        <motion.div
          key={i}
          className="w-[2px] rounded-full bg-foreground/40"
          animate={{ height: 4 + level * 18 }}
          transition={{ duration: 0.08, ease: "linear" }}
        />
      ))}
    </div>
  );
}
