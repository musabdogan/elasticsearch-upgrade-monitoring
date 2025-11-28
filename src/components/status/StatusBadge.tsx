import type { ClusterStatus } from '@/types/api';
import { statusToColor } from '@/utils/format';

type Props = {
  status: ClusterStatus;
};

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 rounded-lg border-2 px-8 py-4 text-2xl font-bold uppercase tracking-wider shadow-lg ${statusToColor(
        status
      )}`}
    >
      <span className="h-3.5 w-3.5 rounded-full bg-white/90" />
      {status}
    </span>
  );
}

