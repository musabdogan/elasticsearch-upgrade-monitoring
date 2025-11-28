import type { ReactNode } from 'react';

type StatCardProps = {
  title: string;
  value: ReactNode;
  helper?: string;
  icon?: ReactNode;
  trend?: {
    label: string;
    value: string;
    intent?: 'positive' | 'negative' | 'neutral';
  };
};

export function StatCard({ title, value, helper, icon, trend }: StatCardProps) {
  const intentColor =
    trend?.intent === 'positive'
      ? 'text-emerald-400'
      : trend?.intent === 'negative'
        ? 'text-rose-400'
        : 'text-slate-400';

  return (
    <div className="rounded-2xl border border-white/5 bg-white/40 p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/60 dark:ring-white/5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100">
            {value}
          </div>
        </div>
        {icon ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
            {icon}
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>{helper}</span>
        {trend ? (
          <span className={`flex items-center gap-1 text-xs font-medium ${intentColor}`}>
            <span className="inline-block h-2 w-2 rounded-full bg-current" />
            {trend.label}
            <strong className="font-semibold">{trend.value}</strong>
          </span>
        ) : null}
      </div>
    </div>
  );
}

