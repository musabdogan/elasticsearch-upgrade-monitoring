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
    <header className="flex-shrink-0 border-b border-gray-200 bg-white px-3 py-2.5 shadow-sm transition-colors duration-300 dark:border-gray-700 dark:bg-gray-800">
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          <img 
            src="/searchali_logo.png" 
            alt="Searchali" 
            className="h-10 w-auto max-h-12"
          />
          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
            searchali.com
          </span>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2">
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
            Elasticsearch Upgrade Monitoring
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          <ClusterSelector />
          <a
            href="https://www.elastic.co/docs/deploy-manage/upgrade/deployment-or-cluster/elasticsearch"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-100 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-900"
            title="Elasticsearch Upgrade Documentation"
          >
            <span>Docs</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
            disabled={refreshing}
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
            <span className="hidden sm:inline">Interval:</span>
            <select
              className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 shadow-sm transition-colors duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-offset-gray-900"
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
          {lastUpdated && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {new Date(lastUpdated).toLocaleTimeString('en-US')}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

