export interface University {
  id: string; name: string; country: string; domains: string[]; about: string;
}
export interface StudyProgram {
  id: string; name: string; degree: string; universityId: string; about: string | null;
}
export interface Field {
  id: string; name: string;
}
export interface Student {
  id: string; firstName: string; lastName: string; email: string; degree: string;
  studyProgramId: string; universityId: string; skills: string[];
  about: string | null; objectives: string[]; fieldIds: string[];
}
export interface Supervisor {
  id: string; firstName: string; lastName: string; email: string; title: string;
  universityId: string; researchInterests: string[];
  about: string | null; objectives: string[]; fieldIds: string[];
}
export interface Company {
  id: string; name: string; description: string; about: string; size: string; domains: string[];
}
export interface Expert {
  id: string; firstName: string; lastName: string; email: string; title: string;
  companyId: string; offerInterviews: boolean;
  about: string | null; objectives: string[]; fieldIds: string[];
}
export interface Topic {
  id: string; title: string; description: string; type: string;
  employment: string; employmentType: string | null; workplaceType: string | null;
  degrees: string[]; fieldIds: string[];
  companyId: string | null; universityId: string | null;
  supervisorIds: string[]; expertIds: string[];
}
export interface ThesisProject {
  id: string; title: string; description: string | null; motivation: string | null;
  state: string; studentId: string; topicId: string | null;
  companyId: string | null; universityId: string;
  supervisorIds: string[]; expertIds: string[];
  createdAt: string; updatedAt: string;
}

export interface RoadmapPhase {
  id: string; title: string; description: string;
  startDate: string; endDate: string; progress: number;
  tasks: RoadmapTask[];
}
export interface RoadmapTask {
  id: string; title: string; completed: boolean; dueDate: string;
}

export interface ChatMessage {
  id: string; role: 'user' | 'assistant'; content: string; timestamp: Date;
}
