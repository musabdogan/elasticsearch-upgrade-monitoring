import { apiConfig } from '@/config/api';
import type {
  CatAllocationRow,
  CatHealthRow,
  ClusterHealth,
  ClusterSettings,
  NodeInfo,
  RecoveryRow
} from '@/types/api';
import type { ClusterConnection } from '@/types/app';
import { calculateUpgradeOrder } from '@/utils/upgradeOrder';
import { getHighestVersion } from '@/utils/version';

type EndpointKey = keyof typeof apiConfig.endpoints;

const mockLoaders: Record<EndpointKey, () => Promise<unknown>> = {
  allocation: () => import('@/data/mock/allocation').then((m) => m.default),
  recovery: () => import('@/data/mock/recovery').then((m) => m.default),
  clusterHealth: () => import('@/data/mock/clusterHealth').then((m) => m.default),
  nodes: () => import('@/data/mock/nodes').then((m) => m.default),
  nodesDetailed: () => Promise.resolve({ nodes: {} }),
  clusterSettings: () =>
    import('@/data/mock/clusterSettings').then((m) => m.default),
  catHealth: () => import('@/data/mock/catHealth').then((m) => m.default)
};

async function simulateLatency() {
  const latency = Math.floor(Math.random() * 1800) + 200;
  await new Promise((resolve) => setTimeout(resolve, latency));
}

async function requestFromApi<T>(
  endpoint: EndpointKey,
  cluster: ClusterConnection,
  attempt = 1
): Promise<T> {
  try {
    // Use Next.js API route as proxy to avoid CORS issues
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), apiConfig.requestTimeoutMs);
    
    try {
      const response = await fetch('/api/elasticsearch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint,
          baseUrl: cluster.baseUrl,
          username: cluster.username,
          password: cluster.password
        }),
        cache: 'no-store',
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: string;
          details?: string;
        };
        throw new Error(
          errorData.error ||
            `Elasticsearch ${response.status} ${response.statusText} (${endpoint})`
        );
      }

      const data = (await response.json()) as T;
      return data;
    } catch (fetchError) {
      clearTimeout(timeout);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      // Convert fetch errors to network error
      if (fetchError instanceof TypeError || 
          (fetchError instanceof Error && (
            fetchError.message.toLowerCase().includes('fetch') ||
            fetchError.message.toLowerCase().includes('network') ||
            fetchError.message.toLowerCase().includes('failed')
          ))) {
        throw new Error('Network error');
      }
      throw fetchError;
    }
  } catch (error) {
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      return requestFromApi<T>(endpoint, cluster, attempt + 1);
    }
    // Convert generic errors to network error if they look like network issues
    if (error instanceof TypeError || 
        (error instanceof Error && (
          error.message.toLowerCase().includes('fetch') ||
          error.message.toLowerCase().includes('network') ||
          error.message.toLowerCase().includes('failed')
        ))) {
      throw new Error('Network error');
    }
    throw error;
  }
}

async function request<T>(key: EndpointKey, cluster: ClusterConnection): Promise<T> {
  if (apiConfig.useMock) {
    await simulateLatency();
    const loader = mockLoaders[key];
    const data = (await loader()) as T;
    // Reduced error rate from 5% to 0.5% for less frequent interruptions
    if (Math.random() < 0.005) {
      throw new Error('Mock error simulation');
    }
    return data;
  }

  return requestFromApi<T>(key, cluster);
}

export async function getAllocation(
  cluster: ClusterConnection
): Promise<CatAllocationRow[]> {
  const data = await request<
    Array<{
      shards: string | number;
      'disk.avail': string;
      node: string;
      ip?: string;
    }>
  >('allocation', cluster);
  
  return data.map((row) => ({
    shards: typeof row.shards === 'string' ? Number.parseInt(row.shards, 10) : row.shards,
    diskAvail: row['disk.avail'] || 'N/A',
    node: row.node,
    ip: row.ip
  }));
}

export async function getRecovery(cluster: ClusterConnection): Promise<RecoveryRow[]> {
  const data = await request<
    Array<{
      index: string;
      shard: string;
      time: string;
      source_node: string;
      target_node: string;
      target: string;
      fp: string;
      bp: string;
      stage: string;
      translog: string;
      bytes_percent: string;
    }>
  >('recovery', cluster);
  
  return data.map((row) => ({
    index: row.index,
    shard: row.shard,
    time: row.time,
    sourceNode: row.source_node,
    targetNode: row.target_node,
    target: row.target || row.target_node || '',
    filesPercent: row.fp || '0%',
    bytesPercent: row.bytes_percent || row.bp || '0%',
    stage: row.stage,
    translog: row.translog
  }));
}

export async function getClusterHealth(
  cluster: ClusterConnection
): Promise<ClusterHealth> {
  return request<ClusterHealth>('clusterHealth', cluster);
}

/**
 * Simple health check to verify cluster connectivity
 * Returns true if cluster is reachable, false otherwise
 */
export async function checkClusterHealth(
  cluster: ClusterConnection
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use a simple GET request to /_cluster/health endpoint
    const response = await fetch('/api/elasticsearch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: 'clusterHealth',
        baseUrl: cluster.baseUrl,
        username: cluster.username,
        password: cluster.password
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(1000) // 1 second timeout for health check
    });

    if (response.ok) {
      return { success: true };
    }

    // Response not OK
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: string;
      details?: string;
    };
    return {
      success: false,
      error: errorData.error || `Elasticsearch ${response.status} ${response.statusText}`
    };
  } catch {
    // Network error, timeout, or other connection issue
    return {
      success: false,
      error: `Network error, cannot access your cluster. Cluster uri: ${cluster.baseUrl}`
    };
  }
}

export async function getNodes(cluster: ClusterConnection): Promise<NodeInfo[]> {
  const catNodesData = await request<
    Array<{
      'node.role': string;
      name: string;
      ip?: string;
      version: string;
      uptime: string;
    }>
  >('nodes', cluster);

  // Get all versions to find the highest
  const versions = catNodesData.map((row) => row.version).filter(Boolean);
  const highestVersion = getHighestVersion(versions);

  return catNodesData.map((row) => {
    const nodeInfo: NodeInfo = {
      nodeRole: row['node.role'],
      name: row.name,
      ip: row.ip,
      version: row.version,
      uptime: row.uptime
    };

    // Calculate upgrade order (only for nodes that need upgrading)
    nodeInfo.upgradeOrder = calculateUpgradeOrder(nodeInfo, highestVersion);

    return nodeInfo;
  });
}

export async function getClusterSettings(
  cluster: ClusterConnection
): Promise<ClusterSettings> {
  return request<ClusterSettings>('clusterSettings', cluster);
}

export async function getCatHealth(
  cluster: ClusterConnection
): Promise<CatHealthRow[]> {
  return request<CatHealthRow[]>('catHealth', cluster);
}

export async function flushCluster(cluster: ClusterConnection): Promise<{ flushed: boolean }> {
  try {
    const response = await fetch('/api/elasticsearch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        baseUrl: cluster.baseUrl,
        username: cluster.username,
        password: cluster.password,
        method: 'POST',
        customPath: '/_flush'
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: string;
      };
      throw new Error(
        errorData.error || `Flush failed: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as { flushed?: boolean };
    return { flushed: data.flushed ?? true };
  } catch (error) {
    throw error;
  }
}

export async function disableShardAllocation(cluster: ClusterConnection): Promise<void> {
  try {
    const response = await fetch('/api/elasticsearch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        baseUrl: cluster.baseUrl,
        username: cluster.username,
        password: cluster.password,
        method: 'PUT',
        customPath: '/_cluster/settings',
        body: JSON.stringify({
          persistent: {
            'cluster.routing.allocation.enable': 'primaries'
          }
        })
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: string;
      };
      throw new Error(
        errorData.error || `Disable shard allocation failed: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    throw error;
  }
}

export async function stopShardRebalance(cluster: ClusterConnection): Promise<void> {
  try {
    const response = await fetch('/api/elasticsearch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        baseUrl: cluster.baseUrl,
        username: cluster.username,
        password: cluster.password,
        method: 'PUT',
        customPath: '/_cluster/settings',
        body: JSON.stringify({
          persistent: {
            'cluster.routing.rebalance.enable': 'none'
          }
        })
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: string;
      };
      throw new Error(
        errorData.error || `Stop shard rebalance failed: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    throw error;
  }
}

