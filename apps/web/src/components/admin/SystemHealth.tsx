'use client';

import { Circle, AlertCircle, CheckCircle } from 'lucide-react';

interface SystemHealthProps {
  uptime: number;
  errorCount: number;
  activeConnections: number;
}

export default function SystemHealth({ uptime, errorCount, activeConnections }: SystemHealthProps) {
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getHealthStatus = () => {
    if (errorCount > 10) return { status: 'critical', color: 'text-red-600 dark:text-red-400', icon: AlertCircle };
    if (errorCount > 5) return { status: 'warning', color: 'text-yellow-600 dark:text-yellow-400', icon: Circle };
    return { status: 'healthy', color: 'text-green-600 dark:text-green-400', icon: CheckCircle };
  };

  const health = getHealthStatus();
  const HealthIcon = health.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          System Health
        </h3>
        <div className="flex items-center gap-2">
          <HealthIcon className={`w-5 h-5 ${health.color}`} />
          <span className={`font-medium ${health.color} capitalize`}>
            {health.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
            Uptime
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {formatUptime(uptime)}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
            Recent Errors
          </div>
          <div className={`text-xl font-bold ${errorCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {errorCount}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 col-span-2">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
            Active Connections
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {activeConnections}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Database</span>
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <Circle className="w-3 h-3 fill-current" />
            Connected
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-slate-600 dark:text-slate-400">Cache</span>
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <Circle className="w-3 h-3 fill-current" />
            Operational
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-slate-600 dark:text-slate-400">Storage</span>
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <Circle className="w-3 h-3 fill-current" />
            Available
          </span>
        </div>
      </div>
    </div>
  );
}
