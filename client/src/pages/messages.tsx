import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { MessageWithUser, User } from '@shared/schema';
import { 
  Search, 
  Send, 
  Phone, 
  Video, 
  Info, 
  MoreHorizontal,
  ArrowLeft,
  Circle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userId: paramUserId } = useParams();
  const [selectedConversation, setSelectedConversation] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/conversations'],
    queryFn: async () => {
      const response = await api.getConversations();
      return response.json() as Promise<MessageWithUser[]>;
    },
  });

  // Handle URL parameters to select conversation
  useEffect(() => {
    if (paramUserId && conversations) {
      const targetUserId = parseInt(paramUserId);
      const conversation = conversations.find(conv => {
        const otherUserId = conv.senderId === user?.id ? conv.receiverId : conv.senderId;
        return otherUserId === targetUserId;
      });
      
      if (conversation) {
        const otherUser = conversation.senderId === user?.id ? conversation.receiver : conversation.sender;
        setSelectedConversation(otherUser);
      }
    }
  }, [paramUserId, conversations, user?.id]);

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/conversations', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const response = await api.getConversation(selectedConversation.id);
      return response.json() as Promise<MessageWithUser[]>;
    },
    enabled: !!selectedConversation,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => 
      api.sendMessage(selectedConversation!.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations', selectedConversation?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations'] 
      });
      setMessageText('');
      toast({
        title: "Message sent!",
        description: "Your message has been delivered.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && selectedConversation) {
      sendMessageMutation.mutate(messageText.trim());
    }
  };

  const handleConversationSelect = (message: MessageWithUser) => {
    const otherUser = message.senderId === user?.id ? message.receiver : message.sender;
    setSelectedConversation(otherUser);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  const getConversationPreview = (message: MessageWithUser) => {
    const otherUser = message.senderId === user?.id ? message.receiver : message.sender;
    const isUnread = !message.readAt && message.receiverId === user?.id;
    
    return {
      user: otherUser,
      lastMessage: message.content,
      timestamp: message.createdAt!,
      isUnread,
    };
  };

  const filteredConversations = conversations?.filter(message => {
    const otherUser = message.senderId === user?.id ? message.receiver : message.sender;
    return otherUser.name.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const uniqueConversations = filteredConversations
    .reduce((acc, message) => {
      const otherUserId = message.senderId === user?.id ? message.receiverId : message.senderId;
      const existing = acc.find(m => {
        const uid = m.senderId === user?.id ? m.receiverId : m.senderId;
        return uid === otherUserId;
      });
      
      // Keep the most recent message for each conversation
      if (!existing || new Date(message.createdAt!) > new Date(existing.createdAt!)) {
        if (existing) {
          const index = acc.indexOf(existing);
          acc[index] = message;
        } else {
          acc.push(message);
        }
      }
      return acc;
    }, [] as MessageWithUser[])
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Card className="overflow-hidden h-[calc(100vh-200px)]">
        <div className="flex h-full">
          
          {/* Conversations List */}
          <div className={`w-full md:w-1/3 border-r border-border ${selectedConversation ? 'hidden md:block' : ''}`}>
            <div className="p-4 border-b border-border">
              <h2 className="text-xl font-bold mb-3">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search messages..."
                  className="pl-10 bg-muted border-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-y-auto h-full">
              {conversationsLoading ? (
                <div className="space-y-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-4 flex items-center space-x-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : uniqueConversations.length > 0 ? (
                uniqueConversations.map((message) => {
                  const preview = getConversationPreview(message);
                  const isSelected = selectedConversation?.id === preview.user.id;
                  
                  return (
                    <div
                      key={`${message.senderId}-${message.receiverId}`}
                      className={`p-4 hover:bg-muted cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50 border-l-4 border-[hsl(221,44%,41%)]' : ''
                      }`}
                      onClick={() => handleConversationSelect(message)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={preview.user.avatar || undefined} />
                            <AvatarFallback>
                              {preview.user.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`truncate ${preview.isUnread ? 'font-semibold' : 'font-medium'}`}>
                              {preview.user.name}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(preview.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className={`text-sm truncate ${preview.isUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                              {preview.lastMessage}
                            </p>
                            {preview.isUnread && (
                              <div className="w-2 h-2 bg-[hsl(221,44%,41%)] rounded-full ml-2"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No conversations yet</p>
                  <p className="text-sm">Start messaging your friends!</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Chat Area */}
          <div className={`flex-col flex-1 ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="md:hidden"
                        onClick={handleBackToList}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={selectedConversation.avatar || undefined} />
                        <AvatarFallback>
                          {selectedConversation.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{selectedConversation.name}</h3>
                        <div className="flex items-center space-x-1">
                          <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                          <p className="text-sm text-green-500">Active now</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Video className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Info className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                          <div className="flex items-start space-x-2 max-w-xs">
                            {i % 2 === 0 && <Skeleton className="w-8 h-8 rounded-full" />}
                            <Skeleton className="h-16 flex-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : messages && messages.length > 0 ? (
                    messages.map((message) => {
                      const isSent = message.senderId === user?.id;
                      return (
                        <div key={message.id} className={`flex items-start space-x-2 ${isSent ? 'justify-end' : 'justify-start'}`}>
                          {!isSent && (
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={message.sender.avatar || undefined} />
                              <AvatarFallback className="text-xs">
                                {message.sender.name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`message-bubble ${isSent ? 'sent' : 'received'}`}>
                            <p className="text-sm">{message.content}</p>
                            <span className={`text-xs mt-1 block ${isSent ? 'text-blue-100' : 'text-muted-foreground'}`}>
                              {formatDistanceToNow(new Date(message.createdAt!), { addSuffix: true })}
                            </span>
                          </div>
                          {isSent && (
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={user?.avatar || undefined} />
                              <AvatarFallback className="text-xs">
                                {user?.name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <p>No messages yet</p>
                      <p className="text-sm">Start the conversation!</p>
                    </div>
                  )}
                </div>
                
                {/* Message Input */}
                <div className="p-4 bg-white border-t border-border">
                  <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      className="text-[hsl(221,44%,41%)]"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      className="text-[hsl(221,44%,41%)]"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    </Button>
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        placeholder="Type a message..."
                        className="bg-muted border-none pr-10"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        disabled={sendMessageMutation.isPending}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[hsl(221,44%,41%)]"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5a1 1 0 000 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2H9V7a1 1 0 10-2 0v2z" clipRule="evenodd" />
                        </svg>
                      </Button>
                    </div>
                    <Button 
                      type="submit" 
                      size="sm"
                      className="facebook-blue"
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium mb-1">Select a conversation</p>
                  <p>Choose from your existing conversations or start a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
