export type AnimationState =
  | "loading"
  | "idle"
  | "greeting"
  | "speaking"
  | "listening"
  | "thinking"
  | "finish";

export type AvatarConfig = {
  name: string;
  company: string;
  model: string;
  voice: string;
  theme: string;
};

export const DEFAULT_AVATAR_MODEL = "/interviewer.glb";
