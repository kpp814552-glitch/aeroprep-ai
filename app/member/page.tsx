import { Suspense } from "react";
import MembershipPage from "@/components/member/MembershipPage";

export default function MemberRoute() {
  return (
    <Suspense fallback={null}>
      <MembershipPage />
    </Suspense>
  );
}
