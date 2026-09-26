import AppFrame from "@/components/layout/AppFrame";
import LearningCenterClient from "@/components/learning-center/LearningCenterClient";

export default function LearningPage() {
  return (
    <AppFrame backHref="/" backLabel="返回首页">
      <main className="relative z-10 min-h-dvh-safe px-5 pb-20 pt-8 md:px-8 md:pt-10">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-48 -top-48 h-[620px] w-[620px] rounded-full bg-sky-100/30 blur-3xl" />
          <div className="absolute -bottom-52 -right-52 h-[680px] w-[680px] rounded-full bg-violet-100/25 blur-3xl" />
        </div>
        <div className="relative">
          <LearningCenterClient />
        </div>
      </main>
    </AppFrame>
  );
}
