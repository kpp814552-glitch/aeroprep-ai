import { Radar } from "lucide-react";

function getRadarPoint(index: number, total: number, value: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  const radius = 88 * (value / 100);
  const x = 110 + radius * Math.cos(angle);
  const y = 110 + radius * Math.sin(angle);
  return `${x},${y}`;
}

export default function ScoreRadar({
  items,
}: {
  items: Array<{ label: string; value: number }>;
}) {
  const polygon = items.map((item, index) => getRadarPoint(index, items.length, item.value)).join(" ");

  return (
    <div className="rounded-[34px] border border-white/44 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.46))] p-6 shadow-[0_22px_58px_rgba(72,52,31,0.08)]">
      <div className="flex items-center gap-3">
        <Radar className="h-5 w-5 text-sky-600" />
        <p className="text-sm font-medium text-slate-800">能力雷达图</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <svg viewBox="0 0 220 220" className="mx-auto h-64 w-64">
          {[20, 40, 60, 80, 100].map((level) => {
            const guide = items
              .map((_, index) => getRadarPoint(index, items.length, level))
              .join(" ");

            return (
              <polygon
                key={level}
                points={guide}
                fill="none"
                stroke="rgba(107,114,128,0.18)"
                strokeWidth="1"
              />
            );
          })}

          <polygon
            points={polygon}
            fill="rgba(73,146,198,0.18)"
            stroke="rgba(73,146,198,0.88)"
            strokeWidth="2"
          />

          {items.map((item, index) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * index) / items.length;
            const x = 110 + 102 * Math.cos(angle);
            const y = 110 + 102 * Math.sin(angle);

            return (
              <text
                key={item.label}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-700 text-[10px]"
              >
                {item.label}
              </text>
            );
          })}
        </svg>

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-2xl border border-white/30 bg-white/50 px-4 py-2.5"
            >
              <div className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              <span className="flex-1 text-xs text-slate-600">{item.label}</span>
              <span className="text-sm font-semibold text-slate-900">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
