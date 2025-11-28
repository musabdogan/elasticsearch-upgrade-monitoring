# Elasticsearch Upgrade Monitoring

A real-time monitoring dashboard for Elasticsearch cluster upgrades. Track node versions, shard recovery status, disk allocation, cluster health, and get upgrade order recommendations. Includes ready-to-use cluster management commands.

## Features

- **Real-time Monitoring**: Live polling of cluster status, node versions, shard recovery, and allocation
- **Multi-Cluster Support**: Manage multiple Elasticsearch clusters with easy switching
- **Upgrade Order Calculation**: Automatic calculation of node upgrade order based on Elasticsearch best practices
- **Shard Recovery Tracking**: Monitor active shard recovery operations with detailed progress
- **Cluster Health Dashboard**: Visual indicators for cluster status (GREEN/YELLOW/RED)
- **Ready-to-Use Commands**: Quick access to common cluster management operations
  - Flush cluster
  - Disable shard allocation for primary shards
  - Disable shard rebalance
- **Dark/Light Mode**: Toggle between light and dark themes
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **React Context API** (State management)
- **Lucide React** (Icons)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Access to Elasticsearch cluster(s)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/elasticsearch-upgrade-monitoring.git
cd elasticsearch-upgrade-monitoring
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (optional):
```bash
cp .env.example .env.local
```

Available environment variables:
- `NEXT_PUBLIC_POLL_INTERVAL_MS`: Polling interval in milliseconds (default: 5000)
- `NEXT_PUBLIC_REQUEST_TIMEOUT_MS`: Request timeout in milliseconds (default: 8000)
- `NEXT_PUBLIC_USE_MOCK`: Enable mock data mode (default: false)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Adding a Cluster

1. Click on the cluster selector in the header
2. Click "Add Cluster"
3. Enter cluster details:
   - **Label**: A friendly name for the cluster
   - **Base URL**: Elasticsearch endpoint (e.g., `http://localhost:9200`)
   - **Username** (optional): Basic auth username
   - **Password** (optional): Basic auth password
4. Click "Add"

### Monitoring Features

- **Cluster Status**: Real-time cluster health indicator
- **Unassigned Shards**: Count of unassigned shards
- **Active Recovery**: Number of active shard recovery operations
- **Node Count**: Total nodes with version breakdown
- **Node Matrix**: Detailed node information with upgrade order
- **Allocation & Disk**: Disk usage and shard allocation per node
- **Shard Recovery Status**: Active recovery operations details
- **Cluster Settings**: View and search cluster settings

### Upgrade Order

The dashboard automatically calculates the recommended upgrade order based on Elasticsearch documentation:

1. Frozen Tier (f)
2. Cold Tier (c)
3. Warm Tier (w)
4. Hot Tier (h)
5. Other Data (d, s)
6. Other Nodes (l, i, t, r, v)
7. Master (m)

Nodes already at the highest version are marked as "Upgraded".

## CORS Configuration

This application uses a Next.js API route (`/api/elasticsearch`) as a proxy to avoid CORS issues when connecting to Elasticsearch from the browser. The proxy handles authentication and forwards requests to your Elasticsearch cluster.

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
