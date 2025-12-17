import { useEffect, useState, useCallback } from 'react';
import { socketService } from '@services/socket';
import { SocketEvent } from '@types/index';
import { useAuthStore } from '@stores/authStore';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      socketService.disconnect();
      setIsConnected(false);
      return;
    }

    const socket = socketService.connect();

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [isAuthenticated]);

  const on = useCallback((event: SocketEvent | string, callback: (data: any) => void) => {
    socketService.on(event, callback);
  }, []);

  const off = useCallback((event: SocketEvent | string, callback?: (data: any) => void) => {
    socketService.off(event, callback);
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socketService.emit(event, data);
  }, []);

  const joinProject = useCallback((projectId: string) => {
    socketService.joinProject(projectId);
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    socketService.leaveProject(projectId);
  }, []);

  return {
    isConnected,
    on,
    off,
    emit,
    joinProject,
    leaveProject,
  };
};
