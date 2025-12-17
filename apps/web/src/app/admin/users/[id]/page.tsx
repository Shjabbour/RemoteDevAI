'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Calendar, Activity } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ActivityLog from '@/components/admin/ActivityLog';

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  subscriptionTier: string;
  role: string;
  isBanned: boolean;
  createdAt: string;
  lastSeenAt: string;
  subscription: any;
  projects: any[];
  sessions: any[];
  desktopAgents: any[];
  userStats: any;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserDetail();
    }
  }, [userId]);

  const fetchUserDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setUser(data.data.user);
        setActivity(data.data.recentActivity);
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (banned: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          banned,
          reason: banned ? 'Banned by admin' : undefined,
        }),
      });

      if (res.ok) {
        fetchUserDetail();
      }
    } catch (error) {
      console.error('Failed to ban user:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-slate-400">User not found</p>
      </div>
    );
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <Button
        onClick={() => router.back()}
        variant="ghost"
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Users
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          User Details
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {user.email}
        </p>
      </div>

      {/* User Profile */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4 mb-6">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || 'User'}
                  className="w-20 h-20 rounded-full"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                  {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {user.name || 'No name'}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </p>
                <div className="flex gap-2 mt-3">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    user.subscriptionTier === 'FREE'
                      ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      : user.subscriptionTier === 'PRO'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  }`}>
                    {user.subscriptionTier}
                  </span>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    user.role === 'SUPER_ADMIN'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      : user.role === 'ADMIN'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {user.role}
                  </span>
                  {user.isBanned && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      Banned
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Joined
                </p>
                <p className="text-slate-900 dark:text-white font-medium">
                  {formatDate(user.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                  <Activity className="inline w-4 h-4 mr-1" />
                  Last Seen
                </p>
                <p className="text-slate-900 dark:text-white font-medium">
                  {formatDate(user.lastSeenAt)}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => handleBanUser(!user.isBanned)}
                variant={user.isBanned ? 'outline' : 'outline'}
                className={user.isBanned ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}
              >
                {user.isBanned ? 'Unban User' : 'Ban User'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Projects</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {user.projects.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Sessions</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {user.sessions.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Desktop Agents</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {user.desktopAgents.length}
                </p>
              </div>
              {user.userStats && (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Session Time</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {Math.round(user.userStats.totalSessionTime / 60)}h
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {user.projects.slice(0, 5).map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {project.name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {project.description || 'No description'}
                  </p>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {formatDate(project.createdAt)}
                </span>
              </div>
            ))}
            {user.projects.length === 0 && (
              <p className="text-center text-slate-500 dark:text-slate-400 py-4">
                No projects yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityLog activities={activity} />
        </CardContent>
      </Card>
    </div>
  );
}
