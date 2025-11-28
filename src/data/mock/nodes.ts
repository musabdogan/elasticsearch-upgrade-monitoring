import type { NodeInfo } from '@/types/api';

const nodes: NodeInfo[] = [
  { nodeRole: 'mdi', name: 'hot-node-1', ip: '10.0.0.21', version: '8.15.3', uptime: '5d' },
  { nodeRole: 'mdi', name: 'hot-node-2', ip: '10.0.0.22', version: '8.15.3', uptime: '4d' },
  { nodeRole: 'di', name: 'warm-node-1', ip: '10.0.0.41', version: '8.15.3', uptime: '3d' },
  { nodeRole: 'di', name: 'warm-node-2', ip: '10.0.0.42', version: '8.15.3', uptime: '2.5d' },
  { nodeRole: '-m', name: 'coord-1', ip: '10.0.0.11', version: '8.15.3', uptime: '10h' },
  { nodeRole: 'ilm', name: 'master-1', ip: '10.0.0.3', version: '8.15.3', uptime: '6d' }
];

export default nodes;

