import type { ClusterSettings } from '@/types/api';

const clusterSettings: ClusterSettings = {
  persistent: {
    'cluster.routing.allocation.node_concurrent_recoveries': '8',
    'indices.recovery.max_bytes_per_sec': '200mb',
    'cluster.max_shards_per_node': '4000'
  },
  transient: {
    'cluster.routing.allocation.enable': 'all'
  }
};

export default clusterSettings;

