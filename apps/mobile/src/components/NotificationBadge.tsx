import { View, Text } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useEffect, useState } from 'react';

interface NotificationBadgeProps {
  count?: number;
  size?: number;
  color?: string;
  showZero?: boolean;
}

export function NotificationBadge({
  count = 0,
  size = 24,
  color = '#667eea',
  showZero = false,
}: NotificationBadgeProps) {
  const showBadge = count > 0 || showZero;
  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <View className="relative">
      <Bell size={size} color={color} />
      {showBadge && (
        <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
          <Text className="text-white text-[10px] font-bold">
            {displayCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export function useNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnreadCount();

    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/unread-count');
      const data = await response.json();

      if (data.success) {
        setUnreadCount(data.data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    } finally {
      setLoading(false);
    }
  };

  return { unreadCount, loading, refresh: fetchUnreadCount };
}

export default NotificationBadge;
