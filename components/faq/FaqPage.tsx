"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ChevronDown,
  Headphones,
  HelpCircle,
  Mic,
  Search,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";

type CategoryKey = "before" | "voice" | "billing" | "report" | "account";

type FaqItem = {
  id: string;
  category: CategoryKey;
  q: string;
  a: string;
};

const CATEGORIES: Array<{
  key: CategoryKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "before", label: "面试准备", description: "设备、环境与注意事项", icon: Headphones },
  { key: "voice", label: "语音与设备", description: "麦克风、网络与浏览器", icon: Mic },
  { key: "billing", label: "次数与支付", description: "免费额度、购买与扣费", icon: WalletCards },
  { key: "report", label: "报告与成长", description: "评分、报告与训练建议", icon: BarChart3 },
  { key: "account", label: "账号与服务", description: "登录、数据与售后", icon: UserRound },
];

const FAQS: FaqItem[] = [
  {
    id: "prepare",
    category: "before",
    q: "正式面试前需要准备什么？",
    a: "建议佩戴耳机，选择安静环境，保持网络稳定，并提前允许浏览器使用麦克风。面试过程中不要刷新、关闭或切换页面，听完面试官问题后再作答。开始前系统会展示“面试前须知”，确认设备和网络状态正常后即可开始。",
  },
  {
    id: "duration",
    category: "before",
    q: "一场模拟面试大约需要多久？",
    a: "通常需要 5-10 分钟。题数会根据岗位、招聘模式和答题情况动态推进，单场最多 8 题。每道题都有答题时间提示，建议控制回答长度，先讲结论，再补充关键经历。",
  },
  {
    id: "finish-early",
    category: "before",
    q: "可以提前结束或中途退出吗？",
    a: "可以退出，但只有完整完成本场面试并生成报告，系统才会按一次面试计费。如果中途退出，进度会暂存，重新进入后可以继续上次未完成的题目。",
  },
  {
    id: "resume",
    category: "before",
    q: "上传简历后，面试问题会变化吗？",
    a: "会。支持 PDF、DOCX 简历，系统会结合目标岗位读取你的专业、经历和技能，在保持岗位考察方向不变的前提下进行针对性追问。没有简历也可以正常面试。",
  },
  {
    id: "voice-unavailable",
    category: "voice",
    q: "听不到面试官语音怎么办？",
    a: "请先检查网络、系统音量和浏览器静音状态。如果页面提示语音连接失败，点击“重试面试官语音”即可重新连接，不会切换到浏览器自带语音。多次失败时建议切换稳定网络并刷新页面，已答进度会保留。",
  },
  {
    id: "headphones",
    category: "voice",
    q: "必须佩戴耳机吗？",
    a: "不是强制要求，但强烈建议佩戴耳机。耳机可以减少面试官语音被麦克风再次收录，降低回声和识别错误，让回答记录更完整。",
  },
  {
    id: "microphone",
    category: "voice",
    q: "浏览器没有弹出麦克风权限怎么办？",
    a: "请打开浏览器的网站权限设置，将麦克风权限改为“允许”，然后刷新页面。使用手机时还需确认系统没有禁止浏览器访问麦克风。",
  },
  {
    id: "network",
    category: "voice",
    q: "为什么面试中不要切换网络？",
    a: "语音播放和回答识别都依赖连续网络。从 Wi-Fi 切换到移动网络、进入电梯或开启 VPN，可能导致语音中断或题目加载失败。若网络波动，请等待页面自动重试，不要连续刷新。",
  },
  {
    id: "mobile",
    category: "voice",
    q: "可以在手机上参加面试吗？",
    a: "可以，页面支持手机、平板和电脑。正式训练建议优先使用电脑、最新版 Chrome 或 Edge，并搭配耳机和稳定的 Wi-Fi，以获得更稳定的语音和答题体验。",
  },
  {
    id: "free-trial",
    category: "billing",
    q: "免费用户可以体验几次面试？",
    a: "每个账号首次完整面试免费，免费资格与账号绑定，换设备或清理浏览器缓存不会重置。资料中心可以免费阅读，AI 优化功能登录后也可以免费使用。",
  },
  {
    id: "price",
    category: "billing",
    q: "目前如何收费？",
    a: "按次收费：单次 ¥2；5 次 ¥9，节省 ¥1；10 次 ¥16，节省 ¥4，最低约 ¥1.6/次。购买的面试次数长期有效。",
  },
  {
    id: "charge-rule",
    category: "billing",
    q: "什么时候会扣一次面试次数？",
    a: "只有完整做完本场面试并生成报告后才扣 1 次。中途退出、刷新页面、网络中断或主动放弃当前进度，都不会扣次数。",
  },
  {
    id: "retry-charge",
    category: "billing",
    q: "重新开始一场会多扣次数吗？",
    a: "只有已经完成并生成报告的场次会扣次数。尚未完成的进度被放弃或重新开始，不会额外扣费；完成后的新面试才会按 1 次计算。",
  },
  {
    id: "payment-arrival",
    category: "billing",
    q: "支付后多久可以到账？",
    a: "扫码支付时请填写订单号并提交付款申请。管理员核对到账后会立即将次数写入账号，通常在 5 分钟内完成，最晚不超过 24 小时。到账后购买页面会自动更新。",
  },
  {
    id: "refund",
    category: "billing",
    q: "面试次数可以退款吗？",
    a: "面试次数属于数字虚拟商品，购买后不支持退款。建议先使用账号的免费面试完整体验一次，确认产品适合自己后再购买。",
  },
  {
    id: "report-time",
    category: "report",
    q: "面试结束后多久生成报告？",
    a: "完成最后一题后，系统会整理整场问答并生成详细报告，通常需要 20-60 秒。等待期间请保持页面开启，生成完成后会自动进入报告页。",
  },
  {
    id: "report-content",
    category: "report",
    q: "面试报告包含哪些内容？",
    a: "报告包含综合评分、竞争力定位、优势与风险点、逐题回答分析、个性化改进建议，以及后续训练方向。每题分析会根据你的真实回答生成，不使用统一模板。",
  },
  {
    id: "report-failed",
    category: "report",
    q: "报告生成失败或网络中断怎么办？",
    a: "系统会优先保留本场问答记录和进度。网络恢复后可以重新生成报告；如果详细分析暂时不可用，也会保留基础结果，避免整场面试数据丢失。",
  },
  {
    id: "score-meaning",
    category: "report",
    q: "AI 评分代表真实录取结果吗？",
    a: "不代表真实录取结果。评分用于帮助你了解当前表达、岗位匹配和专业能力的相对水平。真实招聘还会受到招聘名额、学历、外语、形象条件、面试官判断等因素影响。",
  },
  {
    id: "data-retention",
    category: "report",
    q: "面试记录和报告会保存多久？",
    a: "登录状态下，完成记录会保存到成长中心，便于查看成绩趋势和历史报告。浏览器本地也会保留最近记录；更换设备后，登录同一账号可以同步属于自己的记录。",
  },
  {
    id: "login-required",
    category: "account",
    q: "为什么开始面试或优化前需要登录？",
    a: "登录用于绑定免费额度、保存面试进度、生成个人报告和同步成长数据，也可以避免刷新或更换设备后丢失训练记录。浏览页面通常不需要登录。",
  },
  {
    id: "support",
    category: "account",
    q: "遇到问题如何联系客服？",
    a: "请记录问题发生时间、面试岗位、订单号（如涉及支付）和页面提示，通过网站内反馈渠道提交。涉及支付时请一并提供付款截图，便于快速核对。",
  },
];

const QUICK_HELP = [
  { label: "听不到语音", target: "voice-unavailable" },
  { label: "面试如何扣费", target: "charge-rule" },
  { label: "报告生成失败", target: "report-failed" },
];

export default function FaqPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("before");
  const [openId, setOpenId] = useState<string | null>("prepare");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return FAQS.filter((faq) => {
      const inCategory = faq.category === activeCategory;
      if (!keyword) return inCategory;
      return (
        inCategory &&
        (faq.q.toLowerCase().includes(keyword) || faq.a.toLowerCase().includes(keyword))
      );
    });
  }, [activeCategory, query]);

  const counts = useMemo(() => {
    return CATEGORIES.reduce<Record<CategoryKey, number>>(
      (result, category) => {
        result[category.key] = FAQS.filter((faq) => faq.category === category.key).length;
        return result;
      },
      { before: 0, voice: 0, billing: 0, report: 0, account: 0 },
    );
  }, []);

  const activeMeta = CATEGORIES.find((item) => item.key === activeCategory) || CATEGORIES[0];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  function selectCategory(category: CategoryKey) {
    setActiveCategory(category);
    setOpenId(null);
    setQuery("");
  }

  function openQuickHelp(target: string) {
    const item = FAQS.find((faq) => faq.id === target);
    if (!item) return;
    setActiveCategory(item.category);
    setOpenId(item.id);
    setQuery("");
  }

  return (
    <AppFrame>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main className="relative z-10 min-h-dvh-safe">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-[1000px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-b from-sky-50/50 via-violet-50/20 to-transparent blur-3xl" />
          <div className="absolute -bottom-56 -right-56 h-[620px] w-[620px] rounded-full bg-amber-50/30 blur-3xl" />
        </div>

        <div className="stagger-section relative mx-auto max-w-[1320px] px-5 pb-32 pt-12 md:px-8 md:pt-16">
          <header className="rise-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/60 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500 shadow-sm backdrop-blur-md">
              <HelpCircle className="h-3 w-3 text-sky-500" />
              Help Center
            </div>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
                  常见问题
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
                  关于面试准备、语音设备、次数计费、报告生成和账号使用的说明，都可以在这里快速找到。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/interview"
                  className="rounded-full bg-slate-950 px-5 py-2.5 text-xs font-medium text-white transition hover:bg-slate-800"
                >
                  开始面试
                </Link>
                <Link
                  href="/member"
                  className="rounded-full border border-white/60 bg-white/70 px-5 py-2.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-white"
                >
                  查看次数
                </Link>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-2 text-[11px] text-slate-500">
              {["面试前需确认设备与网络", "单场通常 5-10 分钟", "完整生成报告后计费", "支持电脑与手机"].map((item) => (
                <span key={item} className="rounded-full border border-white/60 bg-white/60 px-3 py-1.5 shadow-sm">
                  {item}
                </span>
              ))}
            </div>
          </header>

          <section className="rise-in mt-8 grid gap-3 md:grid-cols-3">
            {QUICK_HELP.map((item) => (
              <button
                key={item.target}
                type="button"
                onClick={() => openQuickHelp(item.target)}
                className="group flex items-center justify-between rounded-2xl border border-white/55 bg-white/65 px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
              >
                <span>
                  <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-400">快速查看</span>
                  <span className="mt-1 block text-sm font-medium text-slate-800">{item.label}</span>
                </span>
                <Sparkles className="h-4 w-4 text-sky-500 transition group-hover:scale-110" />
              </button>
            ))}
          </section>

          <div className="mt-10 grid gap-7 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start">
            <aside className="lg:sticky lg:top-6">
              <div className="glass-panel p-3">
                <p className="px-2 pb-3 pt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                  问题分类
                </p>
                <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
                  {CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    const active = activeCategory === category.key;
                    return (
                      <button
                        key={category.key}
                        type="button"
                        onClick={() => selectCategory(category.key)}
                        className={`flex min-w-fit items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition lg:w-full ${
                          active
                            ? "bg-slate-950 text-white shadow-lg"
                            : "text-slate-600 hover:bg-white/55 hover:text-slate-900"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="block whitespace-nowrap text-xs font-semibold">{category.label}</span>
                          <span className={`hidden text-[10px] leading-4 lg:block ${active ? "text-white/60" : "text-slate-400"}`}>
                            {category.description}
                          </span>
                        </span>
                        <span
                          className={`ml-auto hidden rounded-full px-2 py-0.5 text-[9px] font-semibold lg:inline-flex ${
                            active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {counts[category.key]}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            <section className="min-w-0">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Frequently Asked</p>
                  <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950">{activeMeta.label}</h2>
                  <p className="mt-1 text-xs text-slate-500">{activeMeta.description}</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setOpenId(null);
                    }}
                    placeholder={`搜索${activeMeta.label}问题`}
                    className="w-full rounded-full border border-white/60 bg-white/70 py-2.5 pl-9 pr-4 text-xs text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
                  />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {filtered.length > 0 ? (
                  filtered.map((faq) => {
                    const expanded = openId === faq.id;
                    return (
                      <article
                        key={faq.id}
                        className={`overflow-hidden rounded-[22px] border shadow-sm transition-all duration-200 ${
                          expanded
                            ? "border-sky-200/80 bg-white"
                            : "border-white/55 bg-white/60 hover:bg-white/80"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenId(expanded ? null : faq.id)}
                          aria-expanded={expanded}
                          className="flex w-full items-center justify-between gap-4 px-5 py-4.5 text-left md:px-6"
                        >
                          <span className="text-sm font-medium text-slate-800">{faq.q}</span>
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition ${expanded ? "bg-sky-50 text-sky-600" : "bg-slate-100 text-slate-400"}`}>
                            <ChevronDown className={`h-4 w-4 transition duration-200 ${expanded ? "rotate-180" : ""}`} />
                          </span>
                        </button>
                        <div
                          className={`grid transition-all duration-250 ease-out ${
                            expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <p className="border-t border-slate-100 px-5 py-4 text-[13px] leading-7 text-slate-600 md:px-6">
                              {faq.a}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-[22px] border border-dashed border-white/70 bg-white/50 px-6 py-12 text-center">
                    <Search className="mx-auto h-6 w-6 text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-600">没有找到相关问题</p>
                    <p className="mt-1 text-xs text-slate-400">换一个关键词，或切换到其他问题分类</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </AppFrame>
  );
}
