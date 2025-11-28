import type { ClusterHealth } from '@/types/api';

const clusterHealth: ClusterHealth = {
  cluster_name: 'upgrade-monitor',
  status: 'yellow',
  timed_out: false,
  number_of_nodes: 9,
  number_of_data_nodes: 7,
  active_primary_shards: 820,
  active_shards: 1640,
  relocating_shards: 6,
  initializing_shards: 12,
  unassigned_shards: 4,
  delayed_unassigned_shards: 0,
  number_of_pending_tasks: 3,
  task_max_waiting_in_queue_millis: 320,
  active_shards_percent_as_number: 97.4
};

export default clusterHealth;

