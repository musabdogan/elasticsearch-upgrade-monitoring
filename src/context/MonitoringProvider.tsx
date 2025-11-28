'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { toast } from 'sonner';
import { apiConfig } from '@/config/api';
import {
  flushCluster,
  disableShardAllocation,
  stopShardRebalance,
  getAllocation,
  getCatHealth,
  getClusterHealth,
  getClusterSettings,
  getNodes,
  getRecovery
} from '@/services/elasticsearch';
import type {
  CatHealthRow,
  ClusterStatus,
  MonitoringSnapshot
} from '@/types/api';
import type { ClusterConnection, CreateClusterInput } from '@/types/app';
import { getStoredValue, setStoredValue } from '@/utils/storage';

const POLL_STORAGE_KEY = 'eum/poll-interval';
const CLUSTERS_STORAGE_KEY = 'eum/clusters';
const ACTIVE_CLUSTER_KEY = 'eum/active-cluster';

type MonitoringContextValue = {
  snapshot: MonitoringSnapshot | null;
  healthHistory: CatHealthRow[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: string | null;
  refresh: () => Promise<void>;
  pollInterval: number;
  setPollInterval: (ms: number) => void;
  statusSummary: Record<ClusterStatus, number>;
  clusters: ClusterConnection[];
  activeCluster: ClusterConnection | null;
  setActiveCluster: (clusterId: string) => void;
  addCluster: (input: CreateClusterInput) => void;
  updateCluster: (clusterId: string, input: CreateClusterInput) => void;
  deleteCluster: (clusterId: string) => void;
  flushCluster: () => Promise<void>;
  disableShardAllocation: () => Promise<void>;
  stopShardRebalance: () => Promise<void>;
};

const MonitoringContext = createContext<MonitoringContextValue | undefined>(
  undefined
);

function mergeHealthHistory(
  prev: CatHealthRow[],
  incoming: CatHealthRow[]
): CatHealthRow[] {
  const merged = new Map<string, CatHealthRow>();

  [...prev, ...incoming].forEach((item) => {
    merged.set(item.timestamp, item);
  });

  return Array.from(merged.values())
    .sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    .slice(-40);
}

export function MonitoringProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<MonitoringSnapshot | null>(null);
  const [healthHistory, setHealthHistory] = useState<CatHealthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollInterval, setPollIntervalState] = useState(() =>
    getStoredValue(POLL_STORAGE_KEY, apiConfig.pollIntervalMs)
  );
  const [clusters, setClusters] = useState<ClusterConnection[]>(() =>
    getStoredValue(CLUSTERS_STORAGE_KEY, [] as ClusterConnection[])
  );
  const [activeClusterId, setActiveClusterId] = useState(() =>
    getStoredValue<string>(ACTIVE_CLUSTER_KEY, '')
  );
  const lastUpdatedRef = useRef<string | null>(null);

  const activeCluster =
    clusters.find((cluster) => cluster.id === activeClusterId) ?? clusters[0] ?? null;

  useEffect(() => {
    setStoredValue(CLUSTERS_STORAGE_KEY, clusters);
  }, [clusters]);

  useEffect(() => {
    if (activeCluster) {
      setStoredValue(ACTIVE_CLUSTER_KEY, activeCluster.id);
    } else {
      setStoredValue(ACTIVE_CLUSTER_KEY, '');
    }
  }, [activeCluster]);

  const fetchAll = useCallback(async () => {
    try {
      if (!activeCluster) {
        setError('Please add a cluster to start monitoring.');
        setLoading(false);
        return;
      }
      setRefreshing(true);
      setError(null);
      const [
        allocation,
        recovery,
        health,
        nodes,
        settings,
        catHealth
      ] = await Promise.all([
        getAllocation(activeCluster),
        getRecovery(activeCluster),
        getClusterHealth(activeCluster),
        getNodes(activeCluster),
        getClusterSettings(activeCluster),
        getCatHealth(activeCluster)
      ]);

      const fetchedAt = new Date().toISOString();
      lastUpdatedRef.current = fetchedAt;

      setSnapshot({
        allocation,
        recovery,
        health,
        nodes,
        settings,
        catHealth,
        fetchedAt
      });
      setHealthHistory((prev) => mergeHealthHistory(prev, catHealth));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      // Only show toast for non-mock errors, or if it's a real connection issue
      if (!message.toLowerCase().includes('mock')) {
        toast.error('Data refresh failed', { description: message });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCluster]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const interval = setInterval(fetchAll, pollInterval);
    return () => clearInterval(interval);
  }, [fetchAll, pollInterval]);

  const addCluster = useCallback((input: CreateClusterInput) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `cluster-${Math.random().toString(36).slice(2, 8)}`;
    const sanitizedBaseUrl = input.baseUrl.trim().replace(/\/$/, '');
    const newCluster: ClusterConnection = {
      id,
      label: input.label || sanitizedBaseUrl,
      baseUrl: sanitizedBaseUrl,
      username: input.username?.trim() || '',
      password: input.password?.trim() || ''
    };
    setClusters((prev) => [...prev, newCluster]);
    setActiveClusterId(id);
    toast.success('Cluster added', {
      description: `${newCluster.label} is now active.`
    });
  }, []);

  const updateCluster = useCallback((clusterId: string, input: CreateClusterInput) => {
    setClusters((prev) =>
      prev.map((cluster) => {
        if (cluster.id === clusterId) {
          const sanitizedBaseUrl = input.baseUrl.trim().replace(/\/$/, '');
          return {
            ...cluster,
            label: input.label || sanitizedBaseUrl,
            baseUrl: sanitizedBaseUrl,
            username: input.username?.trim() || '',
            password: input.password?.trim() || ''
          };
        }
        return cluster;
      })
    );
    toast.success('Cluster updated', {
      description: 'Cluster configuration has been saved.'
    });
  }, []);

  const deleteCluster = useCallback(
    (clusterId: string) => {
      const clusterToDelete = clusters.find((c) => c.id === clusterId);
      if (clusters.length === 1) {
        toast.error('Cannot delete', {
          description: 'At least one cluster must remain.'
        });
        return;
      }
      setClusters((prev) => prev.filter((c) => c.id !== clusterId));
      if (activeClusterId === clusterId) {
        const remaining = clusters.filter((c) => c.id !== clusterId);
        setActiveClusterId(remaining[0]?.id ?? '');
      }
      toast.success('Cluster deleted', {
        description: clusterToDelete ? `${clusterToDelete.label} has been removed.` : undefined
      });
    },
    [clusters, activeClusterId]
  );

  const handleFlushCluster = useCallback(async () => {
    if (!activeCluster) {
      toast.error('No active cluster', { description: 'Please select a cluster first.' });
      return;
    }

    try {
      await flushCluster(activeCluster);
      toast.success('Flush completed', { description: 'Cluster has been flushed successfully.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Flush failed';
      toast.error('Flush failed', { description: message });
    }
  }, [activeCluster]);

  const handleDisableShardAllocation = useCallback(async () => {
    if (!activeCluster) {
      toast.error('No active cluster', { description: 'Please select a cluster first.' });
      return;
    }
    try {
      await disableShardAllocation(activeCluster);
      toast.success('Shard allocation disabled', { description: 'Primary shard allocation has been disabled.' });
      fetchAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disable shard allocation';
      toast.error('Failed', { description: message });
    }
  }, [activeCluster, fetchAll]);

  const handleStopShardRebalance = useCallback(async () => {
    if (!activeCluster) {
      toast.error('No active cluster', { description: 'Please select a cluster first.' });
      return;
    }
    try {
      await stopShardRebalance(activeCluster);
      toast.success('Shard rebalance stopped', { description: 'Shard rebalancing has been disabled.' });
      fetchAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stop shard rebalance';
      toast.error('Failed', { description: message });
    }
  }, [activeCluster, fetchAll]);

  const value = useMemo<MonitoringContextValue>(() => {
    const statusSummary: Record<ClusterStatus, number> = {
      green: 0,
      yellow: 0,
      red: 0,
      unknown: 0
    };

    healthHistory.forEach((row) => {
      statusSummary[row.status] = statusSummary[row.status] + 1;
    });

    return {
      snapshot,
      healthHistory,
      loading,
      refreshing,
      error,
      lastUpdated: lastUpdatedRef.current,
      refresh: fetchAll,
      pollInterval,
      setPollInterval: (ms: number) => {
        const safeValue = Math.min(Math.max(ms, 3000), 60000);
        setPollIntervalState(safeValue);
        setStoredValue(POLL_STORAGE_KEY, safeValue);
      },
      statusSummary,
      clusters,
      activeCluster,
      setActiveCluster: (clusterId: string) => {
        setActiveClusterId(clusterId);
      },
      addCluster,
      updateCluster,
      deleteCluster,
      flushCluster: handleFlushCluster,
      disableShardAllocation: handleDisableShardAllocation,
      stopShardRebalance: handleStopShardRebalance
    };
  }, [
    snapshot,
    healthHistory,
    loading,
    refreshing,
    error,
    fetchAll,
    pollInterval,
    clusters,
    activeCluster,
    addCluster,
    updateCluster,
    deleteCluster,
    handleFlushCluster,
    handleDisableShardAllocation,
    handleStopShardRebalance
  ]);

  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoring() {
  const ctx = useContext(MonitoringContext);
  if (!ctx) {
    throw new Error('useMonitoring must be used within MonitoringProvider');
  }
  return ctx;
}

