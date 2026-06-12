import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlassLinkButtonProps = {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
};

export function GlassLinkButton({
  href,
  children,
  className,
  variant = "primary",
}: GlassLinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-all duration-300",
        variant === "primary" &&
          "shine-border accent-ring bg-[rgba(37,113,255,0.88)] text-white hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(37,113,255,0.22)]",
        variant === "secondary" &&
          "glass-muted text-slate-800 hover:-translate-y-0.5 hover:bg-white/60",
        className
      )}
    >
      {children}
    </Link>
  );
}
