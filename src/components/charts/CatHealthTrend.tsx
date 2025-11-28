'use client';

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { CatHealthRow } from '@/types/api';
import { format, isValid, parseISO } from 'date-fns';

type Props = {
  data: CatHealthRow[];
};

function parseTimestamp(timestamp: string, epoch?: string): Date | null {
  // Try parsing as ISO string first
  if (timestamp) {
    const isoDate = parseISO(timestamp);
    if (isValid(isoDate)) {
      return isoDate;
    }
    
    // Try parsing as regular date string
    const date = new Date(timestamp);
    if (isValid(date)) {
      return date;
    }
  }
  
  // Fallback to epoch if available
  if (epoch) {
    const epochNum = Number.parseInt(epoch, 10);
    if (!Number.isNaN(epochNum) && epochNum > 0) {
      // Check if it's in seconds (typical Elasticsearch epoch) or milliseconds
      const epochMs = epochNum < 1e12 ? epochNum * 1000 : epochNum;
      const date = new Date(epochMs);
      if (isValid(date)) {
        return date;
      }
    }
  }
  
  return null;
}

export function CatHealthTrend({ data }: Props) {
  const chartData = data
    .map((row) => {
      const date = parseTimestamp(row.timestamp, row.epoch);
      if (!date) {
        return null;
      }
      
      const activePercent = Number.parseFloat(row.active_shards_percent);
      if (Number.isNaN(activePercent)) {
        return null;
      }
      
      return {
        time: format(date, 'HH:mm'),
        active: activePercent,
        status: row.status
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#1b2554" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            tick={{ fill: 'currentColor', fontSize: 12 }}
            stroke="rgba(255,255,255,0.1)"
          />
          <YAxis
            domain={[90, 100]}
            tick={{ fill: 'currentColor', fontSize: 12 }}
            stroke="rgba(255,255,255,0.1)"
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: 16
            }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Active Shards']}
          />
          <Area
            type="monotone"
            dataKey="active"
            stroke="#38bdf8"
            fillOpacity={1}
            fill="url(#activeGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

