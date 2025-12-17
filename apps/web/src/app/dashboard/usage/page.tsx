'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UsageData {
  daily: {
    apiCalls: {
      current: number;
      limit: number;
      remaining: number;
      percentage: number;
    };
    agentConnections: {
      current: number;
      limit: number;
      remaining: number;
      percentage: number;
    };
    date: string;
  };
  monthly: {
    voiceMinutes: {
      current: number;
      limit: number;
      remaining: number;
      percentage: number;
    };
    storage: {
      current: number;
      limit: number;
      remaining: number;
      percentage: number;
      currentFormatted: string;
      limitFormatted: string;
    };
    recordings: {
      current: number;
      limit: number;
      remaining: number;
      percentage: number;
    };
    year: number;
    month: number;
  };
  tier: string;
}

export default function UsagePage() {
  const router = useRouter();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/usage/current', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }

      const data = await response.json();
      setUsage(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getProgressTextColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const showUpgradePrompt =
    usage.daily.apiCalls.percentage >= 80 ||
    usage.monthly.voiceMinutes.percentage >= 80 ||
    usage.monthly.storage.percentage >= 80 ||
    usage.monthly.recordings.percentage >= 80;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Usage & Limits</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Monitor your usage across different resources on your {usage.tier} plan
        </p>
      </div>

      {showUpgradePrompt && (
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 border border-purple-200 dark:border-purple-700 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                Approaching Your Limits
              </h3>
              <p className="text-purple-700 dark:text-purple-300 mb-4">
                You're nearing or have exceeded some usage limits. Consider upgrading to continue
                enjoying RemoteDevAI without interruptions.
              </p>
              <button
                onClick={() => router.push('/dashboard/billing')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Daily Usage
          </h2>

          {/* API Calls */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 dark:text-gray-300 font-medium">API Calls</span>
              <span className={`font-semibold ${getProgressTextColor(usage.daily.apiCalls.percentage)}`}>
                {usage.daily.apiCalls.current} / {usage.daily.apiCalls.limit === -1 ? '∞' : usage.daily.apiCalls.limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${getProgressColor(usage.daily.apiCalls.percentage)}`}
                style={{ width: `${Math.min(usage.daily.apiCalls.percentage, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {usage.daily.apiCalls.remaining} calls remaining
            </p>
          </div>

          {/* Agent Connections */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Agent Connections</span>
              <span className={`font-semibold ${getProgressTextColor(usage.daily.agentConnections.percentage)}`}>
                {usage.daily.agentConnections.current} / {usage.daily.agentConnections.limit === -1 ? '∞' : usage.daily.agentConnections.limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${getProgressColor(usage.daily.agentConnections.percentage)}`}
                style={{ width: `${Math.min(usage.daily.agentConnections.percentage, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {usage.daily.agentConnections.remaining} connections remaining
            </p>
          </div>
        </div>

        {/* Monthly Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Monthly Usage
          </h2>

          {/* Voice Minutes */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Voice Minutes</span>
              <span className={`font-semibold ${getProgressTextColor(usage.monthly.voiceMinutes.percentage)}`}>
                {usage.monthly.voiceMinutes.current.toFixed(1)} / {usage.monthly.voiceMinutes.limit === -1 ? '∞' : usage.monthly.voiceMinutes.limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${getProgressColor(usage.monthly.voiceMinutes.percentage)}`}
                style={{ width: `${Math.min(usage.monthly.voiceMinutes.percentage, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {usage.monthly.voiceMinutes.remaining.toFixed(1)} minutes remaining
            </p>
          </div>

          {/* Recordings */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Recordings</span>
              <span className={`font-semibold ${getProgressTextColor(usage.monthly.recordings.percentage)}`}>
                {usage.monthly.recordings.current} / {usage.monthly.recordings.limit === -1 ? '∞' : usage.monthly.recordings.limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${getProgressColor(usage.monthly.recordings.percentage)}`}
                style={{ width: `${Math.min(usage.monthly.recordings.percentage, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {usage.monthly.recordings.remaining} recordings remaining
            </p>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 md:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Storage Usage
          </h2>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Total Storage</span>
              <span className={`font-semibold ${getProgressTextColor(usage.monthly.storage.percentage)}`}>
                {usage.monthly.storage.currentFormatted} / {usage.monthly.storage.limitFormatted}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${getProgressColor(usage.monthly.storage.percentage)}`}
                style={{ width: `${Math.min(usage.monthly.storage.percentage, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {usage.monthly.storage.percentage.toFixed(1)}% used
            </p>
          </div>
        </div>
      </div>

      {/* Current Plan Info */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Current Plan: {usage.tier}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400">API Calls</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {usage.daily.apiCalls.limit === -1 ? 'Unlimited' : `${usage.daily.apiCalls.limit}/day`}
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Voice Minutes</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {usage.monthly.voiceMinutes.limit === -1 ? 'Unlimited' : `${usage.monthly.voiceMinutes.limit}/month`}
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Storage</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {usage.monthly.storage.limitFormatted}
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Recordings</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {usage.monthly.recordings.limit === -1 ? 'Unlimited' : `${usage.monthly.recordings.limit}/month`}
            </p>
          </div>
        </div>

        {usage.tier !== 'ENTERPRISE' && (
          <div className="mt-4">
            <button
              onClick={() => router.push('/dashboard/billing')}
              className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
            >
              View all plans and features →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
