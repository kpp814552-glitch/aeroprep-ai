"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { FileText, Mic, MoveRight, ShieldCheck, Sparkles, Target, Upload } from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import { GlassCard, GlassPanel } from "@/components/ui/glass";
import { useAuth } from "@/hooks/useAuth";
import LoginModal from "@/components/auth/LoginModal";
import {
  interviewCompanies,
  interviewerPersonas,
  interviewModes,
  prepRoleOptions,
  type InterviewCompany,
  type InterviewMode,
  type InterviewerPersona,
} from "@/lib/site";
import {
  isMember,
  canStartInterview,
  getRemainingFreeInterviews,
  getCredits,
  subscribeCredits,
  syncServerMember,
} from "@/lib/member/member-storage";
import { cn } from "@/lib/utils";
import { getRoleModel } from "@/lib/interview/role-models";
import { getAirlineProfile } from "@/lib/interview/airline-profiles";

type UploadState = {
  name: string;
  sizeLabel: string;
  type: string;
  text: string;
  chars: number;
  quality?: unknown;
} | null;

type SelectionPillProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function SelectionPill({ label, active, onClick }: SelectionPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-3 text-sm transition",
        active
          ? "accent-ring bg-[rgba(37,113,255,0.94)] text-white"
          : "border border-white/34 bg-white/28 text-slate-700 hover:bg-white/44"
      )}
    >
      {label}
    </button>
  );
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function InterviewPrepPage() {
  const [, setQuotaTick] = useState(0);
  const router = useRouter();
  const { user } = useAuth();

  // 次数到账/扣减时刷新额度文案
  useEffect(() => subscribeCredits(() => setQuotaTick((t) => t + 1)), []);

  // 进入页面先同步一次服务端钱包，避免本地缓存过期导致额度判断错误
  useEffect(() => {
    if (!user) return;
    syncServerMember().catch(() => {});
  }, [user]);

  // 未登录也可以预览整个准备页，具体操作（上传简历 / 开始面试）由登录弹窗拦截

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [resume, setResume] = useState<UploadState>(null);
  const [selectedCompany, setSelectedCompany] = useState<InterviewCompany>("国航");
  const [selectedRole, setSelectedRole] = useState(prepRoleOptions[0].value);
  const [selectedMode, setSelectedMode] = useState<InterviewMode>("校招");
  const [selectedPersona, setSelectedPersona] =
    useState<InterviewerPersona>("专业型HR");
  const [uploadError, setUploadError] = useState("");
  const [showProcess, setShowProcess] = useState(false);

  const selectedRoleLabel = useMemo(
    () => prepRoleOptions.find((item) => item.value === selectedRole)?.label ?? "飞行员",
    [selectedRole]
  );

  // 本场考察重点 / 航司侧重：直接来自该岗位与航司的能力模型，
  // 让"选了哪一类就按哪一类面"这件事在界面上可见
  const roleAbilities = useMemo(
    () => getRoleModel(selectedRole).abilities.slice(0, 5),
    [selectedRole],
  );
  const roleModel = useMemo(() => getRoleModel(selectedRole), [selectedRole]);
  const airlineFocus = useMemo(
    () => getAirlineProfile(selectedCompany).keyAreas.slice(0, 3),
    [selectedCompany],
  );

  function handleResumeChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // 上传简历属于"操作"，游客先引导登录
    if (!user) {
      setShowLoginModal(true);
      event.target.value = "";
      return;
    }

    const isAccepted =
      file.type === "application/pdf" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (!isAccepted) {
      setUploadError("仅支持 PDF 或 DOCX 文件。");
      setResume(null);
      return;
    }

    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    fetch("/api/interview/parse-resume", {
      method: "POST",
      body: formData,
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "解析失败");
        }
        return res.json();
      })
      .then((data) => {
        setResume({
          name: data.fileName,
          sizeLabel: formatFileSize(file.size),
          type: data.fileType,
          text: data.text,
          chars: data.chars,
          quality: data.quality,
        });
      })
      .catch((err) => {
        setUploadError(err.message || "简历解析失败，请重试");
        setResume(null);
      });
  }

  const handleStartInterview = useCallback(async () => {
    if (!isMember() && !canStartInterview()) {
      // 本地缓存可能还没同步到（免费额度以服务端为准），先确认一次再决定
      await syncServerMember().catch(() => {});
      if (!isMember() && !canStartInterview()) {
        router.push("/member");
        return;
      }
    }
    if (resume?.text) {
      sessionStorage.setItem("aeroprep_resume_text", resume.text);
      if (resume.quality) {
        sessionStorage.setItem("aeroprep_resume_quality", JSON.stringify(resume.quality));
      }
    } else {
      sessionStorage.removeItem("aeroprep_resume_text");
      sessionStorage.removeItem("aeroprep_resume_quality");
    }
    router.push(`/interview/session?company=${encodeURIComponent(
      selectedCompany
    )}&role=${encodeURIComponent(selectedRole)}&mode=${encodeURIComponent(
      selectedMode
    )}&persona=${encodeURIComponent(selectedPersona)}`);
  }, [resume, selectedCompany, selectedRole, selectedMode, selectedPersona, router]);

  const sessionHref = `/interview/session?company=${encodeURIComponent(
    selectedCompany
  )}&role=${encodeURIComponent(selectedRole)}&mode=${encodeURIComponent(
    selectedMode
  )}&persona=${encodeURIComponent(selectedPersona)}`;

  // 说明：这里不再因为 loading 而返回 null。
  // 之前等待会话初始化（数据库查询 + 钱包接口）会让整个准备页白屏好几秒，
  // 未登录样式本身就是可用的（点开始面试会弹登录框），拿到用户后会立即切换。

  return (
    <AppFrame backHref="/" backLabel="返回首页">
      <main className="relative z-10 px-5 pb-16 pt-8 md:px-8">
        <div className="stagger-section mx-auto max-w-[1440px] space-y-8">
          <GlassPanel className="soft-enter overflow-hidden px-6 py-9 md:px-10 md:py-12">
            <div className="absolute inset-x-16 top-0 h-28 rounded-full bg-sky-200/55 blur-3xl" />
            <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/44 px-4 py-2 text-xs font-medium uppercase tracking-[0.26em] text-slate-500">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  Interview Prep
                </div>
                <h1 className="mt-8 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-[3.25rem]">
                  AI面试准备页
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                  上传简历，选择目标航司、岗位、面试模式和面试官人格，然后进入沉浸式模拟。
                </p>

                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "目标航司", value: selectedCompany },
                    { label: "目标岗位", value: selectedRoleLabel },
                    { label: "当前模式", value: selectedMode },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[24px] border border-white/36 bg-white/26 px-4 py-4"
                    >
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                        {item.label}
                      </p>
                      <p className="mt-2 text-lg font-medium text-slate-900">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <GlassCard className="overflow-hidden px-5 py-5 md:px-6 md:py-6">
                <div className="relative">
                  <div className="absolute inset-x-8 top-0 h-16 rounded-full bg-white/65 blur-2xl" />
                  <div className="relative rounded-[26px] border border-white/42 bg-slate-950/86 p-6 text-white shadow-[0_20px_48px_rgba(9,15,31,0.28)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                        <Mic className="h-6 w-6 text-sky-300" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                          Session Preview
                        </p>
                        <p className="mt-1 text-base font-medium">
                          真实航空公司模拟面试
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 space-y-3">
                      <div className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 text-sm text-slate-200">
                        面试官人格：{selectedPersona}
                      </div>
                      <div className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 text-sm text-slate-200">
                        题型节奏：AI提问 + 语音回答 + 实时反馈
                      </div>
                      <div className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 text-sm text-slate-200">
                        风格：现代会议室 / 浅景深 / 高端纪录片采访感
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </GlassPanel>

          <div className="grid gap-8 lg:grid-cols-2">
            <GlassPanel className="soft-enter-delay px-5 py-6 md:px-7 md:py-7">
              <div className="grid gap-7">
                <div className="rounded-[28px] border border-white/35 bg-white/24 p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/60 text-slate-900">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-base font-medium text-slate-950">简历上传</p>
                      <p className="text-sm text-slate-500">支持 PDF / DOCX</p>
                    </div>
                  </div>

                  <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-white/48 bg-white/22 px-6 py-10 text-center transition hover:bg-white/38">
                    <input
                      type="file"
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={handleResumeChange}
                    />
                    <FileText className="h-10 w-10 text-slate-400" />
                    <p className="mt-4 text-sm font-medium text-slate-800">
                      点击上传你的简历
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      用于生成更贴近岗位的提问语境
                    </p>
                  </label>

                  {resume ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800">
                      已上传：{resume.name} · {resume.type} · {resume.sizeLabel}
                    </div>
                  ) : null}

                  {uploadError ? (
                    <div className="mt-4 rounded-2xl border border-rose-200/80 bg-rose-50/70 px-4 py-3 text-sm text-rose-700">
                      {uploadError}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[28px] border border-white/35 bg-white/24 p-6">
                  <p className="text-base font-medium text-slate-950">公司选择</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {interviewCompanies.map((company) => (
                      <SelectionPill
                        key={company}
                        label={company}
                        active={selectedCompany === company}
                        onClick={() => setSelectedCompany(company)}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/35 bg-white/24 p-6">
                  <p className="text-base font-medium text-slate-950">岗位选择</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {prepRoleOptions.map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setSelectedRole(role.value)}
                        className={cn(
                          "rounded-[24px] border px-4 py-4 text-left transition",
                          selectedRole === role.value
                            ? "border-blue-300 bg-blue-50/80 shadow-[0_14px_34px_rgba(37,113,255,0.12)]"
                            : "border-white/36 bg-white/24 hover:bg-white/42"
                        )}
                      >
                        <p className="text-sm font-medium text-slate-900">{role.label}</p>
                        <p className="mt-2 text-xs leading-6 text-slate-500">
                          {role.summary}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="soft-enter-delay-2 px-5 py-6 md:px-7 md:py-7">
              <div className="grid gap-7">
                <div className="rounded-[28px] border border-white/35 bg-white/24 p-6">
                  <p className="text-base font-medium text-slate-950">面试模式</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {interviewModes.map((mode) => (
                      <SelectionPill
                        key={mode}
                        label={mode}
                        active={selectedMode === mode}
                        onClick={() => setSelectedMode(mode)}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/35 bg-white/24 p-6">
                  <p className="text-base font-medium text-slate-950">面试官人格</p>
                  <div className="mt-4 grid gap-3">
                    {interviewerPersonas.map((persona) => (
                      <button
                        key={persona}
                        type="button"
                        onClick={() => setSelectedPersona(persona)}
                        className={cn(
                          "rounded-[24px] border px-4 py-4 text-left transition",
                          selectedPersona === persona
                            ? "border-blue-300 bg-blue-50/80 shadow-[0_14px_34px_rgba(37,113,255,0.12)]"
                            : "border-white/36 bg-white/24 hover:bg-white/42"
                        )}
                      >
                        <p className="text-sm font-medium text-slate-900">{persona}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[30px] border border-white/36 bg-slate-950/88 p-7 text-white shadow-[0_22px_60px_rgba(10,18,36,0.32)]">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-sky-300" />
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Ready To Launch
                    </p>
                  </div>

                  <div className="mt-6 grid gap-2 text-xs sm:grid-cols-2">
                    {[
                      ["航司", selectedCompany],
                      ["岗位", selectedRoleLabel],
                      ["模式", selectedMode],
                      ["面试官", selectedPersona],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2"
                      >
                        <span className="text-slate-400">{label}</span>
                        <span className="font-medium text-white">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* 岗位能力权重：证明面试是按所选岗位模型出题的 */}
                  <div className="mt-3 rounded-2xl border border-sky-300/20 bg-sky-400/[0.08] px-4 py-3">
                    <p className="flex items-center gap-2 text-[11px] font-medium text-sky-200">
                      <Target className="h-3.5 w-3.5" />
                      本场考察重点 · {selectedRoleLabel}
                    </p>
                    <div className="mt-2.5 space-y-1.5">
                      {roleAbilities.map((ability) => (
                        <div key={ability.name} className="flex items-center gap-2">
                          <span className="w-24 shrink-0 truncate text-[11px] text-slate-300">{ability.name}</span>
                          <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                            <span
                              className="block h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400"
                              style={{ width: `${ability.weight}%` }}
                            />
                          </span>
                          <span className="w-10 text-right text-[10px] text-slate-400">{ability.weight}%</span>
                        </div>
                      ))}
                    </div>
                    {airlineFocus.length > 0 && (
                      <p className="mt-2.5 border-t border-white/10 pt-2 text-[10px] leading-5 text-slate-400">
                        {selectedCompany} 面试更看重：
                        {airlineFocus.map((area) => `${area.name}（${area.weight}%）`).join(" · ")}
                      </p>
                    )}
                  </div>

                  {/* 真实招聘流程 + 硬性条件：让每个岗位的特色可见 */}
                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                        {selectedRoleLabel} 真实招聘流程
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowProcess((v) => !v)}
                        className="shrink-0 rounded-full border border-white/12 px-2.5 py-0.5 text-[10px] text-slate-300 transition hover:bg-white/10"
                      >
                        {showProcess ? "收起" : `查看 ${roleModel.hiringProcess.length} 步`}
                      </button>
                    </div>
                    <div className={`mt-2 space-y-1 ${showProcess ? "" : "max-h-[3.6rem] overflow-hidden"}`}>
                      {roleModel.hiringProcess.map((step, index) => (
                        <p key={step} className="text-[10px] leading-5 text-slate-400">
                          <span className="mr-1.5 text-slate-500">{index + 1}.</span>
                          {step}
                        </p>
                      ))}
                    </div>
                    {showProcess && (
                      <>
                        <p className="mt-2 border-t border-white/10 pt-2 text-[10px] leading-5 text-slate-400">
                          常见硬性条件：{roleModel.hardRequirements.join("；")}
                        </p>
                        {roleModel.sources?.length ? (
                          <p className="mt-1.5 text-[10px] leading-5 text-slate-500">
                            依据公开资料整理：{roleModel.sources.join("；")}
                          </p>
                        ) : (
                          <p className="mt-1.5 text-[10px] leading-5 text-slate-500">
                            依据行业公开招聘公告惯例整理，各航司要求可能不同
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* 简历状态：让"上传了会不会用上"一目了然 */}
                  <div className={`mt-3 rounded-2xl border px-4 py-2.5 text-[11px] leading-5 ${
                    resume
                      ? "border-emerald-300/25 bg-emerald-400/[0.08] text-emerald-100"
                      : "border-white/10 bg-white/[0.05] text-slate-400"
                  }`}>
                    {resume
                      ? `已上传简历：${resume.name} · ${resume.chars} 字 —— 面试官会结合简历内容提问`
                      : "未上传简历：将按岗位通用问题面试；上传简历后面试官会针对你的经历追问"}
                  </div>

                  <div className="mt-8 flex flex-col gap-3">
                  {!isMember() && user && (() => { const admins = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("aeroprep_admin_emails") || "[]") : []; return !admins.includes(user.email?.toLowerCase()); })() && (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-2.5 text-center text-xs text-amber-700">
                      {isMember()
                        ? "会员用户 · 不限次数"
                        : (() => {
                            const free = getRemainingFreeInterviews();
                            const credits = getCredits();
                            if (free > 0) return "免费剩余 " + free + " 次 · 已购 " + credits + " 次";
                            if (credits > 0) return "已购次数剩余 " + credits + " 次（¥2/次）";
                            return "免费次数已用完 · 购买后继续面试";
                          })()}
                    </div>
                  )}
                  {!isMember() && user && (
                    <p className="text-center text-[10px] leading-5 text-slate-500">
                      完成并生成报告才扣 1 次 · 中途退出不扣，可继续上次进度
                    </p>
                  )}
                    {user ? (
                      <button
                        type="button"
                        onClick={handleStartInterview}
                        className="shine-border accent-ring inline-flex w-full items-center justify-center gap-2 rounded-full bg-[rgba(37,113,255,0.88)] px-6 py-3.5 text-base font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(37,113,255,0.22)]"
                      >
                        开始面试
                        <MoveRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowLoginModal(true)}
                        className="shine-border accent-ring inline-flex w-full items-center justify-center gap-2 rounded-full bg-[rgba(37,113,255,0.88)] px-6 py-3.5 text-base font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(37,113,255,0.22)]"
                      >
                        开始面试
                        <MoveRight className="h-4 w-4" />
                      </button>
                    )}
                    <LoginModal
                      open={showLoginModal}
                      onClose={() => setShowLoginModal(false)}
                      message="请先登录后开始AI面试"
                      redirectAfterLogin={sessionHref}
                    />
                    <Link
                      href="/interview/report"
                      className="text-center text-sm text-slate-300 underline underline-offset-4"
                    >
                      预览面试报告页
                    </Link>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </div>
        </div>
      </main>
    </AppFrame>
  );
}
