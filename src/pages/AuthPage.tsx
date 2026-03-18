import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, Mail, Lock, User, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Update profile with name
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("profiles").update({
            first_name: firstName,
            last_name: lastName,
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
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="max-w-md text-primary-foreground">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-8">
            <GraduationCap className="w-7 h-7 text-accent-foreground" />
          </div>
          <h1 className="text-4xl font-bold font-display leading-tight mb-4">
            La tua tesi,<br />guidata da Socrate.
          </h1>
          <p className="text-primary-foreground/70 text-lg leading-relaxed">
            Un dialogo socratico che sfida il tuo ragionamento, trova le fragilità 
            e ti guida verso una tesi più solida. Non un motore di ricerca: 
            un sistema di decisione e azione.
          </p>
        </motion.div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-accent-foreground" />
            </div>
            <h1 className="text-xl font-bold font-display">Thesis AI</h1>
          </div>

          <h2 className="text-2xl font-bold font-display mb-1">
            {isSignUp ? "Crea il tuo account" : "Bentornato"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {isSignUp ? "Inizia il tuo percorso di tesi con Socrate" : "Continua il tuo duello socratico"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Nome"
                    required className="w-full bg-card border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Cognome"
                    required className="w-full bg-card border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
                required className="w-full bg-card border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 6 caratteri)"
                required minLength={6} className="w-full bg-card border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <Button type="submit" variant="accent" className="w-full gap-2" disabled={loading}>
              {loading ? "Caricamento..." : isSignUp ? "Registrati" : "Accedi"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isSignUp ? "Hai già un account?" : "Non hai un account?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-accent font-medium hover:underline">
              {isSignUp ? "Accedi" : "Registrati"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
