import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface NotificationContextType {
  onlineUsers: Set<number>;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  wsConnection: WebSocket | null;
}

const NotificationContext = createContext<NotificationContextType>({
  onlineUsers: new Set(),
  unreadCount: 0,
  setUnreadCount: () => {},
  wsConnection: null,
});

export const useNotifications = () => useContext(NotificationContext);

interface WebSocketMessage {
  type: string;
  data: any;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  // WebSocket connection for real-time notifications and online status
  useEffect(() => {
    if (!user) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setOnlineUsers(new Set());
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host || 'localhost:5000';
    const wsUrl = `${protocol}//${host}/ws`;
    console.log('WebSocket URL:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected for notifications and messaging');
      setWsConnection(ws); // Update the state with the connected WebSocket
      // Join for messaging (this also handles online status)
      ws.send(JSON.stringify({
        type: 'join',
        userId: user.id
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnection(null); // Clear the state
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (user) {
          // Will trigger useEffect again
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnection(null); // Clear the state
    };

    wsRef.current = ws;

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      setWsConnection(null); // Clear the state on cleanup
    };
  }, [user]);

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'new_notification':
        // Show toast notification
        toast({
          title: "New Notification",
          description: message.data.message,
          duration: 4000,
        });
        
        // Only refresh notifications if we're not in the middle of marking as read
        // This prevents the "unread again" issue
        const currentNotifications = queryClient.getQueryData(['/api/notifications']);
        if (currentNotifications) {
          // Add the new notification to existing data instead of refetching
          queryClient.setQueryData(['/api/notifications'], (oldData: any) => {
            if (!oldData) return oldData;
            return [message.data, ...oldData];
          });
        } else {
          // Only refetch if we don't have current data
          queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        }
        
        // Update unread count
        setUnreadCount(prev => prev + 1);
        break;

      case 'online':
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.add(message.data.userId);
          return newSet;
        });
        break;

      case 'offline':
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(message.data.userId);
          return newSet;
        });
        break;

      case 'user_list':
        // Initial online users list
        setOnlineUsers(new Set(message.data.userIds || []));
        break;

      case 'new_message':
        // Handle message notifications
        if (message.data.senderId !== user?.id) {
          toast({
            title: `New message from ${message.data.senderName}`,
            description: message.data.content.substring(0, 50) + (message.data.content.length > 50 ? '...' : ''),
          });
          
          // Refresh conversations
          queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
        }
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  };

  const value = {
    onlineUsers,
    unreadCount,
    setUnreadCount,
    wsConnection: wsConnection,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}