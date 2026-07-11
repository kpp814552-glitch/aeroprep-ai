export type InterviewRole =
  | 'pilot'
  | 'atc'
  | 'dispatcher'
  | 'cabin-crew'
  | 'maintenance'
  | 'aviation-meteorology'
  | 'civil-aviation-electronics'
  | 'air-marshal'
  | 'terminal-service';

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
  articulation: number;
  adaptability: number;
  serviceAwareness: number;
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
  /** 一、面试综合评价 — 至少300字，结合真实回答 */
  comprehensiveEvaluation: string;
  /** 三、逐题分析 — 每个问题一条 */
  perQuestionAnalysis: string[];
  /** 四、个人能力画像 */
  personalProfile: string;
  /** 五、岗位匹配分析 */
  careerMatch: string;
  /** 六、未来提升方案（含7天和30天计划） */
  improvementPlan: string;
  /** 七、下一次面试预测 */
  nextPrediction: string;
  /** 八、成长寄语 */
  growthMessage: string;
  /** 民航岗位竞争力评估 */
  competitiveLevel: string;         // "A"|"B"|"C"|"D"
  competitiveScore: number;         // 0-100
  competitiveRange: string;         // "80%-90%"
  competitiveStrengths: string[];   // 优势因素
  competitiveWeaknesses: string[];  // 限制因素
  interviewerPerspective: string;   // 面试官视角分析
  externalFactors: string;          // 影响因素说明
  trainingProjection: string;       // 提升模拟
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
