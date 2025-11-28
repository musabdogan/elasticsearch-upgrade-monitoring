/**
 * Shared Elasticsearch configuration such as endpoints and sensible defaults.
 */
export const apiConfig = {
  pollIntervalMs:
    Number.parseInt(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? '5000', 10) || 5000,
  requestTimeoutMs:
    Number.parseInt(process.env.NEXT_PUBLIC_REQUEST_TIMEOUT_MS ?? '8000', 10) || 8000,
  useMock:
    (process.env.NEXT_PUBLIC_USE_MOCK ?? 'false').toLowerCase() === 'true',
  endpoints: {
    allocation: '/_cat/allocation?v&format=json&h=shards,disk.avail,node,ip&s=ip',
    recovery:
      '/_cat/recovery?v&format=json&h=index,shard,time,source_node,target_node,target,fp,bp,stage,translog,bytes_percent&s=ty:desc,index,bp:desc&active_only',
    clusterHealth: '/_cluster/health',
    nodes: '/_cat/nodes?v&format=json&h=node.role,name,version,uptime,ip&s=node.role,ip',
    nodesDetailed: '/_nodes',
    clusterSettings: '/_cluster/settings?flat_settings',
    catHealth: '/_cat/health?v&format=json'
  }
} as const;

export const apiHeaders = {
  Accept: 'application/json'
};

