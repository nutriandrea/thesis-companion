import React, { createContext, useContext, useState, useCallback } from "react";

export type Language = "it" | "en";

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageState | null>(null);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

// Shorthand hook
export const useT = () => useLanguage().t;

const translations: Record<Language, Record<string, string>> = {
  it: {
    // Auth
    "auth.title": "CHI SEI?",
    "auth.subtitle_signup": "Crea il tuo account per iniziare",
    "auth.subtitle_login": "Bentornato. Continua il duello.",
    "auth.first_name": "Nome",
    "auth.last_name": "Cognome",
    "auth.university": "Università",
    "auth.degree": "Corso di laurea",
    "auth.expected_graduation": "Laurea prevista (es. Giu 2026)",
    "auth.signup": "Registrati",
    "auth.login": "Accedi",
    "auth.has_account": "Hai già un account?",
    "auth.no_account": "Non hai un account?",

    // Intro
    "intro.sub1": "Non ti dirò cosa fare.",
    "intro.sub2": "Voglio tirare fuori la tua tesi.",
    "intro.sub3": "Sei pronto per il duello?",
    "intro.text": `Ciao {name}, sono Socrate. Ti guiderò in questo percorso cognitivo.

Non importa da dove inizi: che tu stia esplorando o abbia già un'idea, possiamo partire da lì.

Preferirei condurre questo scambio con la voce piuttosto che per iscritto; credo che parlare possa aiutarti a rispondere in modo più autentico. Saresti aperto a questo?`,

    // Loading
    "loading": "Caricamento...",

    // Phases
    "phase.orientation": "Orientamento",
    "phase.topic_supervisor": "Topic & Supervisore",
    "phase.planning": "Pianificazione",
    "phase.execution": "Esecuzione",
    "phase.writing": "Scrittura",

    // Dashboard cards
    "card.tasks": "Task",
    "card.rubrica": "Rubrica",
    "card.interview_partners": "Interview Partners",
    "card.supervisors": "Supervisori suggeriti",
    "card.career_tree": "Direzioni possibili",
    "card.references": "Riferimenti principali",
    "card.vulnerabilities": "Vulnerabilità",
    "card.roadmap": "Roadmap",
    "card.roadmap_building": "Roadmap (in costruzione)",
    "card.thesis_doc": "Documento tesi",

    // Task panel
    "task.completed": "Task completato",
    "task.well_done": "Ben fatto.",
    "task.not_yet": "Non ancora",
    "task.socrate_not_convinced": "Socrate non è convinto. Riprova.",
    "task.forced_completed": "Task forzato come completato",
    "task.mark_done": "Segna come fatto",
    "task.verifying": "Socrate sta verificando…",
    "task.force_completion": "Forza completamento",
    "task.none": "Nessun task. Parla con Socrate.",
    "task.n_completed": "{n} completati",

    // Priority
    "priority.critical": "Critico",
    "priority.high": "Alta",
    "priority.medium": "Media",
    "priority.low": "Bassa",

    // Career
    "career.analyzing": "Analizzando carriera...",
    "career.talk_to_socrate": "Parla con Socrate per calcolare il tuo orientamento.",
    "career.your_thesis": "La tua tesi",
    "career.searching_companies": "Cercando aziende...",
    "career.no_companies": "Nessuna azienda trovata per questo settore.",
    "career.searching_in": "Cercando aziende in {sector}...",
    "career.no_companies_in": "Nessuna azienda trovata per {sector}.",
    "career.analyzing_directions": "Analizzando direzioni...",
    "career.talk_for_directions": "Parla con Socrate per scoprire le direzioni possibili della tua tesi.",
    "career.orientation_updated": "Orientamento aggiornato",

    // Supervisors
    "supervisor.why": "Perché questo supervisore?",
    "supervisor.motivation_placeholder": "Spiega la tua motivazione...",
    "supervisor.confirm": "Conferma scelta",
    "supervisor.selected": "Supervisore selezionato",
    "supervisor.label": "Supervisore",
    "supervisor.direction": "Direzione",
    "supervisor.confirm_to_proceed": "Conferma supervisore e orientamento per procedere.",

    // Experts
    "expert.suggestions_later": "I suggerimenti appariranno dopo le prime conversazioni con Socrate.",
    "expert.interview": "Intervista",

    // Vulnerabilities
    "vuln.none": "Nessuna vulnerabilità rilevata.",
    "vuln.tell_resolved": "Spiega a Socrate che è risolta →",
    "vuln.scan": "Scansiona",
    "vuln.scan_completed": "Scansione completata",
    "vuln.n_detected": "{n} vulnerabilità rilevate.",

    // References
    "ref.foundational": "Base",
    "ref.methodology": "Metodo",
    "ref.recent": "Recente",
    "ref.contrarian": "Critico",
    "ref.open": "Apri riferimento",
    "ref.searching": "Cercando riferimenti...",
    "ref.suggested": "Suggeriti ({n})",
    "ref.saved": "⭐ Salvati ({n})",
    "ref.no_saved": "Nessun riferimento salvato. Clicca ☆ per salvare.",
    "ref.talk_for_suggestions": "Parla con Socrate per ricevere suggerimenti di lettura.",
    "ref.generate": "Genera riferimenti →",
    "ref.update": "Aggiorna",
    "ref.updated": "Riferimenti aggiornati",
    "ref.n_suggested": "{n} riferimenti suggeriti.",
    "ref.removed": "Rimosso dai salvati",
    "ref.saved_fav": "Salvato nei preferiti ⭐",
    "ref.remove_tooltip": "Rimuovi dai salvati",
    "ref.save_tooltip": "Salva",

    // Doc widget
    "doc.connected": "Collegato",
    "doc.last_sync": "Ultimo sync: {time}",
    "doc.disconnect": "Scollega documento",
    "doc.none": "Nessun documento collegato",
    "doc.connect_desc": "Collega il tuo documento per consentire a Socrate di analizzare la tua tesi.",
    "doc.paste_link": "Incolla link Google Docs / Overleaf",
    "doc.connect": "Collega",
    "doc.connect_title": "Collega documento tesi",
    "doc.connected_toast": "Documento collegato",
    "doc.disconnected_toast": "Documento scollegato",
    "doc.invalid_link": "Link non valido",
    "doc.invalid_desc": "Inserisci un link Google Docs o Overleaf valido.",
    "doc.sync_chars": "{n}k caratteri sincronizzati.",
    "doc.error_read": "Impossibile leggere il documento. Assicurati che sia condiviso con 'Chiunque abbia il link'.",
    "doc.error_connection": "Connessione fallita.",
    "doc.resync": "Risincronizza",
    "doc.open_thesis": "Apri documento tesi",

    // Chat
    "chat.reply_placeholder": "Rispondi a Socrate...",
    "chat.mentor": "Il tuo mentore critico",
    "chat.switch_to_voice": "Passa alla modalità vocale",
    "chat.switch_to_text": "Passa alla chat testuale",

    // Dashboard
    "dashboard.thesis_undefined": "Tesi non definita",
    "dashboard.talk_to_socrate": "Parla con Socrate",
    "dashboard.evaluate_phase": "Valuta avanzamento fase",
    "dashboard.phase_advanced": "Fase avanzata",
    "dashboard.moved_next": "Sei passato alla fase successiva.",
    "dashboard.blockers": "Ci sono blocchi da risolvere.",
    "dashboard.all_completed": "🎉 Tutte le task completate!",
    "dashboard.auto_eval": "Valutazione automatica dell'avanzamento in corso...",

    // Roadmap
    "roadmap.none": "Nessuna roadmap ancora. Socrate può generarne una basata sulla tua tesi.",
    "roadmap.generate": "Genera Roadmap",
    "roadmap.generating": "Generando...",
    "roadmap.generated": "Roadmap generata",
    "roadmap.generated_desc": "La roadmap è stata creata in base alla tua tesi.",
    "roadmap.error": "Impossibile generare la roadmap.",
    "roadmap.regenerate": "Rigenera",

    // Socrate page
    "socrate.central_hub": "Hub centrale",
    "socrate.analysis_done": "Analisi completata",
    "socrate.analysis_desc": "{memories} memorie + {suggestions} suggerimenti estratti e distribuiti nelle sezioni.",
    "socrate.analyzing": "Analisi in corso...",
    "socrate.report": "Report",
    "socrate.analyze": "Analizza",
    "socrate.fusion": "Fusione",
    "socrate.dashboard": "Dashboard",
    "socrate.chose_thesis": "Ho scelto la mia tesi",
    "socrate.fusion_done": "Fusione completata",
    "socrate.fusion_desc": "Profilo aggiornato · {affinities} affinità calcolate · {suggestions} nuovi suggerimenti",
    "socrate.fusion_error": "Errore nella fusione dati.",
    "socrate.report_generated": "Report generato",
    "socrate.report_distributed": "I contenuti sono stati distribuiti nelle sezioni del sito.",
    "socrate.report_error": "Impossibile generare il report.",
    "socrate.report_error_gen": "Errore nella generazione del report.",
    "socrate.session_report": "Report di Sessione",
    "socrate.contact_error": "Impossibile contattare Socrate.",
    "socrate.credits_exhausted": "Crediti AI esauriti",
    "socrate.credits_desc": "I crediti AI del workspace sono terminati. Vai su Settings → Workspace → Usage per ricaricarli.",
    "socrate.too_fast": "Troppo veloci",
    "socrate.too_fast_desc": "Troppe richieste. Attendi qualche secondo e riprova.",
    "socrate.resolve_vuln": "Ho risolto la vulnerabilità \"{title}\". Ecco perché non è più un problema: ",

    // Severity
    "severity.ruthless": "Spietato",
    "severity.critical": "Critico",
    "severity.collaborative": "Collaborativo",
    "severity.supportive": "Supportivo",
    "severity.max": "max",
    "severity.high": "alto",
    "severity.medium": "medio",
    "severity.low": "basso",

    // Voice
    "voice.muted": "Muted",
    "voice.ready": "Pronto",
    "voice.listening": "IN ASCOLTO...",
    "voice.processing": "Sta pensando...",
    "voice.speaking": "Parla",
    "voice.start_error": "Impossibile avviare la trascrizione",
    "voice.mic_unavailable": "Microfono non disponibile",
    "voice.transcript": "Trascrizione",
    "voice.mute_socrate": "Muta Socrate",
    "voice.unmute_socrate": "Riattiva Socrate",

    // Profile
    "profile.title": "Profilo",
    "profile.subtitle": "Dati personali e profilo intellettuale",
    "profile.select_uni": "Seleziona università",
    "profile.course": "Corso di studi",
    "profile.thesis_topic": "Argomento tesi",
    "profile.skills_placeholder": "Competenze (separate da virgola)",
    "profile.save": "Salva",
    "profile.cancel": "Annulla",
    "profile.edit": "Modifica",
    "profile.signout": "Esci",
    "profile.topic_label": "Tema:",
    "profile.skills": "Competenze",
    "profile.fields": "Campi di interesse",
    "profile.intellectual": "Profilo Intellettuale",
    "profile.reasoning_style": "Stile di ragionamento",
    "profile.research_maturity": "Maturità ricerca",
    "profile.thesis_quality": "Qualità tesi",
    "profile.socrate_severity": "Severità Socrate",
    "profile.sessions": "Sessioni con Socrate",
    "profile.exchanges": "scambi",
    "profile.analyses": "analisi",
    "profile.strengths": "Punti di forza",
    "profile.weaknesses": "Da migliorare",
    "profile.deep_interests": "Interessi profondi",
    "profile.career_inclinations": "Inclinazioni professionali",
    "profile.methodology": "Metodologia",
    "profile.writing_quality": "Qualità scrittura",
    "profile.critical_thinking": "Pensiero critico",
    "profile.completed": "Completati",
    "profile.pending": "In attesa",
    "profile.progress": "Progresso",
    "profile.next_tasks": "Prossimi Compiti",
    "profile.all_done": "Tutto completato.",
    "profile.updated": "Profilo aggiornato",
    "profile.beginner": "Principiante",
    "profile.developing": "In sviluppo",
    "profile.intermediate": "Intermedio",
    "profile.advanced": "Avanzato",

    // Demo
    "demo.banner": "🎯 Demo Mode — Dati simulati — Clicca sulle fasi per navigare",
    "demo.subtitle": "Demo — conversazione simulata",

    // General
    "error": "Errore",
    "topic": "Topic",
  },

  en: {
    // Auth
    "auth.title": "WHO ARE YOU?",
    "auth.subtitle_signup": "Create your account to get started",
    "auth.subtitle_login": "Welcome back. Continue the duel.",
    "auth.first_name": "First name",
    "auth.last_name": "Last name",
    "auth.university": "University",
    "auth.degree": "Degree",
    "auth.expected_graduation": "Expected graduation (e.g. Jun 2026)",
    "auth.signup": "Sign up",
    "auth.login": "Sign in",
    "auth.has_account": "Already have an account?",
    "auth.no_account": "Don't have an account?",

    // Intro
    "intro.sub1": "I won't tell you what to do.",
    "intro.sub2": "I want to draw out your thesis.",
    "intro.sub3": "Are you ready for the duel?",
    "intro.text": `Hello {name}, I am Socrates. I will guide you through this cognitive journey.

It does not matter where you begin: whether you are just exploring or already have an idea, we can start from there.

I would prefer to carry out this exchange through voice rather than writing; I believe that speaking can help you answer more authentically. Would you be open to that?`,

    // Loading
    "loading": "Loading...",

    // Phases
    "phase.orientation": "Orientation",
    "phase.topic_supervisor": "Topic & Supervisor",
    "phase.planning": "Planning",
    "phase.execution": "Execution",
    "phase.writing": "Writing",

    // Dashboard cards
    "card.tasks": "Tasks",
    "card.rubrica": "Contacts",
    "card.interview_partners": "Interview Partners",
    "card.supervisors": "Suggested supervisors",
    "card.career_tree": "Possible directions",
    "card.references": "Main references",
    "card.vulnerabilities": "Vulnerabilities",
    "card.roadmap": "Roadmap",
    "card.roadmap_building": "Roadmap (under construction)",
    "card.thesis_doc": "Thesis document",

    // Task panel
    "task.completed": "Task completed",
    "task.well_done": "Well done.",
    "task.not_yet": "Not yet",
    "task.socrate_not_convinced": "Socrate is not convinced. Try again.",
    "task.forced_completed": "Task forced as completed",
    "task.mark_done": "Mark as done",
    "task.verifying": "Socrate is verifying…",
    "task.force_completion": "Force completion",
    "task.none": "No tasks. Talk to Socrate.",
    "task.n_completed": "{n} completed",

    // Priority
    "priority.critical": "Critical",
    "priority.high": "High",
    "priority.medium": "Medium",
    "priority.low": "Low",

    // Career
    "career.analyzing": "Analyzing career...",
    "career.talk_to_socrate": "Talk to Socrate to calculate your orientation.",
    "career.your_thesis": "Your thesis",
    "career.searching_companies": "Searching companies...",
    "career.no_companies": "No companies found for this sector.",
    "career.searching_in": "Searching companies in {sector}...",
    "career.no_companies_in": "No companies found for {sector}.",
    "career.analyzing_directions": "Analyzing directions...",
    "career.talk_for_directions": "Talk to Socrate to discover the possible directions for your thesis.",
    "career.orientation_updated": "Orientation updated",

    // Supervisors
    "supervisor.why": "Why this supervisor?",
    "supervisor.motivation_placeholder": "Explain your motivation...",
    "supervisor.confirm": "Confirm choice",
    "supervisor.selected": "Supervisor selected",
    "supervisor.label": "Supervisor",
    "supervisor.direction": "Direction",
    "supervisor.confirm_to_proceed": "Confirm supervisor and orientation to proceed.",

    // Experts
    "expert.suggestions_later": "Suggestions will appear after your first conversations with Socrate.",
    "expert.interview": "Interview",

    // Vulnerabilities
    "vuln.none": "No vulnerabilities detected.",
    "vuln.tell_resolved": "Tell Socrate it's resolved →",
    "vuln.scan": "Scan",
    "vuln.scan_completed": "Scan completed",
    "vuln.n_detected": "{n} vulnerabilities detected.",

    // References
    "ref.foundational": "Foundational",
    "ref.methodology": "Method",
    "ref.recent": "Recent",
    "ref.contrarian": "Critical",
    "ref.open": "Open reference",
    "ref.searching": "Searching references...",
    "ref.suggested": "Suggested ({n})",
    "ref.saved": "⭐ Saved ({n})",
    "ref.no_saved": "No saved references. Click ☆ to save.",
    "ref.talk_for_suggestions": "Talk to Socrate to get reading suggestions.",
    "ref.generate": "Generate references →",
    "ref.update": "Update",
    "ref.updated": "References updated",
    "ref.n_suggested": "{n} references suggested.",
    "ref.removed": "Removed from saved",
    "ref.saved_fav": "Saved to favorites ⭐",
    "ref.remove_tooltip": "Remove from saved",
    "ref.save_tooltip": "Save",

    // Doc widget
    "doc.connected": "Connected",
    "doc.last_sync": "Last sync: {time}",
    "doc.disconnect": "Disconnect document",
    "doc.none": "No document connected",
    "doc.connect_desc": "Connect your document to allow Socrate to analyze your thesis.",
    "doc.paste_link": "Paste Google Docs / Overleaf link",
    "doc.connect": "Connect",
    "doc.connect_title": "Connect thesis document",
    "doc.connected_toast": "Document connected",
    "doc.disconnected_toast": "Document disconnected",
    "doc.invalid_link": "Invalid link",
    "doc.invalid_desc": "Enter a valid Google Docs or Overleaf link.",
    "doc.sync_chars": "{n}k characters synced.",
    "doc.error_read": "Unable to read the document. Make sure it's shared with 'Anyone with the link'.",
    "doc.error_connection": "Connection failed.",
    "doc.resync": "Resync",
    "doc.open_thesis": "Open thesis document",

    // Chat
    "chat.reply_placeholder": "Reply to Socrate...",
    "chat.mentor": "Your critical mentor",
    "chat.switch_to_voice": "Switch to voice mode",
    "chat.switch_to_text": "Switch to text chat",

    // Dashboard
    "dashboard.thesis_undefined": "Thesis not defined",
    "dashboard.talk_to_socrate": "Talk to Socrate",
    "dashboard.evaluate_phase": "Evaluate phase advancement",
    "dashboard.phase_advanced": "Phase advanced",
    "dashboard.moved_next": "You've moved to the next phase.",
    "dashboard.blockers": "There are blockers to resolve.",
    "dashboard.all_completed": "🎉 All tasks completed!",
    "dashboard.auto_eval": "Automatic phase advancement evaluation in progress...",

    // Roadmap
    "roadmap.none": "No roadmap yet. Socrate can generate one based on your thesis.",
    "roadmap.generate": "Generate Roadmap",
    "roadmap.generating": "Generating...",
    "roadmap.generated": "Roadmap generated",
    "roadmap.generated_desc": "The roadmap has been created based on your thesis.",
    "roadmap.error": "Unable to generate the roadmap.",
    "roadmap.regenerate": "Regenerate",

    // Socrate page
    "socrate.central_hub": "Central hub",
    "socrate.analysis_done": "Analysis completed",
    "socrate.analysis_desc": "{memories} memories + {suggestions} suggestions extracted and distributed across sections.",
    "socrate.analyzing": "Analysis in progress...",
    "socrate.report": "Report",
    "socrate.analyze": "Analyze",
    "socrate.fusion": "Fusion",
    "socrate.dashboard": "Dashboard",
    "socrate.chose_thesis": "I've chosen my thesis",
    "socrate.fusion_done": "Fusion completed",
    "socrate.fusion_desc": "Profile updated · {affinities} affinities calculated · {suggestions} new suggestions",
    "socrate.fusion_error": "Error in data fusion.",
    "socrate.report_generated": "Report generated",
    "socrate.report_distributed": "Contents have been distributed across site sections.",
    "socrate.report_error": "Unable to generate the report.",
    "socrate.report_error_gen": "Error generating the report.",
    "socrate.session_report": "Session Report",
    "socrate.contact_error": "Unable to contact Socrate.",
    "socrate.credits_exhausted": "AI credits exhausted",
    "socrate.credits_desc": "Workspace AI credits have run out. Go to Settings → Workspace → Usage to recharge.",
    "socrate.too_fast": "Too fast",
    "socrate.too_fast_desc": "Too many requests. Wait a few seconds and try again.",
    "socrate.resolve_vuln": "I resolved the vulnerability \"{title}\". Here's why it's no longer an issue: ",

    // Severity
    "severity.ruthless": "Ruthless",
    "severity.critical": "Critical",
    "severity.collaborative": "Collaborative",
    "severity.supportive": "Supportive",
    "severity.max": "max",
    "severity.high": "high",
    "severity.medium": "medium",
    "severity.low": "low",

    // Voice
    "voice.muted": "Muted",
    "voice.ready": "Ready",
    "voice.listening": "LISTENING...",
    "voice.processing": "Thinking...",
    "voice.speaking": "Speaking",
    "voice.start_error": "Unable to start transcription",
    "voice.mic_unavailable": "Microphone not available",
    "voice.transcript": "Transcript",
    "voice.mute_socrate": "Mute Socrate",
    "voice.unmute_socrate": "Unmute Socrate",

    // Profile
    "profile.title": "Profile",
    "profile.subtitle": "Personal data and intellectual profile",
    "profile.select_uni": "Select university",
    "profile.course": "Course of study",
    "profile.thesis_topic": "Thesis topic",
    "profile.skills_placeholder": "Skills (comma-separated)",
    "profile.save": "Save",
    "profile.cancel": "Cancel",
    "profile.edit": "Edit",
    "profile.signout": "Sign out",
    "profile.topic_label": "Topic:",
    "profile.skills": "Skills",
    "profile.fields": "Fields of interest",
    "profile.intellectual": "Intellectual Profile",
    "profile.reasoning_style": "Reasoning style",
    "profile.research_maturity": "Research maturity",
    "profile.thesis_quality": "Thesis quality",
    "profile.socrate_severity": "Socrate severity",
    "profile.sessions": "Sessions with Socrate",
    "profile.exchanges": "exchanges",
    "profile.analyses": "analyses",
    "profile.strengths": "Strengths",
    "profile.weaknesses": "To improve",
    "profile.deep_interests": "Deep interests",
    "profile.career_inclinations": "Professional inclinations",
    "profile.methodology": "Methodology",
    "profile.writing_quality": "Writing quality",
    "profile.critical_thinking": "Critical thinking",
    "profile.completed": "Completed",
    "profile.pending": "Pending",
    "profile.progress": "Progress",
    "profile.next_tasks": "Next Tasks",
    "profile.all_done": "All completed.",
    "profile.updated": "Profile updated",
    "profile.beginner": "Beginner",
    "profile.developing": "Developing",
    "profile.intermediate": "Intermediate",
    "profile.advanced": "Advanced",

    // Demo
    "demo.banner": "🎯 Demo Mode — Simulated data — Click on phases to navigate",
    "demo.subtitle": "Demo — simulated conversation",

    // General
    "error": "Error",
    "topic": "Topic",
  },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("app-language");
    return (stored === "en" || stored === "it") ? stored : "en";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let text = translations[language][key] || translations.it[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return text;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
