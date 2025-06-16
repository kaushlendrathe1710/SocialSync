import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUserInitials } from "@/lib/auth";
import { Link } from "wouter";
import { 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Share, 
  Settings,
  Check,
  X,
  Bell,
  BellOff
} from "lucide-react";
import type { NotificationWithUser } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationsDropdown({ 
  isOpen, 
  onClose 
}: NotificationsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: isOpen,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'share':
        return <Share className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationText = (notification: NotificationWithUser) => {
    const userName = notification.fromUser.name || notification.fromUser.username;
    
    switch (notification.type) {
      case 'like':
        return `${userName} liked your post`;
      case 'comment':
        return `${userName} commented on your post`;
      case 'follow':
        return `${userName} started following you`;
      case 'share':
        return `${userName} shared your post`;
      default:
        return notification.content || 'New notification';
    }
  };

  const unreadCount = notifications.filter((n: NotificationWithUser) => !n.isRead).length;

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <Badge className="ml-2 h-5 px-2 text-xs bg-blue-600">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 text-xs h-auto p-1"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              Mark all read
            </Button>
          )}
          <Button variant="ghost" size="sm" className="p-1">
            <Settings className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="w-20 h-3 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <BellOff className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <div className="text-sm text-gray-500 mb-1">No notifications yet</div>
            <div className="text-xs text-gray-400">
              When you get notifications, they'll show up here
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification: NotificationWithUser) => (
              <div 
                key={notification.id}
                className={`flex items-start p-4 hover:bg-gray-50 cursor-pointer relative ${
                  !notification.isRead ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  if (!notification.isRead) {
                    markAsReadMutation.mutate(notification.id);
                  }
                }}
              >
                {/* Unread indicator */}
                {!notification.isRead && (
                  <div className="absolute left-2 top-6 w-2 h-2 bg-blue-600 rounded-full"></div>
                )}

                {/* User Avatar */}
                <div className="relative mr-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={notification.fromUser.avatar || ""} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                      {getUserInitials(notification.fromUser)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Notification type icon */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border-2 border-white flex items-center justify-center">
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 mb-1">
                    <span className="font-medium">
                      {notification.fromUser.name || notification.fromUser.username}
                    </span>
                    <span className="ml-1">
                      {getNotificationText(notification).replace(
                        notification.fromUser.name || notification.fromUser.username, 
                        ''
                      )}
                    </span>
                  </div>
                  
                  {/* Post preview if applicable */}
                  {notification.post && (
                    <div className="text-xs text-gray-500 bg-gray-100 rounded p-2 mt-2 line-clamp-2">
                      {notification.post.content}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                    
                    {/* Action buttons for certain notification types */}
                    {notification.type === 'follow' && (
                      <div className="flex space-x-2">
                        <Button size="sm" className="h-7 px-3 text-xs">
                          Follow Back
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 px-3 text-xs">
                          View Profile
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mark as read button */}
                {!notification.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 p-1 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsReadMutation.mutate(notification.id);
                    }}
                  >
                    <Check className="h-3 w-3 text-gray-400" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-gray-100 p-3">
          <Link href="/notifications">
            <Button 
              variant="ghost" 
              className="w-full text-blue-600 text-sm h-auto p-2"
              onClick={onClose}
            >
              See All Notifications
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}