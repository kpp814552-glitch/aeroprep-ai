import AppFrame from "@/components/layout/AppFrame";
import LearningCenterClient from "@/components/learning-center/LearningCenterClient";

export default function LearningPage() {
  return (
    <AppFrame backHref="/" backLabel="返回首页">
      <main className="relative z-10 min-h-dvh-safe px-5 pb-20 pt-8 md:px-8 md:pt-10">
        <div className="relative">
          <LearningCenterClient />
        </div>
      </main>
    </AppFrame>
  );
}
