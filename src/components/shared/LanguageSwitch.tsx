import { useLanguage } from "@/contexts/LanguageContext";

export default function LanguageSwitch({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={() => setLanguage("it")}
        className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded transition-colors ${
          language === "it"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        IT
      </button>
      <button
        onClick={() => setLanguage("en")}
        className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded transition-colors ${
          language === "en"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
    </div>
  );
}
