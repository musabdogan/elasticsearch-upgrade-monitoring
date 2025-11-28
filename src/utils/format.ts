import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { ClusterStatus } from '@/types/api';

export function formatNumber(value: number): string {
  return Intl.NumberFormat('tr-TR').format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatRelative(dateIso: string): string {
  return formatDistanceToNow(new Date(dateIso), { addSuffix: true, locale: enUS });
}

export function statusToColor(status: ClusterStatus): string {
  switch (status) {
    case 'green':
      return 'bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-600 dark:border-emerald-500';
    case 'yellow':
      return 'bg-amber-500 text-white border-amber-600 dark:bg-amber-600 dark:border-amber-500';
    case 'red':
      return 'bg-red-600 text-white border-red-700 dark:bg-red-700 dark:border-red-600';
    default:
      return 'bg-gray-500 text-white border-gray-600 dark:bg-gray-600 dark:border-gray-500';
  }
}

