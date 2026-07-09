"use client";
import type { AnimationState } from "@/lib/interview3d/types";

export type AnimationMachineHandle = {
  currentState: AnimationState;
  transition: (next: AnimationState) => void;
};

/**
 * Animation State Machine for digital interviewer.
 * Manages cross-fade transitions between animation states.
 */
export function createAnimationMachine(
  onTransition?: (from: AnimationState, to: AnimationState) => void
): AnimationMachineHandle {
  let _state: AnimationState = "loading";

  return {
    get currentState() {
      return _state;
    },
    transition(next: AnimationState) {
      if (next === _state) return;
      const prev = _state;
      _state = next;
      onTransition?.(prev, next);
    },
  };
}

/**
 * Maps interview phase to animation state.
 */
export function mapPhaseToAnimationState(phase: string): AnimationState {
  switch (phase) {
    case "preparing": return "loading";
    case "ready":     return "idle";
    case "playing":   return "speaking";
    case "listening": return "listening";
    case "processing":return "thinking";
    case "completed": return "finish";
    default:          return "idle";
  }
}
