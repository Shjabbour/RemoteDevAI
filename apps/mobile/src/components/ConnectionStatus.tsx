import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

interface ConnectionStatusProps {
  onRetry?: () => void
  showDetails?: boolean
}

/**
 * Connection status indicator component for mobile
 */
export function ConnectionStatus({ onRetry, showDetails = false }: ConnectionStatusProps) {
  const { isConnected, connectionQuality, pendingCount, isSyncing, retrySync } = useNetworkStatus()
  const [pulseAnim] = React.useState(new Animated.Value(1))

  // Pulse animation when offline
  React.useEffect(() => {
    if (!isConnected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else {
      pulseAnim.setValue(1)
    }
  }, [isConnected, pulseAnim])

  // Don't show if connected with good quality and no pending actions
  if (isConnected && connectionQuality !== 'poor' && pendingCount === 0) {
    return null
  }

  const getStatusColor = () => {
    if (!isConnected) return '#EF4444' // Red
    if (isSyncing) return '#3B82F6' // Blue
    if (connectionQuality === 'poor') return '#F59E0B' // Orange
    if (pendingCount > 0) return '#10B981' // Green
    return '#6B7280' // Gray
  }

  const getStatusText = () => {
    if (!isConnected) return 'Offline'
    if (isSyncing) return 'Syncing...'
    if (connectionQuality === 'poor') return 'Poor Connection'
    if (pendingCount > 0) return `${pendingCount} pending`
    return 'Connected'
  }

  const getQualityIcon = () => {
    switch (connectionQuality) {
      case 'excellent':
        return '▂▄▆█'
      case 'good':
        return '▂▄▆'
      case 'poor':
        return '▂▄'
      case 'offline':
        return '✕'
      default:
        return '▂'
    }
  }

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else if (pendingCount > 0 && isConnected) {
      // Default behavior: retry sync
      retrySync(async (action) => {
        // This will be handled by the actual implementation
        console.log('Retrying action:', action)
      })
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: getStatusColor() }]}>
      <View style={styles.content}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Text style={styles.icon}>{getQualityIcon()}</Text>
        </Animated.View>

        <View style={styles.textContainer}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          {showDetails && pendingCount > 0 && (
            <Text style={styles.detailText}>
              {pendingCount} {pendingCount === 1 ? 'action' : 'actions'} queued
            </Text>
          )}
        </View>

        {((pendingCount > 0 && isConnected) || (!isConnected && onRetry)) && (
          <TouchableOpacity
            onPress={handleRetry}
            style={styles.retryButton}
            disabled={isSyncing}
          >
            <Text style={styles.retryText}>{isSyncing ? '⟳' : 'Retry'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
