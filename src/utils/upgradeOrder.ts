import type { NodeInfo } from '@/types/api';
import { compareVersions } from '@/utils/version';

/**
 * Calculate upgrade order for a node based on its role from node.role string.
 * Based on Elasticsearch upgrade documentation:
 * https://www.elastic.co/docs/deploy-manage/upgrade/deployment-or-cluster/elasticsearch
 *
 * Role letters from /_cat/nodes:
 * - f = frozen node
 * - c = cold node
 * - w = warm node
 * - h = hot node
 * - d = data node (no tier)
 * - l = machine learning node
 * - i = ingest node
 * - t = transform node
 * - s = content node
 * - r = remote cluster client node
 * - m = master-eligible node
 * - v = voting-only master node
 *
 * Upgrade Order:
 * 1. Data nodes tier-by-tier: frozen (f), cold (c), warm (w), hot (h), other data (d)
 * 2. Other nodes (neither master-eligible nor data): ML (l), ingest (i), transform (t), content (s), remote (r)
 * 3. Master-eligible nodes last: master (m), voting-only master (v)
 */
export function calculateUpgradeOrder(node: NodeInfo, highestVersion: string | null): number | null {
  // If node is already upgraded (version >= highestVersion), return null
  if (highestVersion && node.version) {
    if (compareVersions(node.version, highestVersion) >= 0) {
      return null; // Already upgraded
    }
  }

  const role = node.nodeRole || '';
  
  // Check for tier-specific data nodes first (these take priority)
  if (role.includes('f')) return 1; // frozen tier
  if (role.includes('c')) return 2; // cold tier
  if (role.includes('w')) return 3; // warm tier
  if (role.includes('h')) return 4; // hot tier
  
  // Other data nodes (d, s - content nodes are also data nodes)
  if (role.includes('d') || role.includes('s')) return 5;
  
  // Other nodes (neither master-eligible nor data)
  if (role.includes('l') || role.includes('i') || role.includes('t') || role.includes('r') || role.includes('v')) {
    return 6;
  }
  
  // Master-eligible nodes last (only 'm', not 'v')
  if (role.includes('m')) {
    return 7;
  }
  
  // Default fallback
  return 8;
}

/**
 * Get upgrade order label for display
 */
export function getUpgradeOrderLabel(order: number | null): string {
  if (order === null) {
    return 'Upgraded';
  }
  
  switch (order) {
    case 1:
      return '1 - Frozen';
    case 2:
      return '2 - Cold';
    case 3:
      return '3 - Warm';
    case 4:
      return '4 - Hot';
    case 5:
      return '5 - Data';
    case 6:
      return '6 - Other';
    case 7:
      return '7 - Master';
    default:
      return `${order} - Unknown`;
  }
}

/**
 * Get upgrade order explanation text
 */
export function getUpgradeOrderExplanation(): string {
  return `Upgrade Order Priority:
1. Frozen Tier (f) - Data nodes in frozen tier
2. Cold Tier (c) - Data nodes in cold tier
3. Warm Tier (w) - Data nodes in warm tier
4. Hot Tier (h) - Data nodes in hot tier
5. Other Data (d, s) - Data, content - Data nodes without tier
6. Other Nodes (l, i, t, r, v) - ML, ingest, transform, remote, voting-only master
7. Master (m) - Dedicated master nodes

Note: Nodes already upgraded (version >= highest version) are marked as "Upgraded".`;
}

