import AppFrame from "@/components/layout/AppFrame";
import LearningCenterClient from "@/components/learning-center/LearningCenterClient";
import { BookOpen } from "lucide-react";

export default function LearningPage() {
  return (
    <AppFrame backHref="/" backLabel="返回首页">
      <main className="relative z-10 px-5 pb-16 pt-8 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-sky-600" />
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950 md:text-3xl">资料中心</h1>
              <p className="mt-1 text-sm text-slate-500">民航岗位面试学习平台</p>
            </div>
          </div>
          <LearningCenterClient />
        </div>
      </main>
    </AppFrame>
  );
}
