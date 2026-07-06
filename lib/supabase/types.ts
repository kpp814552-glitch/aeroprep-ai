export type UserProfile = {
  id: string;
  username: string;
  email: string;
  avatar: string;
  created_at: string;
  interview_count: number;
  highest_score: number;
  average_score: number;
  continuous_days: number;
  total_duration: number;
  last_login: string;
};

export type InterviewRecord = {
  id: string;
  user_id: string;
  role: string;
  role_label: string;
  company: string;
  mode: string;
  persona: string;
  score: number;
  evaluation: string;
  strengths: string[];
  weaknesses: string[];
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  total_turns: number;
  created_at: string;
};
