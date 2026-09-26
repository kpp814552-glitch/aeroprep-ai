export type LearningTrackId =
  | "essentials"
  | "expression"
  | "roles"
  | "aviation"
  | "practice";

export type LearningRole =
  | "pilot"
  | "cabin"
  | "cabin-safety"
  | "maintenance"
  | "dispatcher"
  | "atc"
  | "avionics"
  | "airport-ops"
  | "terminal-service";

export type LearningLevel = "入门" | "进阶" | "强化";

export type LearningBlock = {
  heading: string;
  body: string[];
  bullets?: string[];
  example?: {
    label: string;
    text: string;
  };
};

export type LearningPractice = {
  question: string;
  thinking: string[];
  sample: string;
};

export type LearningItem = {
  id: string;
  trackId: LearningTrackId;
  moduleId: string;
  title: string;
  subtitle: string;
  summary: string;
  level: LearningLevel;
  durationMinutes: number;
  frequency: number;
  role?: LearningRole;
  tags: string[];
  objectives: string[];
  blocks: LearningBlock[];
  practice?: LearningPractice;
  pitfalls: string[];
};

export type LearningModule = {
  id: string;
  trackId: LearningTrackId;
  title: string;
  description: string;
  items: LearningItem[];
};

export type LearningTrack = {
  id: LearningTrackId;
  label: string;
  shortLabel: string;
  description: string;
  modules: LearningModule[];
};

export type FavoriteRecord = {
  itemId: string;
  title: string;
  trackLabel: string;
  savedAt: string;
};

export type HistoryRecord = {
  itemId: string;
  title: string;
  trackLabel: string;
  viewedAt: string;
};

export type ProgressStatus = "in-progress" | "completed";

export type ProgressRecord = {
  itemId: string;
  status: ProgressStatus;
  updatedAt: string;
};
