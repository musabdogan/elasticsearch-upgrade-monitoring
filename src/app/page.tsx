'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data/DataTable';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useMonitoring } from '@/context/MonitoringProvider';
import { formatNumber } from '@/utils/format';
import { getUpgradeOrderExplanation, calculateUpgradeOrder } from '@/utils/upgradeOrder';
import type { CatAllocationRow, NodeInfo } from '@/types/api';
import { useMemo, useState, useEffect } from 'react';
import { Settings, Info } from 'lucide-react';

const allocationFilters = [
  { label: 'All', value: 'all' },
  { label: 'Hot', value: 'hot' },
  { label: 'Warm', value: 'warm' },
  { label: 'Cold', value: 'cold' }
] as const;

type AllocationFilter = (typeof allocationFilters)[number]['value'];

export default function Home() {
  const {
    snapshot,
    error,
    connectionFailed,
    refresh,
    retryConnection,
    flushCluster,
    disableShardAllocation,
    stopShardRebalance,
    activeCluster
  } = useMonitoring();
  const [allocationFilter, setAllocationFilter] = useState<AllocationFilter>('all');
  const [settingsSearch, setSettingsSearch] = useState('');
  const [showRecoverySettings, setShowRecoverySettings] = useState(false);
  const [recoveryValue, setRecoveryValue] = useState('');
  const [isUpdatingRecovery, setIsUpdatingRecovery] = useState(false);
  const [showUpgradeOrderInfo, setShowUpgradeOrderInfo] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering client-side content after mount
  useEffect(() => {
    // Use requestAnimationFrame to ensure this runs after initial render
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);
  const [showCommandsInfo, setShowCommandsInfo] = useState(false);
  const [showCommandConfirm, setShowCommandConfirm] = useState<{
    type: 'flush' | 'disableAllocation' | 'stopRebalance';
    command: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showRecoverySettings) {
          setShowRecoverySettings(false);
        }
        if (showUpgradeOrderInfo) {
          setShowUpgradeOrderInfo(false);
        }
        if (showCommandsInfo) {
          setShowCommandsInfo(false);
        }
        if (showCommandConfirm) {
          setShowCommandConfirm(null);
        }
      }
    };

    if (showRecoverySettings || showUpgradeOrderInfo || showCommandsInfo || showCommandConfirm) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showRecoverySettings, showUpgradeOrderInfo, showCommandsInfo, showCommandConfirm]);

  const filteredAllocation = useMemo(() => {
    if (!snapshot) {
      return [];
    }
    if (allocationFilter === 'all') {
      return snapshot.allocation;
    }
    return snapshot.allocation.filter((row) =>
      row.node.toLowerCase().includes(allocationFilter)
    );
  }, [snapshot, allocationFilter]);

  const filteredSettings = useMemo(() => {
    if (!snapshot) {
      return [];
    }
    const entries = [
      ...Object.entries(snapshot.settings.persistent ?? {}).map(([key, value]) => ({
        scope: 'persistent',
        key,
        value: String(value)
      })),
      ...Object.entries(snapshot.settings.transient ?? {}).map(([key, value]) => ({
        scope: 'transient',
        key,
        value: String(value)
      }))
    ];

    if (!settingsSearch) {
      return entries;
    }

    return entries.filter(
      ({ key, value }) =>
        key.toLowerCase().includes(settingsSearch.toLowerCase()) ||
        value.toLowerCase().includes(settingsSearch.toLowerCase())
    );
  }, [snapshot, settingsSearch]);

  // Calculate sequential upgrade order for all nodes first
  const nodesWithSequentialOrder = useMemo(() => {
    if (!snapshot) {
      return [];
    }
    
    // Check if all nodes have the same version
    const versions = [...new Set(snapshot.nodes.map(n => n.version))];
    const allSameVersion = versions.length === 1;
    
    // If all same version, calculate upgrade order for all nodes
    // Pass null as highestVersion to skip version check and calculate order for all nodes
    if (allSameVersion) {
      const nodesWithOrder = snapshot.nodes.map(node => ({
        ...node,
        upgradeOrder: calculateUpgradeOrder(node, null)
      }));
      
      // Sort by upgrade order, then by uptime if upgrade order is the same
      const sortedNodes = nodesWithOrder.sort((a, b) => {
        if (a.upgradeOrder === null && b.upgradeOrder === null) return 0;
        if (a.upgradeOrder === null) return 1;
        if (b.upgradeOrder === null) return -1;
        
        const orderDiff = (a.upgradeOrder ?? 999) - (b.upgradeOrder ?? 999);
        if (orderDiff !== 0) return orderDiff;
        
        // If upgrade order is the same, sort by uptime (longer uptime first)
        const parseUptime = (uptime: string): number => {
          if (!uptime) return 0;
          const match = uptime.match(/^([\d.]+)([smhd])$/);
          if (!match) return 0;
          const value = parseFloat(match[1]);
          const unit = match[2];
          const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
          return value * (multipliers[unit] || 1);
        };
        
        const uptimeA = parseUptime(a.uptime || '0s');
        const uptimeB = parseUptime(b.uptime || '0s');
        return uptimeB - uptimeA; // Longer uptime first (descending)
      });
      
      // Calculate sequential upgrade numbers for all nodes
      let upgradeCounter = 0;
      return sortedNodes.map((node) => {
        if (node.upgradeOrder === null) {
          return { ...node, sequentialOrder: null };
        }
        upgradeCounter++;
        return { ...node, sequentialOrder: upgradeCounter };
      });
    }
    
    // Original logic for multiple versions
    // Sort all nodes: upgraded first, then by upgrade order, then by uptime
    const parseUptime = (uptime: string): number => {
      if (!uptime) return 0;
      const match = uptime.match(/^([\d.]+)([smhd])$/);
      if (!match) return 0;
      const value = parseFloat(match[1]);
      const unit = match[2];
      const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
      return value * (multipliers[unit] || 1);
    };
    
    const sortedNodes = [...snapshot.nodes].sort((a, b) => {
      // Upgraded nodes first
      if (a.upgradeOrder === null && b.upgradeOrder === null) return 0;
      if (a.upgradeOrder === null) return -1;
      if (b.upgradeOrder === null) return 1;
      // Then by upgrade order category
      const orderDiff = (a.upgradeOrder ?? 999) - (b.upgradeOrder ?? 999);
      if (orderDiff !== 0) return orderDiff;
      
      // If upgrade order is the same, sort by uptime (longer uptime first)
      const uptimeA = parseUptime(a.uptime || '0s');
      const uptimeB = parseUptime(b.uptime || '0s');
      return uptimeB - uptimeA; // Longer uptime first (descending)
    });

    // Calculate sequential upgrade numbers for all nodes
    let upgradeCounter = 0;
    return sortedNodes.map((node) => {
      if (node.upgradeOrder === null) {
        return { ...node, sequentialOrder: null };
      }
      upgradeCounter++;
      return { ...node, sequentialOrder: upgradeCounter };
    });
  }, [snapshot]);

  const nodesByVersion = useMemo(() => {
    if (!snapshot || nodesWithSequentialOrder.length === 0) {
      return {};
    }
    const grouped = nodesWithSequentialOrder.reduce((acc, node) => {
      const version = node.version || 'Unknown';
      if (!acc[version]) {
        acc[version] = [];
      }
      acc[version].push(node);
      return acc;
    }, {} as Record<string, Array<NodeInfo & { sequentialOrder: number | null }>>);
    
    // Sort nodes within each version group by sequential order, then by uptime
    const parseUptime = (uptime: string): number => {
      if (!uptime) return 0;
      const match = uptime.match(/^([\d.]+)([smhd])$/);
      if (!match) return 0;
      const value = parseFloat(match[1]);
      const unit = match[2];
      const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
      return value * (multipliers[unit] || 1);
    };
    
    // Sort each version group
    Object.keys(grouped).forEach(version => {
      grouped[version].sort((a, b) => {
        // First by sequential order
        if (a.sequentialOrder === null && b.sequentialOrder === null) return 0;
        if (a.sequentialOrder === null) return 1;
        if (b.sequentialOrder === null) return -1;
        const orderDiff = (a.sequentialOrder ?? 999) - (b.sequentialOrder ?? 999);
        if (orderDiff !== 0) return orderDiff;
        
        // If sequential order is the same, sort by uptime (longer uptime first)
        const uptimeA = parseUptime(a.uptime || '0s');
        const uptimeB = parseUptime(b.uptime || '0s');
        return uptimeB - uptimeA; // Longer uptime first (descending)
      });
    });
    
    return grouped;
  }, [snapshot, nodesWithSequentialOrder]);

  const recoveryTargetStats = useMemo(() => {
    if (!snapshot || snapshot.recovery.length === 0) {
      return { targets: [] };
    }
    // Group shards by target
    const targetMap = new Map<string, number>();
    snapshot.recovery.forEach((r) => {
      const target = r.target || r.targetNode;
      if (target) {
        targetMap.set(target, (targetMap.get(target) || 0) + 1);
      }
    });
    // Convert to array of { target, count } and sort by count descending
    const targets = Array.from(targetMap.entries())
      .map(([target, count]) => ({ target, count }))
      .sort((a, b) => b.count - a.count);
    return { targets };
  }, [snapshot]);

  const nodeVersionStats = useMemo(() => {
    if (!snapshot || snapshot.nodes.length === 0) {
      return { upgraded: 0, left: 0, highestVersion: null, remainingVersions: [] as string[] };
    }

    const versions = Object.keys(nodesByVersion);
    if (versions.length === 0) {
      return { upgraded: 0, left: 0, highestVersion: null, remainingVersions: [] as string[] };
    }

    const parsedVersions = versions
      .map((v) => ({ version: v, parts: v.split('.').map(Number) }))
      .filter((v) => !v.parts.some((part) => Number.isNaN(part)));

    if (parsedVersions.length === 0) {
      return {
        upgraded: 0,
        left: snapshot.nodes.length,
        highestVersion: null,
        remainingVersions: versions
      };
    }

    parsedVersions.sort((a, b) => {
      for (let i = 0; i < Math.max(a.parts.length, b.parts.length); i++) {
        const diff = (b.parts[i] || 0) - (a.parts[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });

    const highestVersion = parsedVersions[0].version;
    
    // If there's only one version, all nodes should be in "left" category
    if (versions.length === 1) {
      return { 
        upgraded: 0, 
        left: snapshot.nodes.length, 
        highestVersion: null, 
        remainingVersions: versions 
      };
    }
    
    const upgradedCount = nodesByVersion[highestVersion]?.length || 0;
    const leftCount = snapshot.nodes.length - upgradedCount;
    const remainingVersions = versions.filter((version) => version !== highestVersion);

    return { upgraded: upgradedCount, left: leftCount, highestVersion, remainingVersions };
  }, [snapshot, nodesByVersion]);

  // Always render UI first, API calls happen in background
  const backgroundClass = snapshot?.health.status === 'red'
    ? 'bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 dark:from-red-950 dark:via-rose-950 dark:to-pink-950'
    : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900';

  return (
    <main className={`mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 ${backgroundClass} min-h-screen`}>
      <PageHeader />

      {error && !activeCluster ? (
        <div className="rounded-lg border-2 border-gray-300 bg-white p-6 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-700 dark:text-gray-300">{error}</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Use the cluster selector in the header to add your first cluster.
          </p>
        </div>
      ) : connectionFailed && error ? (
        <div className="rounded-lg border-2 border-red-300 bg-red-50 p-6 text-center shadow-lg dark:border-red-700 dark:bg-red-900/20">
          <p className="text-lg font-semibold text-red-800 dark:text-red-200">{error}</p>
          <button
            type="button"
            onClick={retryConnection}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Reload
          </button>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : null}

      {snapshot && !connectionFailed ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div
              className={`flex h-32 flex-col justify-center rounded-lg px-6 py-3 text-center shadow-lg ${
                snapshot.health.status === 'green'
                  ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                  : snapshot.health.status === 'yellow'
                    ? 'bg-gradient-to-br from-amber-500 to-yellow-600'
                    : snapshot.health.status === 'red'
                      ? 'bg-gradient-to-br from-red-600 to-rose-700'
                      : 'bg-gradient-to-br from-gray-500 to-gray-600'
              }`}
            >
              <div className="mb-1 text-3xl font-bold uppercase tracking-wider text-white">
                {snapshot.health.status}
              </div>
              <div className="text-xs font-medium uppercase tracking-wide text-white/80">
                Cluster Status
              </div>
              {snapshot.health.status !== 'green' && (
                <div className="mt-2 rounded-lg bg-white/20 px-2 py-1 text-[10px] font-semibold text-white">
                  Wait until cluster back to GREEN for the next node upgrade!
                </div>
              )}
            </div>
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 px-6 py-4 text-center shadow-lg">
              <div className="text-3xl font-bold text-white">
                {formatNumber(snapshot.health.unassigned_shards)}
              </div>
              <div className="mt-1 text-sm font-medium text-amber-100">Unassigned Shards</div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 px-6 py-4 text-center shadow-lg relative">
              <button
                type="button"
                onClick={() => {
                  const currentValue = snapshot.settings.transient?.['cluster.routing.allocation.node_initial_primaries_recoveries'] ||
                    snapshot.settings.persistent?.['cluster.routing.allocation.node_initial_primaries_recoveries'] ||
                    '4';
                  setRecoveryValue(String(currentValue));
                  setShowRecoverySettings(true);
                }}
                className="absolute top-2 right-2 rounded p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
                title="Recovery Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              <div className="text-3xl font-bold text-white">
                {formatNumber(snapshot.recovery.length)}
              </div>
              <div className="mt-1 text-sm font-medium text-blue-100">Active Recovery</div>
              {recoveryTargetStats.targets.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {recoveryTargetStats.targets.map((item) => (
                    <div key={item.target} className="text-xs text-blue-200">
                      {formatNumber(item.count)} shards allocation to {item.target}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 px-6 py-4 text-center shadow-lg">
              <div className="text-3xl font-bold text-white">
                {formatNumber(snapshot.health.number_of_nodes)} nodes
              </div>
              <div className="mt-1 space-y-0.5 text-xs text-indigo-100">
                {nodeVersionStats.upgraded > 0 && (
                  <div>
                    {nodeVersionStats.upgraded} node
                    {nodeVersionStats.upgraded !== 1 ? 's' : ''} upgraded
                    {nodeVersionStats.highestVersion && ` (${nodeVersionStats.highestVersion})`}
                  </div>
                )}
                {nodeVersionStats.left > 0 && (
                  <div>
                    {nodeVersionStats.left} node
                    {nodeVersionStats.left !== 1 ? 's' : ''}
                    {nodeVersionStats.remainingVersions.length > 0 &&
                      ` (${nodeVersionStats.remainingVersions.join(', ')})`}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-12">
            <div className="flex h-[500px] flex-col rounded-xl border-2 border-gray-300 bg-gradient-to-br from-white to-indigo-50 p-3 shadow-lg dark:from-gray-800 dark:to-indigo-900/20 dark:border-gray-600 lg:col-span-7">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Node Matrix
                </h2>
                <button
                  type="button"
                  onClick={() => setShowUpgradeOrderInfo(true)}
                  className="inline-flex items-center justify-center rounded border border-gray-300 bg-white p-1.5 text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  title="Upgrade Order Info"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto">
                {Object.entries(nodesByVersion).map(([version, nodes]) => {
                  return (
                    <div key={version} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Version {version}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({nodes.length} node{nodes.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <DataTable
                        data={nodes as Array<NodeInfo & { sequentialOrder: number | null }>}
                        columns={[
                          {
                            key: 'sequentialOrder',
                            header: 'Upgrade Order',
                            render: (node: NodeInfo & { sequentialOrder: number | null }) => {
                              // If sequentialOrder is null, show "Upgraded" (only when there are multiple versions)
                              const versions = Object.keys(nodesByVersion);
                              const allSameVersion = versions.length === 1;
                              
                              if (node.sequentialOrder === null && !allSameVersion) {
                                return (
                                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Upgraded
                                  </span>
                                );
                              }
                              
                              // If all same version or sequentialOrder exists, show order number
                              if (node.sequentialOrder === null) {
                                // This shouldn't happen if allSameVersion, but just in case
                                return (
                                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                                    -
                                  </span>
                                );
                              }
                              
                              const label = node.sequentialOrder === 1 
                                ? '1 - Upgrade me!' 
                                : String(node.sequentialOrder);
                              return (
                                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                  {label}
                                </span>
                              );
                            }
                          },
                          {
                            key: 'nodeRole',
                            header: 'Role',
                            render: (node: NodeInfo & { sequentialOrder: number | null }) => (
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {node.nodeRole}
                              </span>
                            )
                          },
                          { key: 'name', header: 'Name' },
                          { key: 'ip', header: 'IP' },
                          { key: 'uptime', header: 'Uptime', align: 'right' }
                        ]}
                        dense
                        noHorizontalScroll
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex h-[500px] flex-col rounded-xl border-2 border-gray-300 bg-gradient-to-br from-white to-purple-50 p-3 shadow-lg dark:from-gray-800 dark:to-purple-900/20 dark:border-gray-600 lg:col-span-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Allocation & Disk
                </h2>
                <select
                  value={allocationFilter}
                  onChange={(event) => setAllocationFilter(event.target.value as AllocationFilter)}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  {allocationFilters.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <DataTable<CatAllocationRow>
                    data={filteredAllocation}
                    columns={[
                      { key: 'node', header: 'Node' },
                      { key: 'ip', header: 'IP' },
                      { key: 'shards', header: 'Shards', align: 'right' },
                      { key: 'diskAvail', header: 'Disk Free', align: 'right' }
                    ]}
                    dense
                  />
                </div>
                <div className="flex-shrink-0 rounded-xl border-2 border-gray-300 bg-gradient-to-br from-white to-emerald-50 p-2 shadow-lg dark:from-gray-800 dark:to-emerald-900/20 dark:border-gray-600">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        Ready to Use Commands
                      </h2>
                      <p className="mt-0.5 text-[9px] text-gray-600 dark:text-gray-400">
                        Quick actions for cluster management
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCommandsInfo(true)}
                      className="inline-flex items-center justify-center rounded border border-gray-300 bg-white p-0.5 text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      title="Commands Info"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCommandConfirm({
                          type: 'flush',
                          command: 'POST /_flush',
                          description: 'Forces a flush of one or more indices, writing data from memory to disk and clearing the transaction log. This makes data persistent and optimizes memory usage.',
                          action: flushCluster
                        });
                      }}
                      className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-blue-800 hover:shadow-lg active:from-blue-800 active:to-blue-900"
                    >
                      Flush Cluster
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCommandConfirm({
                          type: 'disableAllocation',
                          command: 'PUT /_cluster/settings\n{\n  "persistent": {\n    "cluster.routing.allocation.enable": "primaries"\n  }\n}',
                          description: 'Disables shard allocation for primary shards. Only primary shards will be allocated, replica shards will not be allocated.',
                          action: disableShardAllocation
                        });
                      }}
                      className="rounded-lg bg-gradient-to-r from-orange-600 to-orange-700 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md transition hover:from-orange-700 hover:to-orange-800 hover:shadow-lg active:from-orange-800 active:to-orange-900"
                    >
                      Disable shard allocation for primary shards
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCommandConfirm({
                          type: 'stopRebalance',
                          command: 'PUT /_cluster/settings\n{\n  "persistent": {\n    "cluster.routing.rebalance.enable": "none"\n  }\n}',
                          description: 'Disables shard rebalancing across nodes. No shards will be rebalanced until this setting is changed.',
                          action: stopShardRebalance
                        });
                      }}
                      className="rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md transition hover:from-red-700 hover:to-red-800 hover:shadow-lg active:from-red-800 active:to-red-900"
                    >
                      Disable shard rebalance
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex h-[450px] flex-col rounded-xl border-2 border-gray-300 bg-gradient-to-br from-white to-amber-50 p-3 shadow-lg dark:from-gray-800 dark:to-amber-900/20 dark:border-gray-600">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Shard Recovery Status
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <DataTable
                data={snapshot.recovery}
                columns={[
                  { key: 'index', header: 'Index', className: 'font-mono text-xs' },
                  { key: 'stage', header: 'Stage', className: 'font-mono text-xs' },
                  { key: 'sourceNode', header: 'Source', className: 'font-mono text-xs' },
                  { key: 'targetNode', header: 'Target', className: 'font-mono text-xs' },
                  { key: 'filesPercent', header: 'Files %', align: 'right', className: 'font-mono text-xs' },
                  { key: 'bytesPercent', header: 'Bytes %', align: 'right', className: 'font-mono text-xs' },
                  { key: 'time', header: 'Time', align: 'right', className: 'font-mono text-xs' }
                ]}
                dense
              />
            </div>
          </section>

          <section className="flex h-[450px] flex-col rounded-xl border-2 border-gray-300 bg-gradient-to-br from-white to-slate-50 p-3 shadow-lg dark:from-gray-800 dark:to-slate-900/20 dark:border-gray-600">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Cluster Settings
              </h2>
              <div className="ml-auto flex max-w-xs flex-1 items-center gap-2 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 dark:border-gray-600 dark:bg-gray-700">
                <input
                  type="search"
                  placeholder="Search settings..."
                  value={settingsSearch}
                  onChange={(event) => setSettingsSearch(event.target.value)}
                  className="w-full bg-transparent text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <DataTable
                data={filteredSettings}
                columns={[
                  { key: 'scope', header: 'Scope' },
                  { key: 'key', header: 'Key', className: 'font-mono text-xs' },
                  { key: 'value', header: 'Value', className: 'font-mono text-xs' }
                ]}
                dense
                emptyMessage="No settings found"
              />
            </div>
          </section>

          {/* Command Confirmation Modal */}
          {showCommandConfirm && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setShowCommandConfirm(null)}
            >
              <div 
                className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Confirm Command Execution
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCommandConfirm(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Close"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-2 text-xs font-semibold text-gray-900 dark:text-gray-100">
                      Command
                    </h4>
                    <pre className="rounded-lg bg-gray-50 p-3 text-[10px] text-gray-800 dark:bg-gray-900 dark:text-gray-200 font-mono whitespace-pre-wrap">
                      {showCommandConfirm.command}
                    </pre>
                  </div>
                  <div>
                    <h4 className="mb-2 text-xs font-semibold text-gray-900 dark:text-gray-100">
                      Description
                    </h4>
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      {showCommandConfirm.description}
          </p>
        </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCommandConfirm(null)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await showCommandConfirm.action();
                        setShowCommandConfirm(null);
                      }}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                      Execute
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Commands Info Modal */}
          {showCommandsInfo && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setShowCommandsInfo(false)}
            >
              <div 
                className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Ready to Use Commands - API Commands
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCommandsInfo(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Close"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Flush Cluster
                    </h4>
                    <pre className="rounded-lg bg-gray-50 p-4 text-xs text-gray-800 dark:bg-gray-900 dark:text-gray-200 font-mono">
{`POST /_flush`}
                    </pre>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Disable shard allocation for primary shards
                    </h4>
                    <pre className="rounded-lg bg-gray-50 p-4 text-xs text-gray-800 dark:bg-gray-900 dark:text-gray-200 font-mono whitespace-pre-wrap">
{`PUT /_cluster/settings
{
  "persistent": {
    "cluster.routing.allocation.enable": "primaries"
  }
}`}
                    </pre>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Disable shard rebalance
                    </h4>
                    <pre className="rounded-lg bg-gray-50 p-4 text-xs text-gray-800 dark:bg-gray-900 dark:text-gray-200 font-mono whitespace-pre-wrap">
{`PUT /_cluster/settings
{
  "persistent": {
    "cluster.routing.rebalance.enable": "none"
  }
}`}
                    </pre>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCommandsInfo(false)}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upgrade Order Info Modal */}
          {showUpgradeOrderInfo && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setShowUpgradeOrderInfo(false)}
            >
              <div 
                className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Upgrade Order Explanation
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowUpgradeOrderInfo(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Close"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-800 dark:bg-gray-900 dark:text-gray-200 font-mono">
                    {getUpgradeOrderExplanation()}
                  </pre>
                  <div className="flex items-center justify-between">
                    <a
                      href="https://www.elastic.co/docs/deploy-manage/upgrade/deployment-or-cluster/elasticsearch#es-nodes-upgrade-order"
            target="_blank"
            rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                    >
                      Elasticsearch nodes upgrade order
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowUpgradeOrderInfo(false)}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showRecoverySettings && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setShowRecoverySettings(false)}
            >
              <div 
                className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Recovery Settings
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowRecoverySettings(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Close"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-900/20 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                    Changing this setting affects cluster recovery performance. Higher values increase recovery speed but may impact cluster stability. Default is typically 4.
                  </p>
                  <a
                    href="https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/cluster-level-shard-allocation-routing-settings"
            target="_blank"
            rel="noopener noreferrer"
                    className="text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 underline inline-flex items-center gap-1"
                  >
                    Official Documentation
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!snapshot || !activeCluster) return;

                    const value = Number.parseInt(recoveryValue, 10);
                    if (Number.isNaN(value) || value < 1 || value > 100) {
                      alert('Please enter a valid number between 1 and 100');
                      return;
                    }

                    setIsUpdatingRecovery(true);
                    try {
                      const response = await fetch('/api/elasticsearch', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          baseUrl: activeCluster.baseUrl,
                          username: activeCluster.username || '',
                          password: activeCluster.password || '',
                          method: 'PUT',
                          customPath: '/_cluster/settings',
                          body: JSON.stringify({
                            transient: {
                              'cluster.routing.allocation.node_initial_primaries_recoveries': value
                            }
                          })
                        }),
                        cache: 'no-store'
                      });

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || 'Failed to update setting');
                      }

                      alert('Recovery setting updated successfully!');
                      setShowRecoverySettings(false);
                      refresh();
                    } catch (error) {
                      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    } finally {
                      setIsUpdatingRecovery(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      node_initial_primaries_recoveries
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={recoveryValue}
                      onChange={(e) => setRecoveryValue(e.target.value)}
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="4"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Default: 4
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isUpdatingRecovery}
                      className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdatingRecovery ? 'Updating...' : 'Update Setting'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRecoverySettings(false)}
                      className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
        </div>
          )}
        </>
      ) : null}
      
      {!connectionFailed && !snapshot && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {mounted && activeCluster ? 'No data available. Please wait for data to load...' : 'Please add a cluster to start monitoring'}
            </p>
          </div>
        </div>
      )}
      </main>
  );
}

