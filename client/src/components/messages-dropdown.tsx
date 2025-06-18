import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getUserInitials } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  Search, 
  MessageCircle, 
  Settings,
  Edit,
  Phone,
  Video,
  MoreHorizontal,
  X,
  Send
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { MessageWithUser } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface MessagesDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MessagesDropdown({ 
  isOpen, 
  onClose 
}: MessagesDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: isOpen,
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

  const getOtherUser = (conversation: MessageWithUser) => {
    return conversation.senderId === user?.id ? conversation.receiver : conversation.sender;
  };

  const getLastMessagePreview = (conversation: MessageWithUser) => {
    const isFromCurrentUser = conversation.senderId === user?.id;
    const preview = conversation.content.length > 50 
      ? conversation.content.substring(0, 50) + "..."
      : conversation.content;
    
    return isFromCurrentUser ? `You: ${preview}` : preview;
  };

  const filteredConversations = conversations.filter((conv: MessageWithUser) => {
    const otherUser = getOtherUser(conv);
    const searchLower = searchQuery.toLowerCase();
    return (
      otherUser.name?.toLowerCase().includes(searchLower) ||
      otherUser.username.toLowerCase().includes(searchLower) ||
      conv.content.toLowerCase().includes(searchLower)
    );
  });

  const unreadCount = conversations.filter((conv: MessageWithUser) => 
    !conv.readAt && conv.receiverId === user?.id
  ).length;

  const handleEditClick = () => {
    setShowComposeModal(true);
  };

  const handleSettingsClick = () => {
    setShowSettingsModal(true);
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center">
          <h3 className="font-semibold text-gray-900">Messages</h3>
          {unreadCount > 0 && (
            <Badge className="ml-2 h-5 px-2 text-xs bg-blue-600">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="p-1" onClick={handleEditClick}>
            <Edit className="h-4 w-4 text-gray-500" />
          </Button>
          <Button variant="ghost" size="sm" className="p-1" onClick={handleSettingsClick}>
            <Settings className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 text-sm bg-gray-50 border-0 rounded-full focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="w-32 h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="w-24 h-3 bg-gray-200 rounded"></div>
                </div>
                <div className="w-12 h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <div className="text-sm text-gray-500 mb-1">
              {searchQuery ? "No messages found" : "No messages yet"}
            </div>
            <div className="text-xs text-gray-400">
              {searchQuery 
                ? "Try searching for a different term" 
                : "Start a conversation to see messages here"
              }
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conversation: MessageWithUser) => {
              const otherUser = getOtherUser(conversation);
              const isUnread = !conversation.readAt && conversation.receiverId === user?.id;
              
              return (
                <Link 
                  key={conversation.id} 
                  href={`/messages/${otherUser.id}`}
                  className="block"
                  onClick={onClose}
                >
                  <div className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer ${
                    isUnread ? 'bg-blue-50' : ''
                  }`}>
                    {/* User Avatar with Online Status */}
                    <div className="relative mr-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={otherUser.avatar || ""} />
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                          {getUserInitials(otherUser)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online indicator - would be dynamic in real app */}
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {otherUser.name || otherUser.username}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(conversation.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div className={`text-sm line-clamp-1 ${
                        isUnread ? 'font-medium text-gray-900' : 'text-gray-600'
                      }`}>
                        {getLastMessagePreview(conversation)}
                      </div>

                      {/* Message status indicators */}
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center space-x-1">
                          {conversation.senderId === user?.id && (
                            <div className={`w-2 h-2 rounded-full ${
                              conversation.readAt ? 'bg-blue-500' : 'bg-gray-400'
                            }`}></div>
                          )}
                        </div>
                        
                        {isUnread && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100">
                      <Button variant="ghost" size="sm" className="p-1 h-auto">
                        <Phone className="h-3 w-3 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="sm" className="p-1 h-auto">
                        <Video className="h-3 w-3 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 p-3">
        <Link href="/messages">
          <Button 
            variant="ghost" 
            className="w-full text-blue-600 text-sm h-auto p-2"
            onClick={onClose}
          >
            See All Messages
          </Button>
        </Link>
      </div>

      {/* Compose Message Modal */}
      <Dialog open={showComposeModal} onOpenChange={setShowComposeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipient">To</Label>
              <Input
                id="recipient"
                placeholder="Search for people..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Write your message..."
                className="mt-1 min-h-[100px]"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowComposeModal(false)}>
                Cancel
              </Button>
              <Button>
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Read receipts</Label>
                <p className="text-sm text-muted-foreground">
                  Let others know when you've read their messages
                </p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Online status</Label>
                <p className="text-sm text-muted-foreground">
                  Show when you're active
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Message notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about new messages
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowSettingsModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}