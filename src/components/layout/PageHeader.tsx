'use client';

import { ExternalLink, RefreshCcw } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useMonitoring } from '@/context/MonitoringProvider';
import { ClusterSelector } from '@/components/layout/ClusterSelector';

const POLL_OPTIONS = [
  { label: '3s', value: 3000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 }
];

export function PageHeader() {
  const {
    refresh,
    pollInterval,
    setPollInterval,
    refreshing,
    lastUpdated
  } = useMonitoring();

  return (
    <header className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Elasticsearch Upgrade Monitoring
          </h1>
          <ClusterSelector />
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://www.elastic.co/docs/deploy-manage/upgrade/deployment-or-cluster/elasticsearch"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Elasticsearch Upgrade Documentation"
          >
            <span>Docs</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
            <span>Interval:</span>
            <select
              className="rounded border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              value={pollInterval}
              onChange={(event) => setPollInterval(Number(event.target.value))}
            >
              {POLL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <ThemeToggle />
        </div>
      </div>
      {lastUpdated && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Last updated: {new Date(lastUpdated).toLocaleTimeString('en-US')}
        </div>
      )}
    </header>
  );
}

