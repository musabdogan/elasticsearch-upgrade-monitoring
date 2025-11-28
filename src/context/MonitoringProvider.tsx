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
  getRecovery,
  checkClusterHealth
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
  connectionFailed: boolean;
  lastUpdated: string | null;
  refresh: () => Promise<void>;
  retryConnection: () => Promise<void>;
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
  const [loading, setLoading] = useState(false); // Start with false so UI loads first
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionFailed, setConnectionFailed] = useState(false);
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
  const healthCheckDoneRef = useRef<boolean>(false); // Track if health check has been done
  const autoRetryIntervalRef = useRef<NodeJS.Timeout | null>(null); // Track auto-retry interval

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
        setRefreshing(false);
        setConnectionFailed(false);
        return;
      }
      
      // Skip if connection already failed - don't retry automatically
      if (connectionFailed) {
        return;
      }
      
      setRefreshing(true);
      setError(null);
      setConnectionFailed(false);
      
      // Use a ref to track if we've already done health check in this session
      // This prevents duplicate health check calls
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
        getClusterHealth(activeCluster), // This is needed for the snapshot data, not just health check
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
      setConnectionFailed(false); // Connection successful
    } catch (err) {
      let message = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // Normalize error messages - convert fetch/network errors to "Network error"
      if (message.toLowerCase().includes('fetch') && 
          (message.toLowerCase().includes('failed') || message.toLowerCase().includes('error'))) {
        message = 'Network error';
      }
      
      // Check if it's a timeout error
      const isTimeout = err instanceof Error && (
        err.name === 'AbortError' || 
        err.name === 'TimeoutError' ||
        message.toLowerCase().includes('timeout') ||
        message.toLowerCase().includes('aborted')
      );
      
      // If timeout, immediately do a health check
      if (isTimeout && activeCluster) {
        const healthResult = await checkClusterHealth(activeCluster);
        if (!healthResult.success) {
          setConnectionFailed(true);
          setError(healthResult.error || `Network error, cannot access your cluster. Cluster uri: ${activeCluster.baseUrl}`);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        // Health check passed, but original request timed out - show timeout error
        setError(message);
        setConnectionFailed(false);
      } else {
        // For network errors, show cluster URI
        if (message.toLowerCase().includes('network error') && activeCluster) {
          setError(`Network error, cannot access your cluster. Cluster uri: ${activeCluster.baseUrl}`);
        } else {
          setError(message);
        }
        setConnectionFailed(true);
      }
      
      // Only show toast for non-mock errors, or if it's a real connection issue
      if (!message.toLowerCase().includes('mock')) {
        toast.error('Data refresh failed', { description: message });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCluster, connectionFailed]);

  const retryConnection = useCallback(async () => {
    if (!activeCluster) {
      return;
    }
    
    // Clear any existing auto-retry interval
    if (autoRetryIntervalRef.current) {
      clearInterval(autoRetryIntervalRef.current);
      autoRetryIntervalRef.current = null;
    }
    
    // Reset health check flag when retrying
    healthCheckDoneRef.current = false;
    
    setLoading(true);
    setError(null);
    setConnectionFailed(false);
    
    // First check health
    const healthResult = await checkClusterHealth(activeCluster);
    
    if (!healthResult.success) {
      setConnectionFailed(true);
      setError(healthResult.error || `Network error, cannot access your cluster. Cluster uri: ${activeCluster.baseUrl}`);
      setLoading(false);
      
      // Start auto-retry every 1 minute (60000ms)
      autoRetryIntervalRef.current = setInterval(async () => {
        if (!activeCluster) {
          if (autoRetryIntervalRef.current) {
            clearInterval(autoRetryIntervalRef.current);
            autoRetryIntervalRef.current = null;
          }
          return;
        }
        
        const autoHealthResult = await checkClusterHealth(activeCluster);
        if (autoHealthResult.success) {
          // Health check passed, stop auto-retry and fetch data
          if (autoRetryIntervalRef.current) {
            clearInterval(autoRetryIntervalRef.current);
            autoRetryIntervalRef.current = null;
          }
          setConnectionFailed(false);
          healthCheckDoneRef.current = true;
          await fetchAll();
        }
      }, 60000); // 1 minute
      
      return;
    }
    
    // Health check passed, proceed with full data fetch
    setConnectionFailed(false);
    healthCheckDoneRef.current = true;
    await fetchAll();
  }, [activeCluster, fetchAll]);

  // Initial load: wait for UI to mount first, then do health check
  useEffect(() => {
    // Skip if health check already done for this cluster
    if (healthCheckDoneRef.current) {
      return;
    }
    
    // Use setTimeout to ensure UI renders first
    const timer = setTimeout(async () => {
      if (!activeCluster) {
        setError('Please add a cluster to start monitoring.');
        setConnectionFailed(false);
        return;
      }
      
      // Mark health check as done to prevent duplicate calls
      healthCheckDoneRef.current = true;
      
      // First, do a simple health check
      setLoading(true);
      setError(null);
      const healthResult = await checkClusterHealth(activeCluster);
      
      if (!healthResult.success) {
        setConnectionFailed(true);
        setError(healthResult.error || `Network error, cannot access your cluster. Cluster uri: ${activeCluster.baseUrl}`);
        setLoading(false);
        return;
      }
      
      // Health check passed, proceed with full data fetch
      setConnectionFailed(false);
      await fetchAll();
    }, 100); // Small delay to ensure UI renders first

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCluster]); // Only depend on activeCluster to avoid re-running when fetchAll changes

  // Polling: only start if connection is successful
  useEffect(() => {
    if (connectionFailed || !activeCluster) {
      return; // Don't poll if connection failed or no cluster
    }
    
    const interval = setInterval(() => {
      fetchAll();
    }, pollInterval);
    
    return () => clearInterval(interval);
  }, [fetchAll, pollInterval, connectionFailed, activeCluster]);

  // Cleanup auto-retry interval on unmount or cluster change
  useEffect(() => {
    return () => {
      if (autoRetryIntervalRef.current) {
        clearInterval(autoRetryIntervalRef.current);
        autoRetryIntervalRef.current = null;
      }
    };
  }, [activeCluster]);

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
      connectionFailed,
      lastUpdated: lastUpdatedRef.current,
      refresh: fetchAll,
      retryConnection,
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
        // Reset health check flag when switching clusters
        healthCheckDoneRef.current = false;
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
    connectionFailed,
    fetchAll,
    retryConnection,
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

