import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Settings,
  Camera,
  Edit,
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

export default function LiveStreamPage() {
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
  const [stream, setStream] = useState<LiveStream | null>(null);

  // Camera and streaming states
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<
    "granted" | "denied" | "prompt"
  >("prompt");

  // Stream setup states
  const [showSetupModal, setShowSetupModal] = useState(true);
  const [streamTitle, setStreamTitle] = useState("");
  const [streamDescription, setStreamDescription] = useState("");
  const [setupStep, setSetupStep] = useState<"camera" | "details" | "ready">(
    "camera"
  );

  // Mock stream data for now - in real app this would come from URL params or API
  useEffect(() => {
    const mockStream: LiveStream = {
      id: 1,
      title: streamTitle || "New Live Stream",
      description: streamDescription || "",
      privacy: "public",
      isActive: true,
      viewerCount: 0,
      startedAt: new Date().toISOString(),
      user: {
        id: user?.id || 0,
        name: user?.name || user?.username || "",
        username:
          user?.username ||
          (user?.name ? user.name.toLowerCase().replace(/\s+/g, "") : ""),
        avatar: user?.avatar,
      },
    };
    setStream(mockStream);
  }, [user?.id, user?.name, user?.username, user?.avatar]);

  // Request camera and microphone access
  const requestCameraAccess = async () => {
    try {
      console.log("Checking if getUserMedia is supported...");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia is not supported in this browser");
      }

      console.log("Requesting camera and microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: true,
      });

      console.log("Camera access granted, setting up video...");
      setMediaStream(stream);
      setCameraPermission("granted");

      // Wait a bit for the video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          console.log("Setting video srcObject...");
          videoRef.current.srcObject = stream;
          videoRef.current
            .play()
            .catch((e) => console.error("Video play error:", e));
        }
      }, 100);

      toast({
        title: "Camera access granted!",
        description: "Your camera and microphone are now active.",
      });

      // Move to next step
      setSetupStep("details");
    } catch (error: any) {
      console.error("Error accessing camera:", error);
      setCameraPermission("denied");

      if (error.name === "NotAllowedError") {
        toast({
          title: "Camera access denied",
          description: "Please allow camera and microphone access to go live.",
          variant: "destructive",
        });
      } else if (error.name === "NotFoundError") {
        toast({
          title: "No camera found",
          description: "Please connect a camera to your device.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Camera error",
          description: `Unable to access camera: ${error.message}`,
          variant: "destructive",
        });
      }
    }
  };

  // Set up WebSocket connection for real-time features
  useEffect(() => {
    if (stream && !websocket && isStreaming) {
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

        // Add some test messages to demonstrate scrolling
        const testMessages = [
          {
            id: "test-1",
            userId: 999,
            username: "Test User 1",
            userAvatar: undefined,
            message: "Welcome to the live stream! 🎉",
            timestamp: new Date(),
            type: "message" as const,
          },
          {
            id: "test-2",
            userId: 998,
            username: "Test User 2",
            userAvatar: undefined,
            message: "This is amazing! 🔥",
            timestamp: new Date(),
            type: "message" as const,
          },
          {
            id: "test-3",
            userId: 997,
            username: "Test User 3",
            userAvatar: undefined,
            message: "Great content! 👏",
            timestamp: new Date(),
            type: "message" as const,
          },
          {
            id: "test-4",
            userId: 996,
            username: "Test User 4",
            userAvatar: undefined,
            message: "Keep it up! 💪",
            timestamp: new Date(),
            type: "message" as const,
          },
          {
            id: "test-5",
            userId: 995,
            username: "Test User 5",
            userAvatar: undefined,
            message: "Love this stream! ❤️",
            timestamp: new Date(),
            type: "message" as const,
          },
          {
            id: "test-6",
            userId: 994,
            username: "Test User 6",
            userAvatar: undefined,
            message: "Can't wait for more! 🚀",
            timestamp: new Date(),
            type: "message" as const,
          },
          {
            id: "test-7",
            userId: 993,
            username: "Test User 7",
            userAvatar: undefined,
            message: "This is so entertaining! 🎭",
            timestamp: new Date(),
            type: "message" as const,
          },
          {
            id: "test-8",
            userId: 992,
            username: "Test User 8",
            userAvatar: undefined,
            message: "Best stream ever! 🌟",
            timestamp: new Date(),
            type: "message" as const,
          },
        ];
        setMessages(testMessages);
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
  }, [stream, user?.id, isStreaming]);

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

  // Track stream duration
  useEffect(() => {
    if (stream && isStreaming) {
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
  }, [stream, isStreaming]);

  const sendChatMessage = () => {
    if (!chatMessage.trim() || !stream) return;

    // If WebSocket is not connected, add message locally for demo
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      const newMessage = {
        id: `local-${Date.now()}`,
        userId: user?.id || 0,
        username: user?.name || "You",
        userAvatar: user?.avatar,
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
        userAvatar: user?.avatar,
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

  // Camera and microphone controls
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

  const startStreaming = () => {
    if (!streamTitle.trim()) {
      toast({
        title: "Stream title required",
        description: "Please enter a title for your stream.",
        variant: "destructive",
      });
      return;
    }

    // Update stream with user input
    const updatedStream = {
      ...stream!,
      title: streamTitle.trim(),
      description: streamDescription.trim() || undefined,
      startedAt: new Date().toISOString(),
    };
    setStream(updatedStream);

    setIsStreaming(true);
    setShowSetupModal(false);

    toast({
      title: "Live stream started!",
      description: "You are now broadcasting live to your viewers.",
    });
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    toast({
      title: "Live stream ended",
      description: "Your broadcast has been stopped.",
    });
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
    setLocation("/feed");
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

  // Ensure media stream is always attached to the current video element
  useEffect(() => {
    if (!mediaStream) return;
    const video = videoRef.current;
    if (!video) return;

    try {
      video.srcObject = mediaStream;
      video.muted = true;
      const onLoaded = () => {
        video.play().catch((e) => console.error("Video play error:", e));
      };
      video.addEventListener("loadedmetadata", onLoaded);
      // Attempt immediate play as well
      video.play().catch((e) => console.warn("Immediate play deferred:", e));
      return () => video.removeEventListener("loadedmetadata", onLoaded);
    } catch (e) {
      console.error("Failed to attach media stream:", e);
    }
  }, [mediaStream, showSetupModal, isStreaming]);

  if (!stream) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading live stream...</p>
        </div>
      </div>
    );
  }

  // Stream Setup Modal
  if (showSetupModal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="text-center mb-6">
            <Video className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Go Live</h1>
            <p className="text-gray-600">Set up your live stream</p>
          </div>

          {/* Step 1: Camera Access */}
          {setupStep === "camera" && (
            <div className="space-y-6">
              <div className="text-center">
                <Camera className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">
                  Camera & Microphone Access
                </h2>
                <p className="text-gray-600 mb-6">
                  We need access to your camera and microphone to start your
                  live stream.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      cameraPermission === "granted"
                        ? "bg-green-500"
                        : cameraPermission === "denied"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                  ></div>
                  <span className="font-medium">
                    {cameraPermission === "granted"
                      ? "Camera Access Granted"
                      : cameraPermission === "denied"
                      ? "Camera Access Denied"
                      : "Requesting Camera Access..."}
                  </span>
                </div>

                {cameraPermission === "granted" && (
                  <div className="bg-black rounded-lg aspect-video overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {cameraPermission === "denied" && (
                  <div className="text-center py-8">
                    <Video className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-50" />
                    <p className="text-red-600 mb-4">
                      Camera access was denied
                    </p>
                    <Button
                      onClick={requestCameraAccess}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Try Again
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={requestCameraAccess}
                  disabled={cameraPermission === "granted"}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {cameraPermission === "granted"
                    ? "Camera Ready"
                    : "Enable Camera"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Stream Details */}
          {setupStep === "details" && (
            <div className="space-y-6">
              <div className="text-center">
                <Edit className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Stream Details</h2>
                <p className="text-gray-600 mb-6">
                  Set the title and description for your live stream.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="title"
                    className="text-sm font-medium text-gray-700"
                  >
                    Stream Title *
                  </Label>
                  <Input
                    id="title"
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    placeholder="Enter your stream title..."
                    className="mt-1"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {streamTitle.length}/100 characters
                  </p>
                </div>

                <div>
                  <Label
                    htmlFor="description"
                    className="text-sm font-medium text-gray-700"
                  >
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="description"
                    value={streamDescription}
                    onChange={(e) => setStreamDescription(e.target.value)}
                    placeholder="Tell viewers what your stream is about..."
                    className="mt-1"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {streamDescription.length}/500 characters
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setSetupStep("camera")}
                >
                  Back
                </Button>
                <Button
                  onClick={() => setSetupStep("ready")}
                  disabled={!streamTitle.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Ready to Stream */}
          {setupStep === "ready" && (
            <div className="space-y-6">
              <div className="text-center">
                <Video className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">
                  Ready to Go Live!
                </h2>
                <p className="text-gray-600 mb-6">
                  Review your stream details and start broadcasting.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Title:
                  </span>
                  <p className="text-gray-900">{streamTitle}</p>
                </div>
                {streamDescription && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Description:
                    </span>
                    <p className="text-gray-900">{streamDescription}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Camera:
                  </span>
                  <p className="text-green-600">✓ Ready</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Microphone:
                  </span>
                  <p className="text-green-600">✓ Ready</p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setSetupStep("details")}
                >
                  Back
                </Button>
                <Button
                  onClick={startStreaming}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Start Live Stream
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

      <div className="flex h-[calc(100vh-64px)] min-h-0">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Video Display */}
          <div className="relative bg-black rounded-lg m-4 aspect-video overflow-hidden flex-1">
            {cameraPermission === "granted" && mediaStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                <div className="text-center">
                  <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">
                    {cameraPermission === "denied"
                      ? "Camera Access Denied"
                      : "Requesting Camera Access..."}
                  </p>
                  <p className="text-sm opacity-75">{stream.title}</p>
                  <p className="text-xs opacity-50 mt-2">
                    by {stream.user.name}
                  </p>
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

            {/* Camera Controls */}
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

            {/* Streaming Controls */}
            <div className="absolute top-4 right-4">
              <Button
                onClick={isStreaming ? stopStreaming : startStreaming}
                className={`${
                  isStreaming
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                } text-white`}
              >
                {isStreaming ? "Stop Stream" : "Start Stream"}
              </Button>
            </div>
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
                <div
                  className="h-full p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-blue-200 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "#2563eb #dbeafe",
                    minHeight: "0",
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
            <div className="flex-1 p-4 min-h-0">
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
    </div>
  );
}
