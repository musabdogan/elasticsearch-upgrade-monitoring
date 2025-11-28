import type { RecoveryRow } from '@/types/api';

const recovery: RecoveryRow[] = [
  {
    index: 'logs-2025.11.27',
    shard: '3',
    time: '1m 12s',
    sourceNode: 'hot-node-1',
    targetNode: 'hot-node-3',
    target: 'data_cold3',
    filesPercent: '84.1%',
    bytesPercent: '71.3%',
    stage: 'translog',
    translog: '18mb'
  },
  {
    index: 'metrics-2025.11.27',
    shard: '1',
    time: '42s',
    sourceNode: 'warm-node-2',
    targetNode: 'warm-node-4',
    target: 'data_cold3',
    filesPercent: '100%',
    bytesPercent: '100%',
    stage: 'done',
    translog: '0mb'
  },
  {
    index: 'alerts-2025.11.27',
    shard: '0',
    time: '3m 02s',
    sourceNode: 'hot-node-5',
    targetNode: 'hot-node-2',
    target: 'data_cold3',
    filesPercent: '46.7%',
    bytesPercent: '32.1%',
    stage: 'index',
    translog: '51mb'
  }
];

export default recovery;

