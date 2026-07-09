import type { AvatarConfig } from "./types";
import { DEFAULT_AVATAR_MODEL } from "./types";

/** Configure the digital interviewer appearance per airline */
export const interviewerConfigs: Record<string, AvatarConfig> = {
  "国航": {
    name: "王琳",
    company: "中国国际航空",
    model: "/interviewer-airline.glb",
    voice: "zh-CRCA-Neural",
    theme: "professional-warm",
  },
  "南方航空": {
    name: "李婷",
    company: "中国南方航空",
    model: "/interviewer-airline.glb",
    voice: "zh-CRCA-Neural",
    theme: "professional-warm",
  },
};

export function getInterviewerConfig(company: string): AvatarConfig {
  return interviewerConfigs[company] ?? {
    name: "面试官",
    company: company,
    model: DEFAULT_AVATAR_MODEL,
    voice: "zh-CRCA-Neural",
    theme: "professional-warm",
  };
}
