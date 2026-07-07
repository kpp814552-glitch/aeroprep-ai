import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlassSurfaceProps = {
  children: ReactNode;
  className?: string;
};

export function GlassPanel({ children, className }: GlassSurfaceProps) {
  return <div className={cn("glass-panel", className)}>{children}</div>;
}

export function GlassCard({ children, className }: GlassSurfaceProps) {
  return <div className={cn("glass-card", className)}>{children}</div>;
}

type GlassButtonProps = {
  variant?: "primary" | "secondary" | "ghost";
} & ComponentPropsWithoutRef<"button">;

export function GlassButton({
  className,
  variant = "primary",
  type = "button",
  ...props
}: GlassButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-all duration-300",
        "focus:outline-none focus:ring-2 focus:ring-blue-300/60",
        variant === "primary" &&
          "accent-ring bg-[rgba(37,113,255,0.88)] text-white hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(37,113,255,0.22)]",
        variant === "secondary" &&
          "glass-muted text-slate-800 hover:-translate-y-0.5 hover:bg-white/60",
        variant === "ghost" &&
          "bg-white/20 text-slate-700 hover:bg-white/36",
        className
      )}
      {...props}
    />
  );
}
