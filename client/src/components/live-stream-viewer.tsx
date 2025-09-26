import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Video,
  Heart,
  MessageCircle,
  Users,
  Share2,
  Send,
  X,
  Crown,
  Eye,
  Clock,
  ArrowLeft,
  Mic,
  MicOff,
  VideoOff,
} from "lucide-react";

interface LiveStreamMessage {
  id: string;
  userId: number;
  username: string;
  userAvatar?: string;
  message: string;
  timestamp: Date;
  type: "message" | "reaction" | "join" | "leave";
}

interface LiveStreamViewer {
  id: number;
  username: string;
  avatar?: string;
  isHost: boolean;
}

interface LiveStream {
  id: number;
  title: string;
  description?: string;
  privacy: string;
  isActive: boolean;
  viewerCount: number;
  startedAt: string;
  user: {
    id: number;
    name: string;
    username: string;
    avatar?: string;
  };
}

interface LiveStreamViewerProps {
  isOpen: boolean;
  onClose: () => void;
  stream: LiveStream | null;
}

export default function LiveStreamViewer({ isOpen, onClose, stream }: LiveStreamViewerProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const chatRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<LiveStreamMessage[]>([]);
  const [viewers, setViewers] = useState<LiveStreamViewer[]>([]);
  const [showChat, setShowChat] = useState(true);
  const [showViewers, setShowViewers] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isJoined, setIsJoined] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [isReceivingVideo, setIsReceivingVideo] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  // Initialize audio context for playing received audio
  useEffect(() => {
    if (!isHost && !audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
    }
    
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [isHost, audioContext]);

  const playAudioData = (audioData: number[], sampleRate: number) => {
    if (!audioContext || audioContext.state === 'closed') return;
    
    try {
      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Create audio buffer
      const buffer = audioContext.createBuffer(1, audioData.length, sampleRate);
      const channelData = buffer.getChannelData(0);
      
      // Convert Int16Array back to Float32Array
      for (let i = 0; i < audioData.length; i++) {
        channelData[i] = audioData[i] / 32768;
      }
      
      // Create and play audio source
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
      
    } catch (error) {
      console.error("Error playing audio data:", error);
    }
  };

  // Check if current user is the host
  useEffect(() => {
    if (stream && user) {
      setIsHost(stream.user.id === user.id);
    }
  }, [stream, user]);

  // Set up WebSocket connection for real-time features
  useEffect(() => {
    if (isOpen && stream && !websocket) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected for live stream viewing");
        setWebsocket(ws);

        // Join the stream
        ws.send(
          JSON.stringify({
            type: isHost ? "join_stream_as_host" : "join_stream",
            streamId: stream.id,
            userId: user?.id,
          })
        );
        setIsJoined(true);

        // Add welcome message
        const welcomeMessage = {
          id: "welcome-1",
          userId: 999,
          username: "System",
          userAvatar: undefined,
          message: `Welcome to ${stream.title}! 🎉`,
          timestamp: new Date(),
          type: "message" as const,
        };
        setMessages([welcomeMessage]);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "viewer_count_update":
              if (data.streamId === stream.id) {
                setViewerCount(data.viewerCount);
              }
              break;
            case "chat_message":
              if (data.streamId === stream.id) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: data.messageId,
                    userId: data.userId,
                    username: data.username,
                    userAvatar: data.userAvatar,
                    message: data.message,
                    timestamp: new Date(data.timestamp),
                    type: "message",
                  },
                ]);
              }
              break;
            case "user_joined":
              if (data.streamId === stream.id) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `join-${Date.now()}`,
                    userId: data.userId,
                    username: data.username,
                    userAvatar: data.userAvatar,
                    message: `${data.username} joined the stream`,
                    timestamp: new Date(),
                    type: "join",
                  },
                ]);
                setViewers((prev) => [
                  ...prev,
                  {
                    id: data.userId,
                    username: data.username,
                    avatar: data.userAvatar,
                    isHost: false,
                  },
                ]);
              }
              break;
            case "user_left":
              if (data.streamId === stream.id) {
                setViewers((prev) => prev.filter((v) => v.id !== data.userId));
              }
              break;
            case "reaction":
              if (data.streamId === stream.id) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `reaction-${Date.now()}`,
                    userId: data.userId,
                    username: data.username,
                    userAvatar: data.userAvatar,
                    message: `${data.reactionType}`,
                    timestamp: new Date(),
                    type: "reaction",
                  },
                ]);
              }
              break;
            case "video_frame":
              if (data.streamId === stream.id) {
                console.log("Received video frame from host");
                setCurrentFrame(data.frameData);
                setIsReceivingVideo(true);
              }
              break;
            case "audio_data":
              if (data.streamId === stream.id) {
                console.log("Received audio data from host");
                playAudioData(data.audioData, data.sampleRate);
              }
              break;
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setWebsocket(null);
        setIsJoined(false);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    }

    return () => {
      if (websocket) {
        websocket.close();
        setWebsocket(null);
        setIsJoined(false);
      }
    };
  }, [isOpen, stream, user?.id, isHost]);

  // Initialize host stream (camera and microphone)
  useEffect(() => {
    if (isOpen && isHost && !mediaStream) {
      initializeHostStream();
    }
  }, [isOpen, isHost]);

  const initializeHostStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: true,
      });

      setMediaStream(stream);

      // Show local stream in the main video area for host
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      toast({
        title: "Stream started!",
        description: "Your camera and microphone are now active.",
      });
    } catch (error: any) {
      console.error("Error initializing host stream:", error);
      toast({
        title: "Stream setup failed",
        description: "Unable to access camera and microphone.",
        variant: "destructive",
      });
    }
  };

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatRef.current) {
      const scrollContainer = chatRef.current.parentElement;
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Handle scroll events to show/hide scroll to bottom button
  useEffect(() => {
    const scrollContainer = chatRef.current?.parentElement;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToBottom(!isNearBottom);
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [messages]);

  const scrollToBottom = () => {
    const scrollContainer = chatRef.current?.parentElement;
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  };

  // Track stream duration
  useEffect(() => {
    if (stream && isJoined) {
      const startTime = new Date(stream.startedAt);
      const updateDuration = () => {
        const now = new Date();
        const elapsed = Math.floor(
          (now.getTime() - startTime.getTime()) / 1000
        );
        setStreamDuration(elapsed);
      };

      updateDuration();
      const interval = setInterval(updateDuration, 1000);

      return () => clearInterval(interval);
    }
  }, [stream, isJoined]);

  const sendChatMessage = () => {
    if (!chatMessage.trim() || !stream) return;

    // If WebSocket is not connected, add message locally for demo
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      const newMessage = {
        id: `local-${Date.now()}`,
        userId: user?.id || 0,
        username: user?.name || "You",
        userAvatar: user?.avatar || undefined,
        message: chatMessage.trim(),
        timestamp: new Date(),
        type: "message" as const,
      };
      setMessages((prev) => [...prev, newMessage]);
      setChatMessage("");
      return;
    }

    const messageData = {
      type: "send_chat_message",
      streamId: stream.id,
      message: chatMessage.trim(),
      userId: user?.id,
      username: user?.name,
      userAvatar: user?.avatar,
    };

    websocket.send(JSON.stringify(messageData));
    setChatMessage("");
  };

  const sendReaction = (reactionType: string) => {
    if (!stream) return;

    // If WebSocket is not connected, add reaction locally for demo
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      const newMessage = {
        id: `reaction-${Date.now()}`,
        userId: user?.id || 0,
        username: user?.name || "You",
        userAvatar: user?.avatar || undefined,
        message: reactionType,
        timestamp: new Date(),
        type: "reaction" as const,
      };
      setMessages((prev) => [...prev, newMessage]);
      return;
    }

    const reactionData = {
      type: "send_reaction",
      streamId: stream.id,
      reactionType,
      userId: user?.id,
      username: user?.name,
      userAvatar: user?.avatar,
    };

    websocket.send(JSON.stringify(reactionData));
  };

  // Camera and microphone controls (for host)
  const toggleCamera = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);

        toast({
          title: videoTrack.enabled ? "Camera turned on" : "Camera turned off",
          description: videoTrack.enabled
            ? "Your camera is now visible"
            : "Your camera is now hidden",
        });
      }
    }
  };

  const toggleMicrophone = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);

        toast({
          title: audioTrack.enabled
            ? "Microphone turned on"
            : "Microphone turned off",
          description: audioTrack.enabled
            ? "Your microphone is now active"
            : "Your microphone is now muted",
        });
      }
    }
  };

  const handleClose = () => {
    if (stream && websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(
        JSON.stringify({
          type: "leave_stream",
          streamId: stream.id,
        })
      );
    }

    // Stop all media tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }

    setMessages([]);
    setViewers([]);
    setChatMessage("");
    setViewerCount(0);
    setIsJoined(false);
    setStreamDuration(0);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const shareStream = () => {
    if (navigator.share) {
      navigator.share({
        title: stream?.title || "Live Stream",
        text: `Watch ${stream?.user.name}'s live stream: ${stream?.title}`,
        url: window.location.href,
      });
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Stream link has been copied to clipboard",
      });
    }
  };

  if (!isOpen || !stream) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <Video className="w-5 h-5 text-red-500" />
              <span className="font-semibold">{stream.title}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="destructive" className="bg-red-500">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1"></div>
              LIVE
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Video Display */}
          <div className="relative bg-black rounded-lg m-4 aspect-video overflow-hidden flex-1">
            {isHost && mediaStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : isReceivingVideo && currentFrame ? (
              <img
                src={currentFrame}
                alt="Live Stream"
                className="w-full h-full object-cover"
                style={{ imageRendering: 'auto' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                <div className="text-center">
                  <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">{stream.title}</p>
                  <p className="text-sm opacity-75">by {stream.user.name}</p>
                  {!isHost && (
                    <p className="text-xs opacity-50 mt-2">
                      {isReceivingVideo ? "Receiving video..." : "Waiting for stream to start..."}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Stream Info Overlay */}
            <div className="absolute top-4 left-4 flex items-center space-x-2">
              <Badge variant="destructive" className="bg-red-500">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1"></div>
                LIVE
              </Badge>
              <Badge variant="secondary" className="bg-black/50 text-white">
                <Eye className="w-3 h-3 mr-1" />
                {viewerCount}
              </Badge>
              <Badge variant="secondary" className="bg-black/50 text-white">
                <Clock className="w-3 h-3 mr-1" />
                {formatDuration(streamDuration)}
              </Badge>
            </div>

            {/* Host Info */}
            <div className="absolute bottom-4 left-4 flex items-center space-x-3">
              <Avatar className="w-12 h-12 border-2 border-white">
                <AvatarImage src={stream.user.avatar || undefined} />
                <AvatarFallback className="bg-gray-600 text-white">
                  {stream.user.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-white">
                <p className="font-semibold">{stream.user.name}</p>
                <p className="text-sm opacity-75">@{stream.user.username}</p>
              </div>
              <Badge variant="secondary" className="bg-yellow-500 text-white">
                <Crown className="w-3 h-3 mr-1" />
                Host
              </Badge>
            </div>

            {/* Controls (for host) */}
            {isHost && (
              <div className="absolute bottom-4 right-4 flex space-x-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleCamera}
                  className={`bg-black/50 hover:bg-black/70 ${
                    isCameraOn ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {isCameraOn ? (
                    <Video className="w-5 h-5" />
                  ) : (
                    <VideoOff className="w-5 h-5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMicrophone}
                  className={`bg-black/50 hover:bg-black/70 ${
                    isMicOn ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {isMicOn ? (
                    <Mic className="w-5 h-5" />
                  ) : (
                    <MicOff className="w-5 h-5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => sendReaction("❤️")}
                  className="bg-black/50 hover:bg-black/70 text-red-500"
                >
                  <Heart className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={shareStream}
                  className="bg-black/50 hover:bg-black/70"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>

          {/* Stream Description */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <h3 className="font-semibold text-lg mb-2">{stream.title}</h3>
            {stream.description && (
              <p className="text-gray-600 mb-2">{stream.description}</p>
            )}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>
                Started {new Date(stream.startedAt).toLocaleTimeString()}
              </span>
              <span>•</span>
              <span>{viewerCount} watching</span>
              <span>•</span>
              <span>{formatDuration(streamDuration)}</span>
            </div>
          </div>
        </div>

        {/* Chat and Viewers Sidebar */}
        <div className="w-80 border-l border-gray-200 flex flex-col bg-white min-h-0">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <Button
              variant={showChat ? "default" : "ghost"}
              size="sm"
              className="flex-1 rounded-none"
              onClick={() => {
                setShowChat(true);
                setShowViewers(false);
              }}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </Button>
            <Button
              variant={showViewers ? "default" : "ghost"}
              size="sm"
              className="flex-1 rounded-none"
              onClick={() => {
                setShowViewers(true);
                setShowChat(false);
              }}
            >
              <Users className="w-4 h-4 mr-2" />
              Viewers ({viewers.length})
            </Button>
          </div>

          {/* Chat Section */}
          {showChat && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages */}
              <div className="flex-1 relative min-h-0">
                <div className="h-full p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-blue-200 scrollbar-thumb-rounded-full scrollbar-track-rounded-full min-h-0">
                  <div ref={chatRef} className="space-y-2 pr-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-start space-x-2 ${
                          message.type === "join" ? "opacity-75" : ""
                        }`}
                      >
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={message.userAvatar || undefined} />
                          <AvatarFallback className="text-xs">
                            {message.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {message.username}
                            </span>
                            <span className="text-xs text-gray-500">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 break-words">
                            {message.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scroll to Bottom Button */}
                {showScrollToBottom && (
                  <Button
                    onClick={scrollToBottom}
                    size="sm"
                    className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 h-12 p-0 shadow-xl border-2 border-white z-10"
                  >
                    <span className="text-lg font-bold">↓</span>
                  </Button>
                )}
              </div>

              {/* Quick Reactions */}
              <div className="p-2 border-t border-gray-200">
                <div className="flex space-x-2 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => sendReaction("❤️")}
                    className="text-red-500 hover:text-red-600"
                  >
                    ❤️
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => sendReaction("🔥")}
                    className="text-orange-500 hover:text-orange-600"
                  >
                    🔥
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => sendReaction("👏")}
                    className="text-yellow-500 hover:text-yellow-600"
                  >
                    👏
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => sendReaction("🎉")}
                    className="text-green-500 hover:text-green-600"
                  >
                    🎉
                  </Button>
                </div>

                {/* Message Input */}
                <div className="flex space-x-2">
                  <Input
                    placeholder="Type a message..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={sendChatMessage}
                    disabled={!chatMessage.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Viewers Section */}
          {showViewers && (
            <div className="flex-1 p-4 min-h-0">
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-blue-200 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
                <div className="space-y-2 pr-2">
                  {viewers.map((viewer) => (
                    <div
                      key={viewer.id}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={viewer.avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {viewer.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {viewer.username}
                        </p>
                        {viewer.isHost && (
                          <Badge variant="secondary" className="text-xs">
                            <Crown className="w-3 h-3 mr-1" />
                            Host
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
