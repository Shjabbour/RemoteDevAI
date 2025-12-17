'use client';

import { Clock } from 'lucide-react';

interface Activity {
  id: string;
  eventType: string;
  eventName: string;
  createdAt: string;
  metadata?: any;
}

interface ActivityLogProps {
  activities: Activity[];
}

export default function ActivityLog({ activities }: ActivityLogProps) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes('error')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (eventType.includes('create')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    if (eventType.includes('delete')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (eventType.includes('update')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex-shrink-0 mt-1">
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${getEventColor(activity.eventType)}`}>
                {activity.eventType}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatTime(activity.createdAt)}
              </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {activity.eventName}
            </p>
            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                {JSON.stringify(activity.metadata, null, 2).slice(0, 100)}
                {JSON.stringify(activity.metadata).length > 100 && '...'}
              </div>
            )}
          </div>
        </div>
      ))}
      {activities.length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          No recent activity
        </div>
      )}
    </div>
  );
}
