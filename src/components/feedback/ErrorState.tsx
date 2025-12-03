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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-6 text-center text-rose-700 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
      <TriangleAlert className="h-6 w-6" />
      <p className="text-sm font-medium">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-md transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:bg-rose-500 dark:hover:bg-rose-600 dark:focus:ring-offset-gray-900"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

