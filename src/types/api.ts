export type ClusterStatus = 'green' | 'yellow' | 'red' | 'unknown';

export type Maybe<T> = T | null;

export interface CatAllocationRow {
  shards: number;
  diskAvail: string;
  node: string;
  ip?: string;
}

export interface RecoveryRow {
  index: string;
  shard: string;
  time: string;
  sourceNode: string;
  targetNode: string;
  target: string;
  filesPercent: string;
  bytesPercent: string;
  stage: string;
  translog: string;
}

export interface ClusterHealth {
  cluster_name: string;
  status: ClusterStatus;
  timed_out: boolean;
  number_of_nodes: number;
  number_of_data_nodes: number;
  active_primary_shards: number;
  active_shards: number;
  relocating_shards: number;
  initializing_shards: number;
  unassigned_shards: number;
  delayed_unassigned_shards: number;
  number_of_pending_tasks: number;
  task_max_waiting_in_queue_millis: number;
  active_shards_percent_as_number: number;
}

export interface NodeInfo {
  nodeRole: string;
  name: string;
  ip?: string;
  version: string;
  uptime: string;
  upgradeOrder?: number | null;
}

export interface ClusterSettings {
  persistent: Record<string, string>;
  transient: Record<string, string>;
  defaults?: Record<string, string>;
}

export interface CatHealthRow {
  epoch: string;
  timestamp: string;
  cluster: string;
  status: ClusterStatus;
  'node.total': string;
  'node.data': string;
  shards: string;
  pri: string;
  relo: string;
  init: string;
  unassign: string;
  pending_tasks: string;
  max_task_wait_time: string;
  active_shards_percent: string;
}

export interface MonitoringSnapshot {
  allocation: CatAllocationRow[];
  recovery: RecoveryRow[];
  health: ClusterHealth;
  nodes: NodeInfo[];
  settings: ClusterSettings;
  catHealth: CatHealthRow[];
  fetchedAt: string;
}

