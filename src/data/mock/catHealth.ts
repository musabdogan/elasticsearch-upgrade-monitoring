import type { CatHealthRow } from '@/types/api';

const now = Date.now();

const catHealth: CatHealthRow[] = Array.from({ length: 10 }).map((_, index) => {
  const timestamp = new Date(now - index * 60_000).toISOString();
  const status = index > 6 ? 'green' : index > 2 ? 'yellow' : 'red';

  return {
    epoch: Math.floor(Date.parse(timestamp) / 1000).toString(),
    timestamp,
    cluster: 'upgrade-monitor',
    status,
    'node.total': '9',
    'node.data': '7',
    shards: '1640',
    pri: '820',
    relo: (index % 6).toString(),
    init: (index % 4).toString(),
    unassign: (index % 3).toString(),
    pending_tasks: (index % 2).toString(),
    max_task_wait_time: `${index * 50}ms`,
    active_shards_percent: (97.5 - index * 0.2).toFixed(1)
  };
});

export default catHealth.reverse();

