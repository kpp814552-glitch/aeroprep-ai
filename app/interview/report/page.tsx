import { Suspense } from "react";
import InterviewReportPage from "@/components/interview/InterviewReportPage";

export default function InterviewReportRoute() {
  return (
    <Suspense fallback={null}>
      <InterviewReportPage />
    </Suspense>
  );
}
