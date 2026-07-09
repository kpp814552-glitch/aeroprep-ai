import { Suspense } from "react";
import InterviewSession3D from "@/components/interview3d/InterviewSession3D";

export default function Session3DRoute() {
  return (
    <Suspense fallback={null}>
      <InterviewSession3D />
    </Suspense>
  );
}
