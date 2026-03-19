import { motion } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import socrateCoinImg from "@/assets/socrate-coin.png";

// Preload image globally so it's cached before any component mounts
const preloadedImg = new Image();
preloadedImg.src = socrateCoinImg;
let imgReady = false;
const imgPromise = new Promise<void>((resolve) => {
  if (preloadedImg.complete) { imgReady = true; resolve(); return; }
  preloadedImg.onload = () => { imgReady = true; resolve(); };
  preloadedImg.onerror = () => { imgReady = true; resolve(); };
});

interface SocrateCoinProps {
  size?: number;
  interactive?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function SocrateCoin({
  size = 64,
  interactive = true,
  isActive = false,
  onClick,
  className = "",
}: SocrateCoinProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [ripple, setRipple] = useState(false);
  const [loaded, setLoaded] = useState(imgReady);

  useEffect(() => {
    if (!loaded) { imgPromise.then(() => setLoaded(true)); }
  }, [loaded]);

  const handleClick = useCallback(() => {
    setRipple(true);
    setTimeout(() => setRipple(false), 600);
    onClick?.();
  }, [onClick]);

  return (
    <motion.div
      className={`relative cursor-pointer select-none ${className}`}
      style={{ width: size, height: size }}
      onHoverStart={() => interactive && setIsHovered(true)}
      onHoverEnd={() => interactive && setIsHovered(false)}
      onClick={interactive ? handleClick : undefined}
      whileHover={interactive ? { scale: 1.05 } : undefined}
      whileTap={interactive ? { scale: 0.95 } : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: loaded ? 1 : 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Pulse ring when active */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-full border border-foreground/20 animate-pulse-ring"
          style={{ width: size, height: size }}
        />
      )}

      {/* Outer ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-foreground/10"
        animate={{
          borderColor: isActive
            ? "hsl(0 0% 6% / 0.4)"
            : isHovered
            ? "hsl(0 0% 6% / 0.25)"
            : "hsl(0 0% 6% / 0.1)",
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Coin image */}
      <img
        src={socrateCoinImg}
        alt="Socrate"
        className="w-full h-full rounded-full object-cover"
        style={{ filter: "contrast(1.1) grayscale(100%)" }}
      />

      {/* Ripple on click */}
      {ripple && (
        <motion.div
          className="absolute inset-0 rounded-full border border-foreground/30"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}

      {/* Hover label */}
      {interactive && isHovered && !isActive && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-medium uppercase tracking-[0.15em] text-muted-foreground whitespace-nowrap"
        >
          Socrate
        </motion.span>
      )}
    </motion.div>
  );
}
