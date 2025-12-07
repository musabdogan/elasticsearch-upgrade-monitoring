/**
 * Elasticsearch configuration for the Chrome extension.
 * Direct API calls without proxy (Chrome extension handles CORS via host_permissions).
 */
export const apiConfig = {
  pollIntervalMs: 5000,
  requestTimeoutMs: 8000,
  endpoints: {
    allocation: '/_cat/allocation?v&format=json&h=shards,disk.avail,node,ip&s=ip',
    recovery:
      '/_cat/recovery?v&format=json&h=index,shard,time,source_node,target_node,target,fp,bp,stage,translog,bytes_percent&s=ty:desc,index,bp:desc&active_only',
    clusterHealth: '/_cluster/health',
    nodes: '/_cat/nodes?v&format=json&h=node.role,name,version,uptime,ip,attr.data&s=node.role,ip',
    nodesDetailed: '/_nodes',
    clusterSettings: '/_cluster/settings?flat_settings',
    catHealth: '/_cat/health?v&format=json',
    flush: '/_flush'
  }
} as const;

export const apiHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

