export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-5">
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-400" />
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-400 [animation-delay:150ms]" />
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-400 [animation-delay:300ms]" />
      </div>
      <p className="mt-5 text-sm text-slate-500">正在加载...</p>
    </div>
  );
}
