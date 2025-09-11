import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
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

interface LiveStreamViewerEnhancedProps {
  isOpen: boolean;
  onClose: () => void;
  stream: LiveStream | null;
}

export default function LiveStreamViewerEnhanced({
  isOpen,
  onClose,
  stream,
}: LiveStreamViewerEnhancedProps) {
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Set up WebSocket connection for real-time features
  useEffect(() => {
    if (isOpen && stream && !websocket) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected for live stream viewing");
        setWebsocket(ws);

        // Join the stream as a viewer
        ws.send(
          JSON.stringify({
            type: "join_stream",
            streamId: stream.id,
            userId: user?.id,
          })
        );
        setIsJoined(true);
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
            case "stream_ended":
              if (data.streamId === stream.id) {
                toast({
                  title: "Stream ended",
                  description: "The host has ended the live stream",
                });
                onClose();
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
  }, [isOpen, stream, user?.id]);

  // Initialize video stream
  useEffect(() => {
    if (isOpen && stream && videoRef.current) {
      initializeVideoStream();
    }
  }, [isOpen, stream]);

  const initializeVideoStream = async () => {
    try {
      setIsLoading(true);
      setStreamError(null);

      // Try to get user's camera and microphone for a real stream
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, frameRate: 30 },
          audio: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
          setIsLoading(false);
          return;
        }
      } catch (mediaError) {
        console.log("Camera/microphone access denied, using placeholder");
      }

      // Fallback to placeholder if camera access is denied
      if (videoRef.current) {
        // Create a canvas-based video stream as a placeholder
        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          // Draw a gradient background
          const gradient = ctx.createLinearGradient(
            0,
            0,
            canvas.width,
            canvas.height
          );
          gradient.addColorStop(0, "#667eea");
          gradient.addColorStop(1, "#764ba2");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Add text
          ctx.fillStyle = "white";
          ctx.font = "48px Arial";
          ctx.textAlign = "center";
          ctx.fillText(
            stream?.title || "Live Stream",
            canvas.width / 2,
            canvas.height / 2 - 50
          );

          ctx.font = "24px Arial";
          ctx.fillText(
            `by ${stream?.user.name}`,
            canvas.width / 2,
            canvas.height / 2 + 20
          );

          ctx.font = "18px Arial";
          ctx.fillText(
            "Live streaming will be available soon",
            canvas.width / 2,
            canvas.height / 2 + 60
          );

          // Create a video stream from canvas
          const stream = canvas.captureStream(30); // 30 FPS
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }

      // Simulate loading time
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error("Error initializing video stream:", error);
      setStreamError("Failed to load video stream");
      setIsLoading(false);
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
    if (stream && isOpen) {
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
  }, [stream, isOpen]);

  const sendChatMessage = () => {
    if (!chatMessage.trim() || !websocket || !stream) return;

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
    if (!websocket || !stream) return;

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

  const handleClose = () => {
    if (stream && websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(
        JSON.stringify({
          type: "leave_stream",
          streamId: stream.id,
        })
      );
    }

    setMessages([]);
    setViewers([]);
    setChatMessage("");
    setViewerCount(0);
    setIsJoined(false);
    setStreamDuration(0);
    setIsLoading(true);
    setStreamError(null);
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

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!stream) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={`${
          isFullscreen
            ? "max-w-full max-h-full w-full h-full"
            : "max-w-6xl max-h-[90vh]"
        } overflow-hidden`}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Video className="w-5 h-5 text-red-500" />
              <span>{stream.title}</span>
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
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Video Area */}
          <div className="flex-1 flex flex-col">
            {/* Video Display */}
            <div className="relative bg-black rounded-lg aspect-video overflow-hidden flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-white">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Connecting to stream...</p>
                  </div>
                </div>
              ) : streamError ? (
                <div className="flex items-center justify-center h-full text-white">
                  <div className="text-center">
                    <Video className="w-16 h-16 mx-auto mb-4 text-red-400" />
                    <p className="text-lg mb-2">Stream Error</p>
                    <p className="text-sm opacity-75 mb-4">{streamError}</p>
                    <Button
                      onClick={initializeVideoStream}
                      variant="secondary"
                      size="sm"
                    >
                      Retry Connection
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    onLoadStart={() => console.log("Video load started")}
                    onCanPlay={() => console.log("Video can play")}
                    onPlay={() => console.log("Video started playing")}
                    onError={(e) => {
                      console.error("Video error:", e);
                      setStreamError("Video playback error");
                    }}
                  />

                  {/* Stream Info Overlay */}
                  <div className="absolute top-4 left-4 flex items-center space-x-2">
                    <Badge variant="destructive" className="bg-red-500">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1"></div>
                      LIVE
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-black/50 text-white"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {viewerCount}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-black/50 text-white"
                    >
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
                      <p className="text-sm opacity-75">
                        @{stream.user.username}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-yellow-500 text-white"
                    >
                      <Crown className="w-3 h-3 mr-1" />
                      Host
                    </Badge>
                  </div>

                  {/* Video Controls */}
                  <div className="absolute bottom-4 right-4 flex space-x-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      className="bg-black/50 hover:bg-black/70"
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFullscreen}
                      className="bg-black/50 hover:bg-black/70"
                    >
                      {isFullscreen ? (
                        <Minimize className="w-5 h-5" />
                      ) : (
                        <Maximize className="w-5 h-5" />
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

                  {/* Volume Slider */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-32">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Stream Description */}
            <div className="p-4 border-t border-gray-200">
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
          <div className="w-80 border-l border-gray-200 flex flex-col">
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
              <div className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 relative">
                  <div
                    className="h-full p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-blue-200 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                    style={{
                      scrollbarWidth: "thin",
                      scrollbarColor: "#2563eb #dbeafe",
                      minHeight: "300px",
                    }}
                  >
                    <div ref={chatRef} className="space-y-2 pr-2">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex items-start space-x-2 ${
                            message.type === "join" ? "opacity-75" : ""
                          }`}
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarImage
                              src={message.userAvatar || undefined}
                            />
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
              <div className="flex-1 p-4">
                <div
                  className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-blue-200 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "#2563eb #dbeafe",
                  }}
                >
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
      </DialogContent>
    </Dialog>
  );
}
