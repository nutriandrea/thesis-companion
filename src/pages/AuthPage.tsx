import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, GraduationCap, MapPin, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [university, setUniversity] = useState("");
  const [degree, setDegree] = useState("");
  const [expectedGraduation, setExpectedGraduation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("profiles").update({
            first_name: firstName,
            last_name: lastName,
            university,
            degree,
            expected_graduation: expectedGraduation,
          }).eq("user_id", user.id);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/[0.02] blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-sm px-6"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white text-2xl font-bold tracking-[0.15em] uppercase"
          >
            CHI SEI?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-white/40 text-sm mt-3"
          >
            {isSignUp ? "Crea il tuo account per iniziare" : "Bentornato. Continua il duello."}
          </motion.p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignUp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Nome"
                    required
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-none px-4 pl-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>
                <div>
                  <input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Cognome"
                    required
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-none px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>
              </div>

              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  value={university}
                  onChange={e => setUniversity(e.target.value)}
                  placeholder="Università"
                  required
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-none px-4 pl-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    value={degree}
                    onChange={e => setDegree(e.target.value)}
                    placeholder="Corso di laurea"
                    required
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-none px-4 pl-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    value={expectedGraduation}
                    onChange={e => setExpectedGraduation(e.target.value)}
                    placeholder="Laurea prevista (es. Giu 2026)"
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-none px-4 pl-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>
              </div>
            </motion.div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-none px-4 pl-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-none px-4 pl-10 pr-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 text-sm font-semibold uppercase tracking-wider hover:bg-white/90 transition-colors disabled:opacity-30 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? "..." : isSignUp ? "Registrati" : "Accedi"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-sm text-white/30 mt-6">
          {isSignUp ? "Hai già un account?" : "Non hai un account?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-white/60 hover:text-white transition-colors underline underline-offset-4"
          >
            {isSignUp ? "Accedi" : "Registrati"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
