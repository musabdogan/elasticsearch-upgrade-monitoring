'use client';

import { TriangleAlert } from 'lucide-react';

type ErrorStateProps = {
  message: string;
  actionLabel?: string;
  onRetry?: () => void;
};

export function ErrorState({
  message,
  actionLabel = 'Try again',
  onRetry
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center text-rose-200">
      <TriangleAlert className="h-6 w-6" />
      <p className="text-sm font-medium">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-white/20"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

