import { Suspense } from "react";
import InterviewSessionPage from "@/components/interview/InterviewSessionPage";

export default function InterviewSessionRoute() {
  return (
    <Suspense fallback={null}>
      <InterviewSessionPage />
    </Suspense>
  );
}
