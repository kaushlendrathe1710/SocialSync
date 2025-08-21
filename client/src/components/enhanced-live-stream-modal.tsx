import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Settings,
  Users,
  Eye,
  Clock,
  StopCircle,
  Radio,
  AlertCircle,
  Send,
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
  Smile,
  Gift,
  Crown,
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

interface EnhancedLiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EnhancedLiveStreamModal({
  isOpen,
  onClose,
}: EnhancedLiveStreamModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [currentStreamId, setCurrentStreamId] = useState<number | null>(null);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<LiveStreamMessage[]>([]);
  const [viewers, setViewers] = useState<LiveStreamViewer[]>([]);
  const [showChat, setShowChat] = useState(true);
  const [showViewers, setShowViewers] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Initialize camera and microphone
  useEffect(() => {
    if (isOpen && !stream) {
      initializeMedia();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  // Ensure video stream is properly connected when stream changes
  useEffect(() => {
    if (stream && videoRef.current && hasPermissions) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [stream, hasPermissions]);

  // Set up WebSocket connection for real-time features
  useEffect(() => {
    if (isOpen && !websocket) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected for live stream");
        setWebsocket(ws);

        // Join as host if we have a stream ID
        if (currentStreamId) {
          ws.send(
            JSON.stringify({
              type: "join_stream_as_host",
              streamId: currentStreamId,
              userId: user?.id,
            })
          );
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "viewer_count_update":
              if (data.streamId === currentStreamId) {
                setViewerCount(data.viewerCount);
              }
              break;
            case "chat_message":
              if (data.streamId === currentStreamId) {
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
              if (data.streamId === currentStreamId) {
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
              if (data.streamId === currentStreamId) {
                setViewers((prev) => prev.filter((v) => v.id !== data.userId));
              }
              break;
            case "reaction":
              if (data.streamId === currentStreamId) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `reaction-${Date.now()}`,
                    userId: data.userId,
                    username: data.username,
                    userAvatar: data.userAvatar,
                    message: `❤️ ${data.reactionType}`,
                    timestamp: new Date(),
                    type: "reaction",
                  },
                ]);
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
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    }

    return () => {
      if (websocket) {
        websocket.close();
        setWebsocket(null);
      }
    };
  }, [isOpen, currentStreamId, user?.id]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    console.log("Messages changed, attempting to scroll to bottom");
    if (chatRef.current) {
      const scrollContainer = chatRef.current.parentElement;
      console.log("Scroll container found:", !!scrollContainer);
      if (scrollContainer) {
        console.log(
          "Scrolling to bottom, scrollHeight:",
          scrollContainer.scrollHeight
        );
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

  const initializeMedia = async () => {
    try {
      setIsSettingUp(true);
      setPermissionError("");

      const constraints = {
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: "user",
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );
      setStream(mediaStream);
      setHasPermissions(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
          } catch (playError) {
            console.error("Error playing video:", playError);
          }
        };
      }
    } catch (error) {
      console.error("Media initialization error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setPermissionError(`Camera/microphone access denied: ${errorMessage}`);
      toast({
        title: "Permission denied",
        description:
          "Please allow camera and microphone access to start live video",
        variant: "destructive",
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim() || !websocket || !currentStreamId) return;

    const messageData = {
      type: "send_chat_message",
      streamId: currentStreamId,
      message: chatMessage.trim(),
      userId: user?.id,
      username: user?.name,
      userAvatar: user?.avatar,
    };

    websocket.send(JSON.stringify(messageData));
    setChatMessage("");
  };

  const sendReaction = (reactionType: string) => {
    if (!websocket || !currentStreamId) return;

    const reactionData = {
      type: "send_reaction",
      streamId: currentStreamId,
      reactionType,
      userId: user?.id,
      username: user?.name,
      userAvatar: user?.avatar,
    };

    websocket.send(JSON.stringify(reactionData));
  };

  const createLiveStreamMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      privacy: string;
    }) => {
      const response = await fetch("/api/live-streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create live stream");
      return response.json();
    },
    onSuccess: (data) => {
      const streamId = data.id;
      setCurrentStreamId(streamId);

      // Join the stream as host via WebSocket
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(
          JSON.stringify({
            type: "join_stream_as_host",
            streamId: streamId,
            userId: user?.id,
          })
        );
      }

      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/live-streams"] });

      toast({
        title: "Live stream started!",
        description: "Your stream is now live with chat enabled",
      });
    },
  });

  const handleClose = () => {
    if (
      currentStreamId &&
      websocket &&
      websocket.readyState === WebSocket.OPEN
    ) {
      websocket.send(
        JSON.stringify({
          type: "leave_stream",
          streamId: currentStreamId,
        })
      );
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setTitle("");
    setDescription("");
    setPrivacy("public");
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsLive(false);
    setViewerCount(0);
    setRecordingTime(0);
    setStartTime(null);
    setCurrentStreamId(null);
    setHasPermissions(false);
    setPermissionError("");
    setMessages([]);
    setViewers([]);
    setChatMessage("");
    onClose();
  };

  const handleStartLive = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please add a title for your live video",
        variant: "destructive",
      });
      return;
    }

    if (!hasPermissions) {
      toast({
        title: "Camera access required",
        description: "Please allow camera and microphone access",
        variant: "destructive",
      });
      return;
    }

    setIsLive(true);
    setStartTime(new Date());
    setViewerCount(0);

    createLiveStreamMutation.mutate({
      title,
      description,
      privacy,
    });
  };

  // Track recording time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor(
          (now.getTime() - startTime.getTime()) / 1000
        );
        setRecordingTime(elapsed);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLive, startTime]);

  const formatRecordingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleStopLive = () => {
    setIsLive(false);
    setViewerCount(0);
    setRecordingTime(0);
    setStartTime(null);

    toast({
      title: "Live stream ended",
      description: "Your stream has been ended successfully",
    });

    handleClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

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
              <span>Go Live</span>
            </div>
            <div className="flex items-center space-x-2">
              {isLive && (
                <Badge variant="destructive" className="bg-red-500">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1"></div>
                  LIVE
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Video Area */}
          <div className="flex-1 flex flex-col">
            {/* Video Preview */}
            <div className="relative bg-black rounded-lg aspect-video overflow-hidden flex-1">
              {isSettingUp ? (
                <div className="flex items-center justify-center h-full text-white">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Setting up camera...</p>
                  </div>
                </div>
              ) : permissionError ? (
                <div className="flex items-center justify-center h-full text-white">
                  <div className="text-center">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                    <p className="text-lg mb-2">Camera Access Required</p>
                    <p className="text-sm opacity-75 mb-4">{permissionError}</p>
                    <Button
                      onClick={initializeMedia}
                      variant="secondary"
                      size="sm"
                    >
                      Retry Camera Access
                    </Button>
                  </div>
                </div>
              ) : hasPermissions ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover transform scale-x-[-1]"
                    style={{
                      filter: "brightness(1.1) contrast(1.1)",
                      backgroundColor: "#000",
                      minHeight: "100%",
                      minWidth: "100%",
                    }}
                  />
                  {isLive && (
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
                        {formatRecordingTime(recordingTime)}
                      </Badge>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  <div className="text-center">
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Camera preview will appear here</p>
                    <p className="text-sm opacity-75">
                      Allow camera access to continue
                    </p>
                  </div>
                </div>
              )}

              {/* Control buttons overlay */}
              {hasPermissions && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
                  <Button
                    variant={isVideoEnabled ? "secondary" : "destructive"}
                    size="icon"
                    onClick={toggleVideo}
                    className="bg-black/50 hover:bg-black/70"
                  >
                    {isVideoEnabled ? (
                      <Video className="w-4 h-4" />
                    ) : (
                      <VideoOff className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant={isAudioEnabled ? "secondary" : "destructive"}
                    size="icon"
                    onClick={toggleAudio}
                    className="bg-black/50 hover:bg-black/70"
                  >
                    {isAudioEnabled ? (
                      <Mic className="w-4 h-4" />
                    ) : (
                      <MicOff className="w-4 h-4" />
                    )}
                  </Button>
                  {isLive && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={handleStopLive}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <StopCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Stream Info */}
            {!isLive && (
              <div className="p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user?.avatar || undefined} />
                    <AvatarFallback>
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <h4 className="font-semibold">{user?.name}</h4>
                    <Select value={privacy} onValueChange={setPrivacy}>
                      <SelectTrigger className="w-32 bg-muted">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="friends">Friends</SelectItem>
                        <SelectItem value="private">Only me</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="What's your live video about?"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Description (optional)
                  </label>
                  <Textarea
                    placeholder="Tell viewers what to expect..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[80px] resize-none"
                    maxLength={500}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Chat and Viewers Sidebar */}
          {isLive && (
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

                    {/* Scroll Indicator */}
                    <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full border border-blue-300">
                      Scroll to see more messages ({messages.length} messages)
                    </div>
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
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 p-4 border-t border-gray-200">
          <Button onClick={handleClose} variant="outline" className="flex-1">
            Cancel
          </Button>
          {isLive ? (
            <Button
              onClick={handleStopLive}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={createLiveStreamMutation.isPending}
            >
              <StopCircle className="w-4 h-4 mr-2" />
              End Live Stream
            </Button>
          ) : (
            <Button
              onClick={handleStartLive}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              disabled={!hasPermissions || createLiveStreamMutation.isPending}
            >
              {createLiveStreamMutation.isPending ? (
                <div className="w-4 h-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Radio className="w-4 h-4 mr-2" />
              )}
              Go Live
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
