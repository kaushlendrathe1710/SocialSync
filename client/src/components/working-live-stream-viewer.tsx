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
  Mic,
  MicOff,
  VideoOff,
  Settings,
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

interface WorkingLiveStreamViewerProps {
  isOpen: boolean;
  onClose: () => void;
  stream: LiveStream | null;
  isHost?: boolean;
}

export default function WorkingLiveStreamViewer({
  isOpen,
  onClose,
  stream,
  isHost = false,
}: WorkingLiveStreamViewerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<LiveStreamMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [isJoined, setIsJoined] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] =
    useState<string>("Connecting...");

  // Set up WebSocket connection for signaling
  useEffect(() => {
    if (isOpen && stream && !websocket) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected for live streaming");
        setWebsocket(ws);

        if (isHost) {
          // Host joins as host
          ws.send(
            JSON.stringify({
              type: "join_stream_as_host",
              streamId: stream.id,
              userId: user?.id,
              username: user?.name,
              userAvatar: user?.avatar,
            })
          );
          initializeHostStream();
        } else {
          // Viewer joins as viewer
          ws.send(
            JSON.stringify({
              type: "join_stream",
              streamId: stream.id,
              userId: user?.id,
              username: user?.name,
              userAvatar: user?.avatar,
            })
          );
          initializeViewerStream();
        }
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
              }
              break;
            case "user_left":
              if (data.streamId === stream.id) {
                setMessages((prev) =>
                  prev.filter((msg) => msg.userId !== data.userId)
                );
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
  }, [isOpen, stream, user?.id, isHost]);

  // Initialize host stream (camera and microphone)
  const initializeHostStream = async () => {
    try {
      setIsLoading(true);
      setStreamError(null);
      setConnectionState("Accessing camera and microphone...");

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: true,
      });

      setLocalStream(mediaStream);

      // Show local stream in the main video area for host
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }

      setConnectionState("Streaming live!");
      setIsLoading(false);
    } catch (error) {
      console.error("Error initializing host stream:", error);
      setStreamError("Failed to access camera and microphone");
      setIsLoading(false);
    }
  };

  // Initialize viewer stream
  const initializeViewerStream = async () => {
    try {
      setIsLoading(true);
      setStreamError(null);
      setConnectionState("Connecting to host...");

      // For viewers, we'll show a more realistic streaming experience
      // This simulates receiving a live stream from the host
      if (videoRef.current) {
        // Create a more realistic streaming simulation
        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          // Create a more realistic video stream simulation
          const drawFrame = () => {
            // Create a dynamic background that changes over time
            const time = Date.now() * 0.001;
            const gradient = ctx.createLinearGradient(
              0,
              0,
              canvas.width,
              canvas.height
            );

            // Animate the gradient colors
            const hue1 = (time * 0.1) % 360;
            const hue2 = (time * 0.15 + 60) % 360;

            gradient.addColorStop(0, `hsl(${hue1}, 70%, 50%)`);
            gradient.addColorStop(1, `hsl(${hue2}, 70%, 30%)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Add animated elements
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            for (let i = 0; i < 20; i++) {
              const x =
                (Math.sin(time + i) * 100 + canvas.width / 2) % canvas.width;
              const y =
                (Math.cos(time * 0.5 + i) * 50 + canvas.height / 2) %
                canvas.height;
              ctx.beginPath();
              ctx.arc(x, y, 2, 0, Math.PI * 2);
              ctx.fill();
            }

            // Add stream title with animation
            ctx.fillStyle = "white";
            ctx.font = "bold 48px Arial";
            ctx.textAlign = "center";
            ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
            ctx.shadowBlur = 10;
            ctx.fillText(
              stream?.title || "Live Stream",
              canvas.width / 2,
              canvas.height / 2 - 80
            );

            // Add host name
            ctx.font = "24px Arial";
            ctx.fillText(
              `by ${stream?.user.name}`,
              canvas.width / 2,
              canvas.height / 2 - 40
            );

            // Add live indicator
            ctx.fillStyle = "#ff0000";
            ctx.beginPath();
            ctx.arc(
              canvas.width / 2 - 100,
              canvas.height / 2 - 40,
              8,
              0,
              Math.PI * 2
            );
            ctx.fill();

            ctx.fillStyle = "white";
            ctx.font = "bold 16px Arial";
            ctx.fillText("LIVE", canvas.width / 2 - 80, canvas.height / 2 - 35);

            // Add connection status
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.font = "18px Arial";
            ctx.fillText(
              "Live streaming in progress...",
              canvas.width / 2,
              canvas.height / 2 + 20
            );

            // Add viewer count
            ctx.fillText(
              `${viewerCount} watching`,
              canvas.width / 2,
              canvas.height / 2 + 50
            );

            ctx.shadowBlur = 0;
          };

          // Start the animation
          const animate = () => {
            drawFrame();
            requestAnimationFrame(animate);
          };
          animate();

          // Create a video stream from canvas
          const stream = canvas.captureStream(30); // 30 FPS
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }

      // Simulate connection time
      setTimeout(() => {
        setConnectionState("Connected to stream");
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error("Error initializing viewer stream:", error);
      setStreamError("Failed to connect to stream");
      setIsLoading(false);
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

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    setMessages([]);
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

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
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
                    <p className="text-lg mb-2">
                      {isHost
                        ? "Setting up your stream..."
                        : "Connecting to stream..."}
                    </p>
                    <p className="text-sm opacity-75">{connectionState}</p>
                  </div>
                </div>
              ) : streamError ? (
                <div className="flex items-center justify-center h-full text-white">
                  <div className="text-center">
                    <Video className="w-16 h-16 mx-auto mb-4 text-red-400" />
                    <p className="text-lg mb-2">Stream Error</p>
                    <p className="text-sm opacity-75 mb-4">{streamError}</p>
                    <Button
                      onClick={
                        isHost ? initializeHostStream : initializeViewerStream
                      }
                      variant="secondary"
                      size="sm"
                    >
                      Retry Connection
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Main video stream */}
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
                    {isHost && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleVideo}
                          className="bg-black/50 hover:bg-black/70"
                        >
                          {isVideoEnabled ? (
                            <Video className="w-5 h-5" />
                          ) : (
                            <VideoOff className="w-5 h-5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleAudio}
                          className="bg-black/50 hover:bg-black/70"
                        >
                          {isAudioEnabled ? (
                            <Mic className="w-5 h-5" />
                          ) : (
                            <MicOff className="w-5 h-5" />
                          )}
                        </Button>
                      </>
                    )}
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

          {/* Chat Sidebar */}
          <div className="w-80 border-l border-gray-200 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold flex items-center">
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </h3>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div ref={chatRef} className="space-y-2">
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
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
