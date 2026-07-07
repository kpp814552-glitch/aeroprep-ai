export type InterviewRole =
  | 'pilot'
  | 'atc'
  | 'dispatcher'
  | 'cabin-crew'
  | 'maintenance'
  | 'aviation-meteorology'
  | 'civil-aviation-electronics';

export type InterviewStage =
  | 'self-intro'
  | 'education'
  | 'project'
  | 'internship'
  | 'role-fit'
  | 'professional'
  | 'scenario'
  | 'career'
  | 'summary';

export type InterviewPhase =
  | 'preparing'
  | 'ready'
  | 'playing'
  | 'listening'
  | 'processing'
  | 'completed'
  | 'error';

export type InterviewTurn = {
  question: string;
  answer: string;
  stage?: InterviewStage;
  answerDurationSeconds?: number;
  transcriptChars?: number;
  silenceWarnings?: number;
  voiceActivityMoments?: number;
  createdAt?: string;
};

export type InterviewReportScores = {
  expressionAbility: number;
  logicalThinking: number;
  professionalKnowledge: number;
  roleFit: number;
};

export type InterviewReport = {
  scores: InterviewReportScores;
  totalScore: number;
  overallEvaluation: string;
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
  recommendedTraining: string[];
  hiringProbability: number;
  narrativeSummary: string;
  highlights: string[];
};

export type InterviewRoleConfig = {
  value: InterviewRole;
  label: string;
  interviewer: string;
  firstQuestion: string;
  coreTopics: string[];
};

export type InterviewSessionRecord = {
  sessionId: string;
  company: string;
  role: InterviewRole;
  roleLabel: string;
  mode: string;
  persona: string;
  interviewer: string;
  voiceProviderName?: string | null;
  elapsedSeconds: number;
  turns: InterviewTurn[];
  createdAt: string;
  report?: InterviewReport;
};
