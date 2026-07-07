"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AgreementKey } from "@/lib/agreements";
import AgreementModal from "./AgreementModal";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** 是否显示为勾选框模式（注册页），否则为纯链接模式（登录页） */
  showCheckbox?: boolean;
  className?: string;
};

const links: { key: AgreementKey; label: string }[] = [
  { key: "user-agreement", label: "《用户协议》" },
  { key: "privacy-policy", label: "《隐私政策》" },
  { key: "disclaimer", label: "《免责声明》" },
];

export default function UserAgreements({
  checked,
  onChange,
  showCheckbox = true,
  className,
}: Props) {
  const [modalKey, setModalKey] = useState<AgreementKey | null>(null);

  return (
    <>
      <div className={cn("text-center text-sm text-slate-500", className)}>
        {showCheckbox ? (
          <label className="inline-flex cursor-pointer items-start gap-2.5 text-left">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-300"
            />
            <span className="leading-5">
              我已阅读并同意
              {links.map((link, i) => (
                <span key={link.key}>
                  {i > 0 && "、"}{" "}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setModalKey(link.key); }}
                    className="font-medium text-blue-600 transition hover:text-blue-700 hover:underline"
                  >
                    {link.label}
                  </button>
                </span>
              ))}
            </span>
          </label>
        ) : (
          <span className="text-slate-400">
            查看{" "}
            {links.map((link, i) => (
              <span key={link.key}>
                {i > 0 && "、"}
                <button
                  type="button"
                  onClick={() => setModalKey(link.key)}
                  className="font-medium text-blue-600 transition hover:text-blue-700 hover:underline"
                >
                  {link.label}
                </button>
              </span>
            ))}
          </span>
        )}
      </div>

      {modalKey && (
        <AgreementModal
          agreementKey={modalKey}
          open={!!modalKey}
          onClose={() => setModalKey(null)}
        />
      )}
    </>
  );
}
