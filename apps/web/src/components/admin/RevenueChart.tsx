'use client';

import { useMemo } from 'react';

interface RevenueData {
  date: string;
  revenue: number;
  newSubscriptions: number;
  canceledSubscriptions: number;
}

interface RevenueChartProps {
  data: RevenueData[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const maxRevenue = useMemo(() => {
    return Math.max(...data.map(d => d.revenue / 100), 100);
  }, [data]);

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Revenue Over Time
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-slate-600 dark:text-slate-400">Revenue</span>
          </div>
        </div>
      </div>

      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-slate-500 dark:text-slate-400 pr-2">
          <span>{formatCurrency(maxRevenue * 100)}</span>
          <span>{formatCurrency((maxRevenue * 0.75) * 100)}</span>
          <span>{formatCurrency((maxRevenue * 0.5) * 100)}</span>
          <span>{formatCurrency((maxRevenue * 0.25) * 100)}</span>
          <span>$0</span>
        </div>

        {/* Chart area */}
        <div className="ml-12 h-full flex items-end gap-1">
          {data.map((item, index) => {
            const height = (item.revenue / 100 / maxRevenue) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center group">
                <div className="w-full flex items-end justify-center">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t hover:from-blue-600 hover:to-blue-500 transition-all cursor-pointer relative"
                    style={{ height: `${height}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-slate-900 dark:bg-slate-700 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                        <div className="font-semibold">{formatCurrency(item.revenue)}</div>
                        <div className="text-slate-300 dark:text-slate-400">
                          +{item.newSubscriptions} / -{item.canceledSubscriptions}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 transform -rotate-45 origin-top-left">
                  {formatDate(item.date)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(data.reduce((sum, d) => sum + d.revenue, 0))}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Total Revenue</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            +{data.reduce((sum, d) => sum + d.newSubscriptions, 0)}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">New Subscriptions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            -{data.reduce((sum, d) => sum + d.canceledSubscriptions, 0)}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Cancellations</div>
        </div>
      </div>
    </div>
  );
}
