export interface MockVulnerability {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  section: string;
  source: string;
  resolved: boolean;
}

/**
 * Realistic thesis vulnerabilities categorized by thesis section/phase.
 * These represent common weaknesses Socrate would detect during the thesis journey.
 */
export const mockVulnerabilities: MockVulnerability[] = [
  // ── RESEARCH QUESTION ──
  {
    id: "vuln-rq-01",
    type: "research_question",
    title: "Research question troppo ampia",
    description: "La tua research question 'Come l'AI impatta il business?' è troppo generica. Manca delimitazione geografica, temporale e settoriale. Rischi di non riuscire a coprirla in modo rigoroso entro la deadline.",
    severity: "critical",
    section: "Research Question",
    source: "socrate_analysis",
    resolved: false,
  },
  {
    id: "vuln-rq-02",
    type: "research_question",
    title: "Mancanza di sub-questions strutturate",
    description: "La research question principale non è suddivisa in sotto-domande operative. Senza sub-questions, sarà difficile organizzare i capitoli e mantenere un filo logico coerente.",
    severity: "high",
    section: "Research Question",
    source: "socrate_analysis",
    resolved: false,
  },
  {
    id: "vuln-rq-03",
    type: "research_question",
    title: "Research question non falsificabile",
    description: "La domanda 'L'AI è utile nelle aziende?' non è falsificabile in senso scientifico. Una buona research question deve poter essere confermata o smentita con dati empirici.",
    severity: "high",
    section: "Research Question",
    source: "socrate_analysis",
    resolved: false,
  },

  // ── LITERATURE REVIEW ──
  {
    id: "vuln-lit-01",
    type: "literature",
    title: "Fonti obsolete dominanti",
    description: "Il 70% delle tue fonti è precedente al 2020. In un campo in rapida evoluzione come l'AI, devi includere almeno il 50% di fonti degli ultimi 2 anni per garantire rilevanza.",
    severity: "high",
    section: "Literature Review",
    source: "doc_analysis",
    resolved: false,
  },
  {
    id: "vuln-lit-02",
    type: "literature",
    title: "Assenza di framework teorico",
    description: "La literature review elenca studi senza organizzarli attorno a un framework teorico. Senza una cornice concettuale (es. TAM, RBV, Technology-Organization-Environment), la revisione risulta descrittiva e non analitica.",
    severity: "critical",
    section: "Literature Review",
    source: "socrate_analysis",
    resolved: false,
  },
  {
    id: "vuln-lit-03",
    type: "literature",
    title: "Nessuna fonte peer-reviewed",
    description: "Attualmente stai citando solo blog post, articoli di giornale e report aziendali. Una tesi accademica richiede almeno il 60% di fonti peer-reviewed (journal articles, conference proceedings).",
    severity: "critical",
    section: "Literature Review",
    source: "doc_analysis",
    resolved: false,
  },
  {
    id: "vuln-lit-04",
    type: "literature",
    title: "Gap di ricerca non identificato",
    description: "La literature review presenta lo stato dell'arte ma non identifica chiaramente un gap — la lacuna nella letteratura esistente che la tua tesi intende colmare. Questo è il cuore della giustificazione accademica.",
    severity: "high",
    section: "Literature Review",
    source: "socrate_analysis",
    resolved: false,
  },

  // ── METHODOLOGY ──
  {
    id: "vuln-meth-01",
    type: "methodology",
    title: "Metodologia non giustificata",
    description: "Hai scelto un approccio qualitativo con interviste semi-strutturate, ma non spieghi perché questa metodologia è la più adatta rispetto ad alternative (survey quantitativo, mixed-methods, case study).",
    severity: "high",
    section: "Methodology",
    source: "socrate_analysis",
    resolved: false,
  },
  {
    id: "vuln-meth-02",
    type: "methodology",
    title: "Campione troppo piccolo per generalizzare",
    description: "Pianifichi 4 interviste per un'analisi qualitativa. Per raggiungere saturazione teorica in un case study, la letteratura metodologica raccomanda almeno 8-12 interviste. Con 4, i risultati non saranno sufficientemente robusti.",
    severity: "medium",
    section: "Methodology",
    source: "socrate_analysis",
    resolved: false,
  },
  {
    id: "vuln-meth-03",
    type: "methodology",
    title: "Assenza di criteri di validità",
    description: "Non hai definito criteri di validità e affidabilità per la tua ricerca (triangolazione, member checking, inter-rater reliability). Questo indebolisce la credibilità accademica dei risultati.",
    severity: "medium",
    section: "Methodology",
    source: "socrate_analysis",
    resolved: false,
  },
  {
    id: "vuln-meth-04",
    type: "methodology",
    title: "Bias di selezione nel campionamento",
    description: "Il tuo campione è composto esclusivamente da contatti personali e colleghi. Questo convenience sampling introduce un forte bias di selezione che limita la rappresentatività dei risultati.",
    severity: "high",
    section: "Methodology",
    source: "socrate_analysis",
    resolved: false,
  },

  // ── DATA & ANALYSIS ──
  {
    id: "vuln-data-01",
    type: "data_analysis",
    title: "Nessun piano di gestione dati",
    description: "Non hai un data management plan. Dove salvi i dati? Come li anonimizzi? Hai il consenso informato dei partecipanti? Queste domande devono essere risolte prima di raccogliere dati.",
    severity: "high",
    section: "Data & Analysis",
    source: "socrate_analysis",
    resolved: false,
  },
  {
    id: "vuln-data-02",
    type: "data_analysis",
    title: "Analisi statistica inappropriata",
    description: "Stai usando una regressione lineare su dati che violano l'assunzione di normalità e presentano multicollinearità. Considera modelli robusti o trasformazioni dei dati.",
    severity: "high",
    section: "Data & Analysis",
    source: "doc_analysis",
    resolved: false,
  },

  // ── STRUCTURE & WRITING ──
  {
    id: "vuln-struct-01",
    type: "structure",
    title: "Introduzione senza roadmap",
    description: "L'introduzione non include una panoramica della struttura della tesi. Il lettore non sa cosa aspettarsi nei capitoli successivi. Aggiungi un paragrafo 'Struttura del lavoro' alla fine dell'introduzione.",
    severity: "low",
    section: "Structure",
    source: "doc_analysis",
    resolved: false,
  },
  {
    id: "vuln-struct-02",
    type: "structure",
    title: "Risultati mescolati con discussione",
    description: "I risultati empirici sono mescolati con l'interpretazione e la discussione. Separa chiaramente 'cosa hai trovato' (Results) da 'cosa significa' (Discussion) per maggiore chiarezza accademica.",
    severity: "medium",
    section: "Structure",
    source: "doc_analysis",
    resolved: false,
  },
  {
    id: "vuln-struct-03",
    type: "structure",
    title: "Conclusione troppo corta e superficiale",
    description: "La conclusione è di solo mezzo paragrafo e non riassume i findings, non risponde alla research question, e non discute limitazioni e future research directions.",
    severity: "high",
    section: "Structure",
    source: "doc_analysis",
    resolved: false,
  },

  // ── CITATION & FORMATTING ──
  {
    id: "vuln-cite-01",
    type: "citation",
    title: "Stile citazione inconsistente",
    description: "Stai alternando tra APA 7th e Harvard style nella stessa sezione. Scegli uno stile e applicalo uniformemente in tutta la tesi. Usa un reference manager (Zotero, Mendeley) per automatizzare.",
    severity: "medium",
    section: "Citations",
    source: "doc_analysis",
    resolved: false,
  },
  {
    id: "vuln-cite-02",
    type: "citation",
    title: "Citazioni nel testo mancanti",
    description: "Ci sono almeno 5 affermazioni fattuali nel capitolo 2 che non hanno citazione. Ogni claim non ovvia deve essere supportata da una fonte, altrimenti è plagio implicito.",
    severity: "critical",
    section: "Citations",
    source: "doc_analysis",
    resolved: false,
  },

  // ── PLANNING & TIMELINE ──
  {
    id: "vuln-plan-01",
    type: "planning",
    title: "Timeline irrealistica",
    description: "Pianifichi di completare literature review, raccolta dati e scrittura in 4 settimane. Questo è irrealistico — la sola raccolta dati con interviste richiede tipicamente 3-4 settimane considerando scheduling e trascrizione.",
    severity: "high",
    section: "Planning",
    source: "socrate_analysis",
    resolved: false,
  },
  {
    id: "vuln-plan-02",
    type: "planning",
    title: "Nessun buffer per revisioni",
    description: "La tua timeline non include tempo per le revisioni del supervisore. Ogni ciclo di feedback richiede tipicamente 1-2 settimane. Pianifica almeno 2 cicli di revisione prima della consegna.",
    severity: "medium",
    section: "Planning",
    source: "socrate_analysis",
    resolved: false,
  },

  // ── SUPERVISOR & CONTACTS ──
  {
    id: "vuln-contact-01",
    type: "contacts",
    title: "Nessun supervisore confermato",
    description: "Non hai ancora un supervisore confermato a 3 mesi dalla consegna prevista. Senza supervisore, non puoi ricevere feedback strutturato e rischi di non soddisfare i requisiti formali dell'università.",
    severity: "critical",
    section: "Contacts",
    source: "socrate_analysis",
    resolved: false,
  },
  {
    id: "vuln-contact-02",
    type: "contacts",
    title: "Company partner non formalizzato",
    description: "Stai usando dati aziendali senza un accordo formale con l'azienda. Questo potrebbe causare problemi di NDA, proprietà intellettuale e pubblicabilità della tesi.",
    severity: "high",
    section: "Contacts",
    source: "socrate_analysis",
    resolved: false,
  },

  // ── ETHICAL & LEGAL ──
  {
    id: "vuln-ethics-01",
    type: "ethics",
    title: "Approvazione etica mancante",
    description: "La tua ricerca coinvolge partecipanti umani (interviste) ma non hai ottenuto l'approvazione del comitato etico dell'università. Questo è obbligatorio per qualsiasi ricerca con soggetti umani.",
    severity: "critical",
    section: "Ethics",
    source: "socrate_analysis",
    resolved: false,
  },
  {
    id: "vuln-ethics-02",
    type: "ethics",
    title: "GDPR compliance non verificata",
    description: "Raccogli dati personali tramite survey online ma non hai una privacy policy, non informi i partecipanti sui loro diritti, e non hai definito la base legale per il trattamento (consenso, interesse legittimo).",
    severity: "high",
    section: "Ethics",
    source: "socrate_analysis",
    resolved: false,
  },
];
