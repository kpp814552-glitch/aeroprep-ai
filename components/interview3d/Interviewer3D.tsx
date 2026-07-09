"use client";

import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { useGLTF } from "@react-three/drei";
import { Avatoon, type AvatoonHandle } from "avatoon";

import type { AnimationState } from "@/lib/interview3d/types";
import { DEFAULT_AVATAR_MODEL } from "@/lib/interview3d/types";

export type InterviewerHandle = {
  playAudio: () => void;
  stopAudio: () => void;
  setAnimationState: (state: AnimationState) => void;
};

type Props = {
  modelUrl?: string;
  animationState: AnimationState;
  onReady?: () => void;
};

export const Interviewer3D = forwardRef<InterviewerHandle, Props>(
  ({ modelUrl = DEFAULT_AVATAR_MODEL, animationState, onReady }, ref) => {
    const avatoonRef = useRef<AvatoonHandle>(null);

    useImperativeHandle(ref, () => ({
      playAudio() { avatoonRef.current?.play(); },
      stopAudio() { avatoonRef.current?.stop(); },
      setAnimationState(_state: AnimationState) {},
    }));

    useEffect(() => {
      if (animationState === "idle") {
        onReady?.();
      }
    }, [animationState, onReady]);

    return (
      <group position={[0, -1.4, 0]}>
        <Avatoon
          ref={avatoonRef}
          glbUrl={modelUrl}
        />
      </group>
    );
  }
);

Interviewer3D.displayName = "Interviewer3D";

useGLTF.preload(DEFAULT_AVATAR_MODEL);
