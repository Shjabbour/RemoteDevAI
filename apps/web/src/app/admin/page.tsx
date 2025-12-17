'use client';

import { useEffect, useState } from 'react';
import { Users, DollarSign, Monitor, TrendingUp } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import StatsCard from '@/components/admin/StatsCard';
import RevenueChart from '@/components/admin/RevenueChart';
import SystemHealth from '@/components/admin/SystemHealth';

interface Stats {
  users: {
    total: number;
    active: number;
    new: number;
  };
  revenue: {
    mrr: number;
    arr: number;
  };
  agents: {
    active: number;
  };
  projects: {
    total: number;
  };
  sessions: {
    total: number;
  };
  system: {
    recentErrors: number;
    uptime: number;
  };
}

interface RevenueData {
  date: string;
  revenue: number;
  newSubscriptions: number;
  canceledSubscriptions: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch dashboard stats
      const statsRes = await fetch('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data);
      }

      // Fetch revenue analytics
      const revenueRes = await fetch('/api/admin/analytics/revenue?days=30', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const revenueData = await revenueRes.json();
      if (revenueData.success) {
        setRevenueData(revenueData.data);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-slate-400">Failed to load admin data</p>
      </div>
    );
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString()}`;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Admin Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Overview of platform metrics and system health
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={stats.users.total.toLocaleString()}
          icon={Users}
          trend={{
            value: stats.users.new > 0 ? ((stats.users.new / stats.users.total) * 100) : 0,
            isPositive: true,
          }}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatsCard
          title="Active Users"
          value={stats.users.active.toLocaleString()}
          icon={Users}
          iconColor="text-green-600 dark:text-green-400"
          iconBgColor="bg-green-100 dark:bg-green-900/30"
        />
        <StatsCard
          title="MRR"
          value={formatCurrency(stats.revenue.mrr * 100)}
          icon={DollarSign}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
        />
        <StatsCard
          title="Active Agents"
          value={stats.agents.active.toLocaleString()}
          icon={Monitor}
          iconColor="text-orange-600 dark:text-orange-400"
          iconBgColor="bg-orange-100 dark:bg-orange-900/30"
        />
      </div>

      {/* Revenue and System Health */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <RevenueChart data={revenueData} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <SystemHealth
              uptime={stats.system.uptime}
              errorCount={stats.system.recentErrors}
              activeConnections={stats.agents.active}
            />
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.projects.total.toLocaleString()}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Total projects created
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.sessions.total.toLocaleString()}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Total coding sessions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ARR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(stats.revenue.arr * 100)}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Annual recurring revenue
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
