'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Activity,
  Users,
  Server,
  AlertCircle,
  TrendingUp,
  Clock,
  Database,
  Zap,
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [userMetrics, setUserMetrics] = useState<any>(null);
  const [usageMetrics, setUsageMetrics] = useState<any>(null);
  const [errorMetrics, setErrorMetrics] = useState<any>(null);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate(dateRange);
      const endDate = new Date().toISOString();

      const [overviewRes, userRes, usageRes, errorRes] = await Promise.all([
        fetch(`/api/analytics/overview?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/analytics/users?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/analytics/usage?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/analytics/errors?startDate=${startDate}&endDate=${endDate}`),
      ]);

      const [overviewData, userData, usageData, errorData] = await Promise.all([
        overviewRes.json(),
        userRes.json(),
        usageRes.json(),
        errorRes.json(),
      ]);

      setOverview(overviewData.data);
      setUserMetrics(userData.data);
      setUsageMetrics(usageData.data);
      setErrorMetrics(errorData.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (range: string): string => {
    const now = new Date();
    switch (range) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-500">Monitor your application performance and usage</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={dateRange === '24h' ? 'default' : 'outline'}
            onClick={() => setDateRange('24h')}
          >
            24h
          </Button>
          <Button
            variant={dateRange === '7d' ? 'default' : 'outline'}
            onClick={() => setDateRange('7d')}
          >
            7d
          </Button>
          <Button
            variant={dateRange === '30d' ? 'default' : 'outline'}
            onClick={() => setDateRange('30d')}
          >
            30d
          </Button>
          <Button
            variant={dateRange === '90d' ? 'default' : 'outline'}
            onClick={() => setDateRange('90d')}
          >
            90d
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.overview?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.overview?.activeUsers || 0} active in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.overview?.totalRequests || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.overview?.totalErrors || 0} errors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.overview?.avgResponseTime?.toFixed(0) || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">Average API response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.overview?.totalSessions || 0}</div>
            <p className="text-xs text-muted-foreground">Total sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different metrics */}
      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Requests Over Time</CardTitle>
              <CardDescription>Daily API request volume</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={usageMetrics?.dailyStats || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalRequests"
                    stroke="#8884d8"
                    name="Total Requests"
                  />
                  <Line
                    type="monotone"
                    dataKey="successfulRequests"
                    stroke="#82ca9d"
                    name="Successful"
                  />
                  <Line
                    type="monotone"
                    dataKey="failedRequests"
                    stroke="#ff7c7c"
                    name="Failed"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Sessions Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={usageMetrics?.dailyStats || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sessionsStarted" fill="#8884d8" name="Started" />
                    <Bar dataKey="sessionsCompleted" fill="#82ca9d" name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Requests</span>
                  <span className="font-bold">{usageMetrics?.totals?.totalRequests || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Successful Requests</span>
                  <span className="font-bold text-green-600">
                    {usageMetrics?.totals?.successfulRequests || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Failed Requests</span>
                  <span className="font-bold text-red-600">
                    {usageMetrics?.totals?.failedRequests || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Sessions</span>
                  <span className="font-bold">{usageMetrics?.totals?.totalSessions || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Completed Sessions</span>
                  <span className="font-bold">
                    {usageMetrics?.totals?.completedSessions || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">New Users</span>
                    <span className="font-bold text-green-600">
                      {userMetrics?.newUsers || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Users</span>
                    <span className="font-bold">{userMetrics?.activeUsers || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Users by Subscription Tier</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={userMetrics?.usersByTier || []}
                      dataKey="count"
                      nameKey="tier"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {(userMetrics?.usersByTier || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Overview</CardTitle>
              <CardDescription>Recent errors and their frequency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-red-50 rounded">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium">Unresolved Errors</span>
                  </div>
                  <span className="font-bold text-red-600">
                    {errorMetrics?.unresolvedErrors || 0}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Errors by Type</h3>
                  {(errorMetrics?.errorsByType || []).slice(0, 5).map((error: any) => (
                    <div key={error.type} className="flex justify-between items-center p-2 border rounded">
                      <span className="text-sm">{error.type}</span>
                      <div className="flex gap-4">
                        <span className="text-sm text-gray-500">{error.count} occurrences</span>
                        <span className="font-medium">{error.occurrences} total</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Response Time Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={usageMetrics?.dailyStats || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgResponseTime"
                    stroke="#8884d8"
                    name="Avg Response Time (ms)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
