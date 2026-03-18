export interface CareerPath {
  id: string;
  title: string;
  sector: string;
  matchPercentage: number;
  salary: string;
  demand: "alta" | "media" | "bassa";
  skills: string[];
  description: string;
}

export const mockCareers: CareerPath[] = [
  {
    id: "c1", title: "Data Scientist", sector: "Tech", matchPercentage: 92,
    salary: "CHF 95k–130k", demand: "alta",
    skills: ["Python", "ML", "Statistics", "SQL"],
    description: "Analisi dati avanzata e sviluppo modelli predittivi per aziende tech e consulenza."
  },
  {
    id: "c2", title: "ML Engineer", sector: "Tech", matchPercentage: 88,
    salary: "CHF 105k–145k", demand: "alta",
    skills: ["PyTorch", "MLOps", "Cloud", "Python"],
    description: "Sviluppo e deploy di modelli di machine learning in produzione."
  },
  {
    id: "c3", title: "Research Scientist", sector: "Accademia / R&D", matchPercentage: 85,
    salary: "CHF 80k–120k", demand: "media",
    skills: ["Pubblicazioni", "Deep Learning", "NLP"],
    description: "Ricerca fondamentale o applicata in laboratori universitari o R&D aziendale."
  },
  {
    id: "c4", title: "AI Product Manager", sector: "Product", matchPercentage: 72,
    salary: "CHF 110k–150k", demand: "media",
    skills: ["Product Strategy", "AI/ML", "Stakeholder Mgmt"],
    description: "Gestione prodotto per soluzioni basate su intelligenza artificiale."
  },
  {
    id: "c5", title: "Consultant – Digital Transformation", sector: "Consulenza", matchPercentage: 68,
    salary: "CHF 90k–140k", demand: "alta",
    skills: ["Problem Solving", "Analytics", "Presentation"],
    description: "Consulenza strategica per la trasformazione digitale di grandi organizzazioni."
  },
  {
    id: "c6", title: "Quantitative Analyst", sector: "Finanza", matchPercentage: 65,
    salary: "CHF 120k–180k", demand: "bassa",
    skills: ["Statistics", "Python", "Financial Models"],
    description: "Modellazione quantitativa per trading, risk management e pricing."
  },
];
