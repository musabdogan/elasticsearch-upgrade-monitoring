import clsx from 'clsx';

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-lg bg-slate-200/60 dark:bg-slate-700/60',
        className
      )}
    />
  );
}

