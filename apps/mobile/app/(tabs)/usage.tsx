import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
  };
  tier: string;
}

const { width } = Dimensions.get('window');

export default function UsageScreen() {
  const router = useRouter();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      // This would use your actual API client
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/usage/current`, {
        headers: {
          // Add your auth token header
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }

      const data = await response.json();
      setUsage(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsage();
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return '#ef4444';
    if (percentage >= 80) return '#f59e0b';
    return '#10b981';
  };

  const ProgressBar = ({
    percentage,
    current,
    limit,
    label,
  }: {
    percentage: number;
    current: number | string;
    limit: number | string;
    label: string;
  }) => {
    const color = getProgressColor(percentage);

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={[styles.progressValue, { color }]}>
            {current} / {limit === -1 ? '∞' : limit}
          </Text>
        </View>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
        <Text style={styles.progressPercentage}>{percentage.toFixed(1)}%</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUsage}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Usage & Limits</Text>
        <Text style={styles.subtitle}>{usage.tier} Plan</Text>
      </View>

      {/* Upgrade Prompt */}
      {showUpgradePrompt && (
        <View style={styles.upgradeCard}>
          <Ionicons name="warning" size={24} color="#7c3aed" />
          <View style={styles.upgradeContent}>
            <Text style={styles.upgradeTitle}>Approaching Limits</Text>
            <Text style={styles.upgradeText}>
              You're nearing some usage limits. Upgrade to continue without interruptions.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/billing')}
          >
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Daily Usage */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="today" size={20} color="#7c3aed" />
          <Text style={styles.cardTitle}>Daily Usage</Text>
        </View>

        <ProgressBar
          label="API Calls"
          current={usage.daily.apiCalls.current}
          limit={usage.daily.apiCalls.limit}
          percentage={usage.daily.apiCalls.percentage}
        />

        <View style={styles.divider} />

        <ProgressBar
          label="Agent Connections"
          current={usage.daily.agentConnections.current}
          limit={usage.daily.agentConnections.limit}
          percentage={usage.daily.agentConnections.percentage}
        />
      </View>

      {/* Monthly Usage */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="calendar" size={20} color="#7c3aed" />
          <Text style={styles.cardTitle}>Monthly Usage</Text>
        </View>

        <ProgressBar
          label="Voice Minutes"
          current={usage.monthly.voiceMinutes.current.toFixed(1)}
          limit={usage.monthly.voiceMinutes.limit}
          percentage={usage.monthly.voiceMinutes.percentage}
        />

        <View style={styles.divider} />

        <ProgressBar
          label="Recordings"
          current={usage.monthly.recordings.current}
          limit={usage.monthly.recordings.limit}
          percentage={usage.monthly.recordings.percentage}
        />

        <View style={styles.divider} />

        <ProgressBar
          label="Storage"
          current={usage.monthly.storage.currentFormatted}
          limit={usage.monthly.storage.limitFormatted}
          percentage={usage.monthly.storage.percentage}
        />
      </View>

      {/* Plan Info */}
      <View style={styles.planCard}>
        <Text style={styles.planTitle}>Your Plan Includes:</Text>
        <View style={styles.planFeatures}>
          <View style={styles.planFeature}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.planFeatureText}>
              {usage.daily.apiCalls.limit === -1
                ? 'Unlimited API calls'
                : `${usage.daily.apiCalls.limit} API calls/day`}
            </Text>
          </View>
          <View style={styles.planFeature}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.planFeatureText}>
              {usage.monthly.voiceMinutes.limit === -1
                ? 'Unlimited voice minutes'
                : `${usage.monthly.voiceMinutes.limit} voice minutes/month`}
            </Text>
          </View>
          <View style={styles.planFeature}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.planFeatureText}>
              {usage.monthly.storage.limitFormatted} storage
            </Text>
          </View>
          <View style={styles.planFeature}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.planFeatureText}>
              {usage.monthly.recordings.limit === -1
                ? 'Unlimited recordings'
                : `${usage.monthly.recordings.limit} recordings/month`}
            </Text>
          </View>
        </View>

        {usage.tier !== 'ENTERPRISE' && (
          <TouchableOpacity
            style={styles.viewPlansButton}
            onPress={() => router.push('/billing')}
          >
            <Text style={styles.viewPlansButtonText}>View All Plans</Text>
            <Ionicons name="arrow-forward" size={16} color="#7c3aed" />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  upgradeCard: {
    backgroundColor: '#f3e8ff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  upgradeContent: {
    flex: 1,
    marginLeft: 12,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5b21b6',
    marginBottom: 4,
  },
  upgradeText: {
    fontSize: 14,
    color: '#6d28d9',
    marginBottom: 12,
  },
  upgradeButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  upgradeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    color: '#9ca3af',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  planFeatures: {
    marginBottom: 16,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planFeatureText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
  },
  viewPlansButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  viewPlansButtonText: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '600',
    marginRight: 4,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
