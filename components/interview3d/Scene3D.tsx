"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import { Interviewer3D, type InterviewerHandle } from "./Interviewer3D";
import { Desk3D } from "./Desk3D";
import type { AnimationState } from "@/lib/interview3d/types";
import type { ReactNode } from "react";

type Scene3DProps = {
  animationState: AnimationState;
  onAvatarReady?: () => void;
  children?: ReactNode;
};

/**
 * 3D interview scene with:
 * - HDRI professional environment
 * - Soft warm lighting (top-down key + ambient fill)
 * - Fixed 50mm-equivalent camera
 * - Digital interviewer avatar
 * - Desk with props
 * - Contact shadows for grounding
 */
export function Scene3D({ animationState, onAvatarReady }: Scene3DProps) {
  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        camera={{
          position: [0, 0.6, 2.2],
          fov: 40,
          near: 0.1,
          far: 10,
        }}
        gl={{ antialias: true, toneMapping: 3, toneMappingExposure: 1.1 }}
        dpr={[1, 2]}
        style={{ background: "#e8e0d8" }}
      >
        {/* Warm professional lighting */}
        <ambientLight intensity={0.35} color="#fff5e6" />
        <hemisphereLight
          args={["#fff5e6", "#c8b8a8", 0.3]}
        />
        {/* Key light: top-down warm */}
        <directionalLight
          position={[0.5, 2.5, 1.2]}
          intensity={1.2}
          color="#ffeedd"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {/* Fill light */}
        <directionalLight
          position={[-0.8, 1.0, 1.5]}
          intensity={0.5}
          color="#e8d8c8"
        />
        {/* Rim light for depth */}
        <directionalLight
          position={[0, 1.0, -1.5]}
          intensity={0.3}
          color="#fff0e0"
        />

        {/* HDRI environment for reflections */}
        <Environment
          preset="studio"
          environmentIntensity={0.6}
          environmentRotation={[0, 0.5, 0]}
        />

        <Suspense fallback={null}>
          <Desk3D />
          <Interviewer3D
            animationState={animationState}
            onReady={onAvatarReady}
          />
        </Suspense>

        {/* Soft shadow under the avatar/desk */}
        <ContactShadows
          position={[0, -1.3, 0]}
          opacity={0.35}
          width={3}
          height={2}
          blur={2.5}
          far={1}
        />
      </Canvas>
    </div>
  );
}
