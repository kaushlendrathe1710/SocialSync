import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/notification-context';
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
  Smile,
  Paperclip,
  Image as ImageIcon,
  Camera,
  Mic,
  ThumbsUp,
  MessageCircle,
  Check
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import VideoCall from '@/components/video-call';
import IncomingCallNotification from '@/components/incoming-call-notification';
import { useVideoCall } from '@/hooks/use-video-call';
import { useFileUpload } from '@/hooks/use-file-upload';
import MediaPlayer from '@/components/media-player';

const EMOJI_PICKER = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '👋',
  '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘',
  '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊',
  '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'
];

export default function RealTimeMessaging() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { onlineUsers, wsConnection } = useNotifications();
  const [location, setLocation] = useLocation();
  const { userId: paramUserId } = useParams();
  const [selectedConversation, setSelectedConversation] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userPrivacySettings, setUserPrivacySettings] = useState<{[key: number]: {onlineStatus: boolean}}>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showMessagesMenu, setShowMessagesMenu] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }>>([]);
  
  // File upload hook
  const { uploadFile, isUploading } = useFileUpload();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const lastConvIdRef = useRef<number | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  
  // Video call functionality - use the WebSocket from notification context
  const {
    callState,
    sendCallRequest,
    acceptCall,
    rejectCall,
    endCall,
    handleIncomingCall,
    handleCallAccepted,
    handleCallRejected,
    handleCallEnded
  } = useVideoCall(wsConnection);
  

  // Add error boundary to catch rendering issues
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="p-8 text-center">
          <p>Please log in to access messages</p>
        </Card>
      </div>
    );
  }

  // Navigate to video call page when call starts
  useEffect(() => {
    if (callState.isInCall && selectedConversation) {
      // Store state in sessionStorage since wouter doesn't support state passing
      sessionStorage.setItem('videoCallState', JSON.stringify({
        otherUser: selectedConversation,
        isInitiator: !!callState.outgoingCall,
        callId: callState.outgoingCall?.callId || callState.incomingCall?.callId
      }));
      setLocation('/video-call');
    }
  }, [callState.isInCall, selectedConversation, setLocation, callState.outgoingCall, callState.incomingCall]);

  // Handle WebSocket messages from the notification context
  useEffect(() => {
    if (!wsConnection) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle new incoming messages
        if (message.type === 'new_message' || message.type === 'message') {
          // Immediately refresh conversations and messages
          queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
          if (selectedConversation) {
            queryClient.invalidateQueries({ 
              queryKey: ['/api/conversations', selectedConversation.id] 
            });
          }
          
          // Show notification for new messages from others
          if (message.data.senderId !== user.id) {
            toast({
              title: `New message from ${message.data.senderName}`,
              description: message.data.content.substring(0, 50) + (message.data.content.length > 50 ? '...' : ''),
            });
          }
        }
        
        // Handle message sent confirmation
        if (message.type === 'message_sent') {
          // Refresh only if it's our message
          if (message.data.senderId === user.id) {
            queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
            if (selectedConversation) {
              queryClient.invalidateQueries({ 
                queryKey: ['/api/conversations', selectedConversation.id] 
              });
            }
          }
        }
        
        // Handle WebRTC signaling messages
        if (message.type === 'webrtc-signaling') {
          const signalingData = message.data;
          console.log('📞 RECEIVED WebRTC signaling message:', signalingData);
          console.log('Signaling type:', signalingData.type);
          console.log('From user:', signalingData.from);
          console.log('To user:', signalingData.to);
          
          switch (signalingData.type) {
            case 'call-request':
              console.log('📞 Processing call request...');
              handleIncomingCall(signalingData.from, signalingData.data.callId);
              break;
            case 'call-accept':
              console.log('✅ Processing call accept...');
              handleCallAccepted();
              break;
            case 'call-reject':
              console.log('❌ Processing call reject...');
              handleCallRejected();
              break;
            case 'call-end':
              console.log('📞 Processing call end...');
              handleCallEnded();
              break;
            default:
              console.log('❓ Unknown signaling type:', signalingData.type);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    wsConnection.addEventListener('message', handleMessage);

    return () => {
      wsConnection.removeEventListener('message', handleMessage);
    };
  }, [wsConnection, user, queryClient, selectedConversation, handleIncomingCall, handleCallAccepted, handleCallRejected, handleCallEnded, toast]);

  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/conversations'],
    queryFn: async () => {
      const response = await api.getConversations();
      return response.json() as Promise<MessageWithUser[]>;
    },
    refetchInterval: 2000,
    refetchOnWindowFocus: false,
  });

  const { data: friends = [], isLoading: friendsLoading } = useQuery({
    queryKey: ['/api/friends'],
    queryFn: async () => {
      const res = await fetch('/api/friends', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showNewConversation,
  });

  const { data: messages, isLoading: messagesLoading, isFetching: messagesFetching } = useQuery({
    queryKey: ['/api/conversations', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const response = await api.getConversation(selectedConversation.id);
      return response.json() as Promise<MessageWithUser[]>;
    },
    enabled: !!selectedConversation,
    refetchInterval: 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch privacy settings for users in conversations
  useEffect(() => {
    if (conversations && conversations.length > 0) {
      const userIds = new Set<number>();
      conversations.forEach((conv: any) => {
        const otherUser = conv.senderId === user?.id ? conv.receiver : conv.sender;
        userIds.add(otherUser.id);
      });

      // Fetch privacy settings for all users
      userIds.forEach(async (userId) => {
        try {
          const response = await fetch(`/api/privacy-settings?userId=${userId}`, {
            credentials: 'include'
          });
          if (response.ok) {
            const settings = await response.json();
            setUserPrivacySettings(prev => ({
              ...prev,
              [userId]: settings
            }));
          }
        } catch (error) {
          // If privacy settings fetch fails, default to hiding online status for privacy
          setUserPrivacySettings(prev => ({
            ...prev,
            [userId]: { onlineStatus: false }
          }));
        }
      });
    }
  }, [conversations, user?.id]);

  // Auto-scroll to bottom when new messages arrive
  // Track whether user is near bottom; only auto-scroll then
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      shouldAutoScrollRef.current = nearBottom;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [selectedConversation?.id]);

  // When messages grow and user is near bottom, keep them at bottom
  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
    }
  }, [messages?.length]);

  // When switching conversation, scroll to bottom once after first load
  useEffect(() => {
    if (!selectedConversation) return;
    if (lastConvIdRef.current !== selectedConversation.id && messages && messages.length) {
      lastConvIdRef.current = selectedConversation.id;
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 0);
    }
  }, [selectedConversation?.id, messagesLoading]);

  // Handle URL parameters
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

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content?: string; files?: File[] }) => {
      if (data.files && data.files.length > 0) {
        // Upload files first
        const uploadPromises = data.files.map(file => uploadFile(file));
        const uploadResults = await Promise.all(uploadPromises);
        
        // Filter out failed uploads
        const successfulUploads = uploadResults.filter(result => result !== null);
        
        if (successfulUploads.length === 0) {
          throw new Error('Failed to upload files');
        }
        
        // Determine message type based on uploaded files
        const imageUrl = successfulUploads.find(result => result!.fileType === 'image')?.url;
        const videoUrl = successfulUploads.find(result => result!.fileType === 'video')?.url;
        const audioUrl = successfulUploads.find(result => result!.fileType === 'audio')?.url;
        
        const firstFile = successfulUploads[0]!;
        
        // Send message with file URLs
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            receiverId: selectedConversation!.id,
            content: data.content || '',
            imageUrl,
            videoUrl,
            audioUrl,
            fileType: firstFile.fileType,
            fileName: firstFile.fileName,
            fileSize: firstFile.fileSize,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to send message with files');
        }
        
        return response.json();
      } else {
        // Handle text message
        const response = await api.sendMessage(selectedConversation!.id, data.content!);
        return response.json();
      }
    },
    onSuccess: () => {
      setMessageText('');
      setSelectedFiles([]);
      setFilePreviews([]);
      setUploadedFiles([]);
      messageInputRef.current?.focus();
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedConversation?.id] });
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
    const content = messageText.trim();
    
    // Check if we have either content or files
    if ((!content && selectedFiles.length === 0) || !selectedConversation || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate({ content, files: selectedFiles.length > 0 ? selectedFiles : undefined });
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
    messageInputRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
      
      // Generate previews for all selected files
      const previews: string[] = [];
      files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          previews[index] = e.target?.result as string;
          if (previews.length === files.length) {
            setFilePreviews([...previews]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const triggerFileInput = () => {
    const fileInput = document.getElementById('chat-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleAttachmentClick = () => {
    triggerFileInput();
  };

  const handleCameraClick = () => {
    // Request camera access for taking photos
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          // Create video element to capture photo
          const video = document.createElement('video');
          video.srcObject = stream;
          video.play();
          
          toast({
            title: "Camera access granted",
            description: "Camera functionality will be available in the next update",
          });
          
          // Stop the stream for now
          stream.getTracks().forEach(track => track.stop());
        })
        .catch((error) => {
          toast({
            title: "Camera access denied",
            description: "Please allow camera access to take photos",
            variant: "destructive",
          });
        });
    } else {
      toast({
        title: "Camera not supported",
        description: "Your browser doesn't support camera access",
        variant: "destructive",
      });
    }
  };

  const handleMicClick = () => {
    // Request microphone access for voice messages
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
          toast({
            title: "Microphone access granted",
            description: "Voice message functionality will be available in the next update",
          });
          
          // Stop the stream for now
          stream.getTracks().forEach(track => track.stop());
        })
        .catch((error) => {
          toast({
            title: "Microphone access denied",
            description: "Please allow microphone access to send voice messages",
            variant: "destructive",
          });
        });
    } else {
      toast({
        title: "Microphone not supported",
        description: "Your browser doesn't support microphone access",
        variant: "destructive",
      });
    }
  };

  const removeSelectedFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = filePreviews.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setFilePreviews(newPreviews);
  };

  const removeAllFiles = () => {
    setSelectedFiles([]);
    setFilePreviews([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  const handleConversationSelect = (message: MessageWithUser) => {
    const otherUser = message.senderId === user?.id ? message.receiver : message.sender;
    setSelectedConversation(otherUser);
    setLocation(`/messages/${otherUser.id}`);
    // prefetch thread so UI doesn't flash empty
    queryClient.prefetchQuery({
      queryKey: ['/api/conversations', otherUser.id],
      queryFn: async () => {
        const res = await api.getConversation(otherUser.id);
        return res.json();
      },
    });
    
    // Mark messages as read when conversation is opened
    if (message.receiverId === user?.id && !message.readAt) {
      markMessageAsRead(message.id);
    }
  };

  const markMessageAsRead = async (messageId: number) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      }
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setLocation('/messages');
  };

  // Process conversations
  const uniqueConversations = conversations
    ?.reduce((acc, message) => {
      // Handle self-messaging case
      const isSelfMessage = message.senderId === message.receiverId;
      const otherUserId = isSelfMessage ? user?.id : (message.senderId === user?.id ? message.receiverId : message.senderId);
      
      const existing = acc.find(m => {
        const isExistingSelfMessage = m.senderId === m.receiverId;
        const existingOtherUserId = isExistingSelfMessage ? user?.id : (m.senderId === user?.id ? m.receiverId : m.senderId);
        
        if (isSelfMessage && isExistingSelfMessage) {
          return true; // Both are self-messages, they belong to the same conversation
        }
        return existingOtherUserId === otherUserId;
      });
      
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
    ?.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()) || [];

  const filteredConversations = uniqueConversations.filter(message => {
    // Handle self-messaging case for filtering
    const isSelfMessage = message.senderId === message.receiverId;
    const otherUser = isSelfMessage ? message.sender : (message.senderId === user?.id ? message.receiver : message.sender);
    
    return otherUser.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           otherUser.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="flex-1 m-4 overflow-hidden shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="flex h-full bg-transparent min-h-0">
          
          {/* Conversations Sidebar */}
          <div className={`w-full md:w-80 border-r border-gray-200/50 dark:border-gray-700/50 flex-shrink-0 flex flex-col h-full ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Messages</h2>
                <DropdownMenu open={showMessagesMenu} onOpenChange={setShowMessagesMenu}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-gray-100 dark:hover:bg-gray-800">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuItem 
                      onClick={() => {
                        setShowMessagesMenu(false);
                        // Mark all conversations as read
                        conversations?.forEach(async (conv) => {
                          if (conv.receiverId === user?.id && !conv.readAt) {
                            await markMessageAsRead(conv.id);
                          }
                        });
                        queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
                        toast({
                          title: "Success",
                          description: "All conversations marked as read",
                        });
                      }}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Mark all as read
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setShowMessagesMenu(false);
                        setSearchQuery('');
                        queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
                        toast({
                          title: "Success",
                          description: "Messages refreshed",
                        });
                      }}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Refresh messages
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setShowMessagesMenu(false);
                        toast({
                          title: "Coming soon",
                          description: "Message settings will be available in the next update",
                        });
                      }}
                    >
                      <Info className="w-4 h-4 mr-2" />
                      Message settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search conversations..."
                  className="pl-10 bg-white/70 dark:bg-gray-800/70 border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-sm focus:shadow-md transition-all duration-200 backdrop-blur-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <ScrollArea className="h-full">
              {conversationsLoading ? (
                <div className="space-y-1">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="p-3 flex items-center space-x-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length > 0 ? (
                <div>
                  {filteredConversations.map((message) => {
                    // Handle self-messaging case for display
                    const isSelfMessage = message.senderId === message.receiverId;
                    const otherUser = isSelfMessage ? message.sender : (message.senderId === user?.id ? message.receiver : message.sender);
                    const isSelected = selectedConversation?.id === otherUser.id;
                    const isUnread = !message.readAt && message.receiverId === user?.id;
                    const isOnline = onlineUsers.has(otherUser.id) && 
                      (userPrivacySettings[otherUser.id]?.onlineStatus !== false);
                    
                    return (
                      <div
                        key={`${message.senderId}-${message.receiverId}`}
                        className={`p-4 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent dark:hover:from-blue-900/20 dark:hover:to-transparent cursor-pointer transition-all duration-200 border-b border-gray-100/50 dark:border-gray-800/50 ${
                          isSelected ? 'bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 border-r-4 border-r-blue-500 shadow-sm' : ''
                        }`}
                        onClick={() => handleConversationSelect(message)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Avatar className="w-12 h-12 ring-2 ring-white dark:ring-gray-800 shadow-md">
                              <AvatarImage src={otherUser.avatar || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-semibold">
                                {otherUser.name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {isOnline && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full shadow-sm animate-pulse"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className={`truncate ${isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                                {isSelfMessage ? `${otherUser.name} (Notes to self)` : otherUser.name}
                              </h4>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(message.createdAt!), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className={`text-sm truncate ${isUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                                {message.senderId === user?.id ? 'You: ' : ''}{message.content}
                              </p>
                              {isUnread && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full ml-2 flex-shrink-0"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                    <Search className="w-8 h-8" />
                  </div>
                  <p className="font-medium">No conversations found</p>
                  <p className="text-sm">Start messaging to see conversations here</p>
                </div>
              )}
            </ScrollArea>
          </div>
          
          {/* Chat Area */}
          <div className={`flex flex-col flex-1 min-h-0 h-full ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
            {selectedConversation ? (
              <>
                {/* Chat Header - Always Visible */}
                <div className="sticky top-0 z-10 px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/90 to-gray-50/90 dark:from-gray-900/90 dark:to-gray-800/90 backdrop-blur-sm shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBackToList}
                        className="md:hidden hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-2"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                      <div className="relative">
                        <Avatar className="w-12 h-12 ring-2 ring-blue-200/50 dark:ring-blue-800/50 shadow-md">
                          <AvatarImage src={selectedConversation.avatar || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-bold text-lg">
                            {selectedConversation.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {onlineUsers.has(selectedConversation.id) && 
                         (userPrivacySettings[selectedConversation.id]?.onlineStatus !== false) && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full shadow-sm animate-pulse"></div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h1 className="font-bold text-xl text-gray-900 dark:text-white truncate">
                          {selectedConversation.name}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {onlineUsers.has(selectedConversation.id) && 
                           (userPrivacySettings[selectedConversation.id]?.onlineStatus !== false) ? (
                            <span className="text-green-600 dark:text-green-400 font-medium flex items-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                              Active now
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">Offline</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => sendCallRequest(selectedConversation, user!.id)}
                        disabled={callState.isInCall || !wsConnection || wsConnection.readyState !== WebSocket.OPEN}
                        className="hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full p-3 shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <Phone className="w-5 h-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => sendCallRequest(selectedConversation, user!.id)}
                        disabled={callState.isInCall || !wsConnection || wsConnection.readyState !== WebSocket.OPEN}
                        className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full p-3 shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <Video className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowUserInfo(true)} className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-3 shadow-sm hover:shadow-md transition-all duration-200">
                        <Info className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Enhanced Messages Area */}
                <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 bg-gradient-to-b from-gray-50/50 to-white/50 dark:from-gray-900/50 dark:to-gray-800/50 h-[calc(100vh-200px)]">
                  {messagesLoading ? (
                    <div className="space-y-6">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                          <div className="flex items-end space-x-2">
                            {i % 2 !== 0 && <Skeleton className="w-8 h-8 rounded-full" />}
                            <div className="space-y-1">
                              <Skeleton className="h-10 w-48 rounded-2xl" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : messages && messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((message, index) => {
                        const isFromCurrentUser = message.senderId === user?.id;
                        const showAvatar = !isFromCurrentUser && (
                          index === 0 || 
                          messages[index - 1]?.senderId !== message.senderId
                        );
                        const showTimestamp = index === 0 || 
                          new Date(message.createdAt!).getTime() - new Date(messages[index - 1]?.createdAt!).getTime() > 300000; // 5 minutes
                        
                        return (
                          <div key={message.id} className="space-y-1">
                            {showTimestamp && (
                              <div className="flex justify-center">
                                <span className="text-xs text-gray-500 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">
                                  {formatMessageTime(new Date(message.createdAt!))}
                                </span>
                              </div>
                            )}
                            <div className={`flex items-end space-x-3 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}>
                              {!isFromCurrentUser && (
                                <Avatar className={`w-8 h-8 ${showAvatar ? 'visible' : 'invisible'}`}>
                                  <AvatarImage src={message.sender.avatar || undefined} />
                                  <AvatarFallback className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                                    {message.sender.name?.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className={`max-w-md sm:max-w-lg lg:max-w-2xl ${isFromCurrentUser ? 'order-1' : ''}`}>
                                <div
                                  className={`px-4 py-3 rounded-2xl shadow-sm ${
                                    isFromCurrentUser
                                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-md'
                                      : 'bg-white dark:bg-gray-800 text-foreground rounded-bl-md border border-gray-200 dark:border-gray-700'
                                  }`}
                                >
                                  {(message.imageUrl || message.videoUrl || message.audioUrl) ? (
                                    <div className="space-y-2">
                                      {/* Media Player */}
                                      {message.imageUrl && (
                                        <MediaPlayer
                                          url={message.imageUrl}
                                          type="image"
                                          fileName={message.fileName || undefined}
                                        />
                                      )}
                                      {message.videoUrl && (
                                        <MediaPlayer
                                          url={message.videoUrl}
                                          type="video"
                                          fileName={message.fileName || undefined}
                                        />
                                      )}
                                      {message.audioUrl && (
                                        <MediaPlayer
                                          url={message.audioUrl}
                                          type="audio"
                                          fileName={message.fileName || undefined}
                                        />
                                      )}
                                      
                                      {/* Message content */}
                                      {message.content && (
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words break-all">{message.content}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words break-all">{message.content}</p>
                                  )}
                                </div>
                                <div className={`flex items-center mt-1 space-x-1 px-1 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                  {!showTimestamp && (
                                    <span className="text-xs text-gray-400">
                                      {format(new Date(message.createdAt!), 'HH:mm')}
                                    </span>
                                  )}
                                  {isFromCurrentUser && (
                                    <div className="flex items-center space-x-1">
                                      {message.readAt ? (
                                        <span className="text-xs text-blue-400">✓✓</span>
                                      ) : (
                                        <span className="text-xs text-gray-400">✓</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <MessageCircle className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">No messages yet</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                        Start the conversation with <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedConversation.name}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Enhanced Message Input */}
                <div className="px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/90 to-gray-50/90 dark:from-gray-900/90 dark:to-gray-800/90 backdrop-blur-sm shadow-lg">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    accept="image/*,video/*,audio/*"
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                    id="chat-file-input"
                    aria-label="Select files to attach"
                  />
                  
                  {/* File previews */}
                  {filePreviews.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {filePreviews.length} file{filePreviews.length > 1 ? 's' : ''} selected
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeAllFiles}
                          className="text-red-500 hover:text-red-600 text-xs"
                        >
                          Remove all
                        </Button>
                      </div>
                      <div className="flex gap-2 overflow-x-auto">
                        {filePreviews.map((preview, index) => {
                          const file = selectedFiles[index];
                          const isImage = file?.type.startsWith('image/');
                          const isVideo = file?.type.startsWith('video/');
                          const isAudio = file?.type.startsWith('audio/');
                          
                          return (
                            <div key={index} className="relative flex-shrink-0">
                              {isImage ? (
                                <img 
                                  src={preview} 
                                  alt={`Preview ${index + 1}`} 
                                  className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md"
                                />
                              ) : isVideo ? (
                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-center">
                                  <Video className="w-8 h-8 text-gray-500" />
                                </div>
                              ) : isAudio ? (
                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-center">
                                  <Mic className="w-8 h-8 text-gray-500" />
                                </div>
                              ) : (
                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-center">
                                  <Paperclip className="w-8 h-8 text-gray-500" />
                                </div>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg text-xs"
                                onClick={() => removeSelectedFile(index)}
                              >
                                ×
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={handleSendMessage} className="flex items-end space-x-3 bg-white/70 dark:bg-gray-800/70 rounded-2xl p-3 shadow-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                    <div className="flex items-center space-x-1">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={handleAttachmentClick}
                        title="Attach file"
                        className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full p-2 shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <Paperclip className="w-5 h-5" />
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={triggerFileInput}
                        title="Select image or video"
                        className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full p-2"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={handleCameraClick}
                        title="Take photo"
                        className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full p-2"
                      >
                        <Camera className="w-5 h-5" />
                      </Button>
                    </div>
                    
                    <div className="flex-1 relative">
                      <Textarea
                        ref={messageInputRef}
                        placeholder={`Message ${selectedConversation.name}...`}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="resize-none rounded-2xl border border-gray-200/50 dark:border-gray-700/50 pr-14 min-h-[48px] max-h-32 focus:border-blue-500 dark:focus:border-blue-400 bg-white/80 dark:bg-gray-800/80 shadow-sm focus:shadow-md transition-all duration-200 backdrop-blur-sm"
                        rows={1}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="text-gray-500 hover:text-yellow-500 rounded-full p-1">
                              <Smile className="w-5 h-5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-4 border border-gray-200/50 dark:border-gray-700/50 shadow-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
                            <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                              {EMOJI_PICKER.map((emoji) => (
                                <Button
                                  key={emoji}
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 w-9 p-0 text-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 hover:scale-110"
                                  onClick={() => handleEmojiSelect(emoji)}
                                >
                                  {emoji}
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {messageText.trim() || selectedFiles.length > 0 ? (
                        <Button 
                          type="submit" 
                          size="sm" 
                          disabled={sendMessageMutation.isPending}
                          className="rounded-full w-12 h-12 p-0 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg transition-all duration-200 hover:scale-105"
                        >
                          <Send className="w-5 h-5" />
                        </Button>
                      ) : (
                        <>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={handleMicClick}
                            title="Send voice message"
                            className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full p-2"
                          >
                            <Mic className="w-5 h-5" />
                          </Button>
                          <Button 
                            type="button" 
                            size="sm"
                            className="rounded-full w-12 h-12 p-0 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg transition-all duration-200 hover:scale-105"
                            onClick={() => {
                              setMessageText('👍');
                              setTimeout(() => handleSendMessage(new Event('submit') as any), 100);
                            }}
                            title="Send thumbs up"
                          >
                            <ThumbsUp className="w-5 h-5 text-white" />
                          </Button>
                        </>
                      )}
                    </div>
                  </form>
                </div>
              </>
            ) : (
              /* No Conversation Selected */
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Send className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-lg font-medium mb-2">Your Messages</p>
                    <p className="text-muted-foreground mb-4">Send private messages to friends and family</p>
                    <Button onClick={() => setShowNewConversation(true)}>Start New Conversation</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* User Info Dialog */}
      <Dialog open={showUserInfo} onOpenChange={setShowUserInfo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Information</DialogTitle>
          </DialogHeader>
          {selectedConversation && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedConversation.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg">
                    {selectedConversation.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedConversation.name}</h3>
                  <p className="text-sm text-muted-foreground">@{selectedConversation.username}</p>
                  <div className="flex items-center mt-1">
                    <div className={`w-2 h-2 rounded-full mr-2 ${onlineUsers.has(selectedConversation.id) && 
                      (userPrivacySettings[selectedConversation.id]?.onlineStatus !== false) ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-xs text-muted-foreground">
                      {onlineUsers.has(selectedConversation.id) && 
                       (userPrivacySettings[selectedConversation.id]?.onlineStatus !== false) ? 'Active now' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
              
              {selectedConversation.bio && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Bio</h4>
                  <p className="text-sm text-muted-foreground">{selectedConversation.bio}</p>
                </div>
              )}
              
              {selectedConversation.location && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Location</h4>
                  <p className="text-sm text-muted-foreground">{selectedConversation.location}</p>
                </div>
              )}
              
              {selectedConversation.website && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Website</h4>
                  <a 
                    href={selectedConversation.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {selectedConversation.website}
                  </a>
                </div>
              )}
              
              <div className="flex space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => sendCallRequest(selectedConversation, user!.id)}
                  disabled={callState.isInCall || !wsConnection || wsConnection.readyState !== WebSocket.OPEN}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => sendCallRequest(selectedConversation, user!.id)}
                  disabled={callState.isInCall || !wsConnection || wsConnection.readyState !== WebSocket.OPEN}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Video Call
                </Button>
              </div>
              
              {/* WebSocket Status Indicator */}
              {(!wsConnection || wsConnection.readyState !== WebSocket.OPEN) && (
                <div className="mt-3 text-center">
                  <div className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 dark:from-yellow-900/30 dark:to-orange-900/30 dark:text-yellow-400 shadow-sm border border-yellow-200/50 dark:border-yellow-700/50">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                    Connecting to server...
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Start a new conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {friendsLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </div>
            ) : friends.length === 0 ? (
              <p className="text-sm text-muted-foreground">No friends yet.</p>
            ) : (
              <div className="max-h-80 overflow-auto divide-y">
                {friends.map((f: any) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSelectedConversation(f);
                      setShowNewConversation(false);
                      setLocation(`/messages/${f.id}`);
                    }}
                    className="w-full text-left p-3 hover:bg-muted flex items-center gap-3"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={f.avatar || undefined} />
                      <AvatarFallback>{f.name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{f.name}</div>
                      <div className="text-xs text-muted-foreground truncate">@{f.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Call Navigation */}
      {callState.isInCall && selectedConversation && (
        <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Starting video call...</p>
          </div>
        </div>
      )}

      {/* Incoming Call Notification */}
      {callState.incomingCall && (
        <IncomingCallNotification
          from={callState.incomingCall.from}
          onAccept={() => {
            acceptCall(user!.id);
            // The VideoCall component will be opened automatically
          }}
          onReject={() => rejectCall(user!.id)}
        />
      )}
    </div>
  );
}