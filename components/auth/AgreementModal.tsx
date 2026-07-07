"use client";

import { X, Sparkles } from "lucide-react";
import type { Agreement, AgreementKey } from "@/lib/agreements";
import { getAgreement } from "@/lib/agreements";

type Props = {
  agreementKey: AgreementKey;
  open: boolean;
  onClose: () => void;
};

export default function AgreementModal({ agreementKey, open, onClose }: Props) {
  const agreement = getAgreement(agreementKey);
  if (!open || !agreement) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative mx-4 w-full max-w-lg max-h-[80vh] overflow-hidden rounded-[28px] border border-white/40 bg-white/70 shadow-[0_24px_64px_rgba(0,0,0,0.18)] backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-sky-200/40 blur-3xl" />

        <div className="relative px-6 py-7 md:px-8 md:py-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 transition hover:bg-white/50 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="inline-flex items-center gap-2 rounded-full bg-white/50 px-4 py-2 text-xs font-medium uppercase tracking-[0.26em] text-slate-500">
            <Sparkles className="h-4 w-4 text-blue-500" />
            {agreement.title}
          </div>

          <div className="mt-5 max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-white/40 bg-white/40 px-4 py-4 text-sm leading-7 text-slate-700 scrollbar-thin">
            {agreement.content}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-full bg-[rgba(37,113,255,0.88)] px-6 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(37,113,255,0.2)]"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
