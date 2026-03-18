import { RoadmapPhase } from "@/types/data";

export const mockRoadmap: RoadmapPhase[] = [
  {
    id: "phase-1",
    title: "Esplorazione e Definizione",
    description: "Ricerca bibliografica, definizione del tema e formulazione della research question.",
    startDate: "2026-03-01",
    endDate: "2026-04-15",
    progress: 75,
    tasks: [
      { id: "t1", title: "Literature review iniziale (30+ fonti)", completed: true, dueDate: "2026-03-15" },
      { id: "t2", title: "Definire research question principale", completed: true, dueDate: "2026-03-20" },
      { id: "t3", title: "Incontro con supervisore per approvazione tema", completed: true, dueDate: "2026-03-25" },
      { id: "t4", title: "Stesura outline struttura tesi", completed: false, dueDate: "2026-04-05" },
      { id: "t5", title: "Finalizzare bibliografia preliminare", completed: false, dueDate: "2026-04-15" },
    ],
  },
  {
    id: "phase-2",
    title: "Metodologia e Design",
    description: "Progettazione della metodologia di ricerca e definizione del framework teorico.",
    startDate: "2026-04-16",
    endDate: "2026-05-31",
    progress: 20,
    tasks: [
      { id: "t6", title: "Definire framework metodologico", completed: true, dueDate: "2026-04-25" },
      { id: "t7", title: "Preparare dataset o materiale sperimentale", completed: false, dueDate: "2026-05-10" },
      { id: "t8", title: "Scrivere capitolo metodologia", completed: false, dueDate: "2026-05-20" },
      { id: "t9", title: "Review metodologia con supervisore", completed: false, dueDate: "2026-05-31" },
    ],
  },
  {
    id: "phase-3",
    title: "Raccolta Dati e Analisi",
    description: "Raccolta dati, esperimenti e analisi dei risultati.",
    startDate: "2026-06-01",
    endDate: "2026-07-31",
    progress: 0,
    tasks: [
      { id: "t10", title: "Raccolta dati / esecuzione esperimenti", completed: false, dueDate: "2026-06-30" },
      { id: "t11", title: "Analisi statistica / qualitativa", completed: false, dueDate: "2026-07-15" },
      { id: "t12", title: "Scrivere capitolo risultati", completed: false, dueDate: "2026-07-31" },
    ],
  },
  {
    id: "phase-4",
    title: "Stesura e Revisione Finale",
    description: "Scrittura finale, revisione e preparazione della presentazione.",
    startDate: "2026-08-01",
    endDate: "2026-09-15",
    progress: 0,
    tasks: [
      { id: "t13", title: "Prima bozza completa", completed: false, dueDate: "2026-08-15" },
      { id: "t14", title: "Revisione supervisore", completed: false, dueDate: "2026-08-25" },
      { id: "t15", title: "Revisione finale e formattazione", completed: false, dueDate: "2026-09-05" },
      { id: "t16", title: "Preparare presentazione difesa", completed: false, dueDate: "2026-09-10" },
      { id: "t17", title: "Consegna tesi", completed: false, dueDate: "2026-09-15" },
    ],
  },
];
