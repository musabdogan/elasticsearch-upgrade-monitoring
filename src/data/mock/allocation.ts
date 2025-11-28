import type { CatAllocationRow } from '@/types/api';

const allocation: CatAllocationRow[] = [
  { shards: 320, diskAvail: '180gb', node: 'hot-node-1', ip: '10.0.0.21' },
  { shards: 305, diskAvail: '165gb', node: 'hot-node-2', ip: '10.0.0.22' },
  { shards: 150, diskAvail: '420gb', node: 'warm-node-1', ip: '10.0.0.41' },
  { shards: 90, diskAvail: '1.2tb', node: 'cold-node-1', ip: '10.0.0.61' }
];

export default allocation;

