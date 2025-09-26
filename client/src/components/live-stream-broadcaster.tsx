import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Users, 
  MessageCircle, 
  Heart,
  Share2,
  X,
  Settings
} from "lucide-react";

interface LiveStreamBroadcasterProps {
  streamId: number;
  title: string;
  description?: string;
  onEndStream: () => void;
}

interface Message {
  id: string;
  userId: number;
  username: string;
  userAvatar?: string;
  content: string;
  timestamp: Date;
  type?: "text" | "reaction" | "system";
}

export default function LiveStreamBroadcaster({ 
  streamId, 
  title, 
  description, 
  onEndStream 
}: LiveStreamBroadcasterProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [loadingCountdown, setLoadingCountdown] = useState(5);
  const frameCaptureInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize streaming after component mounts
  // Load existing chat messages
  const loadChatMessages = async () => {
    try {
      const response = await fetch(`/api/live-streams/${streamId}/chat?limit=50`);
      if (response.ok) {
        const chatMessages = await response.json();
        const formattedMessages = chatMessages.map((msg: any) => ({
          id: msg.id.toString(),
          username: msg.username,
          content: msg.message,
          timestamp: msg.createdAt,
          type: msg.messageType || "text",
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Error loading chat messages:", error);
    }
  };

  useEffect(() => {
    // Load existing chat messages
    loadChatMessages();
    
    // Add a small delay to ensure the video element is rendered
    const timer = setTimeout(() => {
      startStreaming();
    }, 100);

    return () => {
      clearTimeout(timer);
      stopStreaming();
    };
  }, []);

  const startStreaming = async () => {
    try {
      setIsConnecting(true);
      setVideoError(false);
      setVideoLoaded(false);
      setLoadingTimeout(false);
      setLoadingCountdown(5);
      
      console.log("Requesting camera and microphone access...");
      
      // Set a timeout for camera loading
      const timeoutId = setTimeout(() => {
        if (!videoLoaded) {
          console.log("Camera loading timeout - showing error");
          setLoadingTimeout(true);
          setVideoError(true);
        }
      }, 5000); // 5 second timeout
      
      // Start countdown
      const countdownInterval = setInterval(() => {
        setLoadingCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Get user media with more specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: microphoneEnabled
      });
      
      // Clear timeout since we got the stream
      clearTimeout(timeoutId);
      clearInterval(countdownInterval);
      
      console.log("Media stream obtained:", stream);
      console.log("Video tracks:", stream.getVideoTracks());
      console.log("Audio tracks:", stream.getAudioTracks());
      
      streamRef.current = stream;
      
      // Wait for video element to be available
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait
      
      const waitForVideoElement = () => {
        if (videoRef.current) {
          console.log("Video element found, setting up stream...");
          setupVideoElement();
        } else if (attempts < maxAttempts) {
          attempts++;
          console.log(`Waiting for video element... attempt ${attempts}`);
          setTimeout(waitForVideoElement, 100);
        } else {
          console.error("Video element not found after maximum attempts");
          setVideoError(true);
        }
      };
      
      const setupVideoElement = () => {
        if (!videoRef.current) {
          console.error("Video ref is still null!");
          return;
        }
        
        console.log("Setting video source object...");
        console.log("Video element:", videoRef.current);
        console.log("Stream object:", stream);
        
        videoRef.current.srcObject = stream;
        
        // Add comprehensive event listeners for debugging
        videoRef.current.onloadstart = () => {
          console.log("Video load started");
        };
        
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded");
          console.log("Video dimensions:", videoRef.current?.videoWidth, "x", videoRef.current?.videoHeight);
          console.log("Video duration:", videoRef.current?.duration);
        };
        
        videoRef.current.onloadeddata = () => {
          console.log("Video data loaded");
        };
        
        videoRef.current.oncanplay = () => {
          console.log("Video can play");
          setVideoLoaded(true);
        };
        
        videoRef.current.oncanplaythrough = () => {
          console.log("Video can play through");
        };
        
        videoRef.current.onplay = () => {
          console.log("Video started playing");
        };
        
        videoRef.current.onplaying = () => {
          console.log("Video is playing");
          // Start capturing frames and audio to send to viewers
          startFrameCapture();
          startAudioCapture();
        };
        
        videoRef.current.onerror = (e) => {
          console.error("Video error:", e);
          console.error("Video error details:", videoRef.current?.error);
          setVideoError(true);
        };
        
        // Check if video element is ready
        console.log("Video ready state:", videoRef.current.readyState);
        console.log("Video network state:", videoRef.current.networkState);
        
        // Try to play the video
        try {
          console.log("Attempting to play video...");
          videoRef.current.play().then(() => {
            console.log("Video play started successfully");
            
            // Force a refresh of the video element
            setTimeout(() => {
              if (videoRef.current && streamRef.current) {
                console.log("Force refreshing video element...");
                videoRef.current.srcObject = null;
                videoRef.current.srcObject = streamRef.current;
                videoRef.current.play().catch(console.error);
              }
            }, 1000);
          }).catch((playError) => {
            console.error("Failed to play video:", playError);
            console.error("Play error details:", playError);
          });
        } catch (playError) {
          console.error("Failed to play video:", playError);
          console.error("Play error details:", playError);
        }
      };
      
      // Start waiting for video element
      waitForVideoElement();
      
      // Connect to WebSocket for real-time features
      connectWebSocket();
      
      setIsStreaming(true);
      toast({
        title: "Stream started!",
        description: "You are now live and viewers can join your stream.",
      });
      
    } catch (error) {
      console.error("Failed to start streaming:", error);
      let errorMessage = "Could not access camera or microphone. Please check permissions.";
      
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage = "Camera/microphone access denied. Please allow permissions and try again.";
        } else if (error.name === "NotFoundError") {
          errorMessage = "No camera or microphone found. Please connect a device.";
        } else if (error.name === "NotReadableError") {
          errorMessage = "Camera or microphone is being used by another application.";
        }
      }
      
      toast({
        title: "Failed to start stream",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const startFrameCapture = () => {
    if (!videoRef.current || !wsRef.current) return;
    
    console.log("Starting frame capture for viewers...");
    
    // Capture frames every 100ms (10 FPS)
    frameCaptureInterval.current = setInterval(() => {
      if (videoRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          // Create a canvas to capture the video frame
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (ctx && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            
            // Draw the current video frame to canvas
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            
            // Convert to base64
            const frameData = canvas.toDataURL('image/jpeg', 0.7); // 70% quality
            
            // Send frame to viewers
            wsRef.current.send(JSON.stringify({
              type: 'video_frame',
              streamId: streamId,
              frameData: frameData,
              timestamp: Date.now()
            }));
          }
        } catch (error) {
          console.error("Error capturing frame:", error);
        }
      }
    }, 100); // 10 FPS
  };

  const startAudioCapture = () => {
    if (!streamRef.current || !wsRef.current) return;
    
    console.log("Starting audio capture for viewers...");
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(streamRef.current);
    
    // Create a ScriptProcessorNode for audio processing
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (event) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          const inputBuffer = event.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);
          
          // Convert Float32Array to Int16Array for better compression
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          
          // Send audio data to viewers
          wsRef.current.send(JSON.stringify({
            type: 'audio_data',
            streamId: streamId,
            audioData: Array.from(int16Data),
            sampleRate: audioContext.sampleRate,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error("Error processing audio:", error);
        }
      }
    };
    
    source.connect(processor);
    processor.connect(audioContext.destination);
    
    // Store references for cleanup
    (window as any).audioContext = audioContext;
    (window as any).audioProcessor = processor;
  };

  const stopFrameCapture = () => {
    if (frameCaptureInterval.current) {
      clearInterval(frameCaptureInterval.current);
      frameCaptureInterval.current = null;
      console.log("Stopped frame capture");
    }
    
    // Stop audio capture
    if ((window as any).audioProcessor) {
      (window as any).audioProcessor.disconnect();
      (window as any).audioProcessor = null;
    }
    if ((window as any).audioContext) {
      (window as any).audioContext.close();
      (window as any).audioContext = null;
    }
    console.log("Stopped audio capture");
  };

  const stopStreaming = () => {
    stopFrameCapture();
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsStreaming(false);
  };

  const connectWebSocket = () => {
    console.log("Connecting to WebSocket for live stream:", streamId);
    const ws = new WebSocket(`ws://localhost:5000/ws`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log("Connected to live stream WebSocket");
      console.log("Sending host join message for stream:", streamId);
      // Join the live stream as host
      const hostMessage = {
        type: "live-stream:host",
        streamId: streamId,
        userId: user?.id,
      };
      console.log("Host message:", hostMessage);
      ws.send(JSON.stringify(hostMessage));
    };
    
    ws.onmessage = (event) => {
      console.log("WebSocket message received:", event.data);
      const data = JSON.parse(event.data);
      console.log("Parsed message data:", data);
      
      switch (data.type) {
        case "viewer_count":
        case "viewer_count_update":
          console.log("Viewer count updated:", data.count || data.viewerCount);
          setViewerCount(data.count || data.viewerCount);
          break;
        case "chat_message":
          console.log("New chat message received:", data);
          setMessages(prev => [...prev, {
            id: data.messageId,
            username: data.username,
            content: data.message,
            timestamp: data.timestamp,
            type: "text",
          }]);
          break;
        case "reaction":
          console.log("Reaction received:", data);
          setMessages(prev => [...prev, {
            id: `reaction-${Date.now()}`,
            username: data.username,
            content: data.reactionType,
            timestamp: new Date().toISOString(),
            type: "reaction",
          }]);
          break;
        default:
          console.log("Unknown message type:", data.type);
      }
    };
    
    ws.onclose = (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !cameraEnabled;
        setCameraEnabled(!cameraEnabled);
      }
    }
  };

  const toggleMicrophone = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !microphoneEnabled;
        setMicrophoneEnabled(!microphoneEnabled);
      }
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && wsRef.current) {
      const message = {
        type: "message",
        content: newMessage.trim(),
        streamId,
      };
      
      wsRef.current.send(JSON.stringify(message));
      setNewMessage("");
    }
  };

  const startStreamingWithFallback = async () => {
    try {
      setIsConnecting(true);
      setVideoError(false);
      setVideoLoaded(false);
      setLoadingTimeout(false);
      setLoadingCountdown(5);
      
      console.log("Trying fallback streaming (audio only)...");
      
      // Try with minimal constraints or audio only
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false, // No video
        audio: microphoneEnabled
      });
      
      console.log("Fallback stream obtained:", stream);
      streamRef.current = stream;
      
      // Connect to WebSocket for real-time features
      connectWebSocket();
      
      setIsStreaming(true);
      setVideoLoaded(true); // Mark as loaded even without video
      
      toast({
        title: "Stream started (Audio Only)!",
        description: "Your audio stream is now live. Camera is not available.",
      });
      
    } catch (error) {
      console.error("Failed to start fallback streaming:", error);
      toast({
        title: "Failed to start stream",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
      setVideoError(true);
    } finally {
      setIsConnecting(false);
    }
  };

  const endStream = async () => {
    try {
      console.log("Ending stream with ID:", streamId);
      
      // End stream on server
      const response = await fetch(`/api/live-streams/${streamId}/end`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      console.log("End stream response:", response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error ending stream:", errorData);
        throw new Error(errorData.message || "Failed to end stream on server");
      }
      
      console.log("Stream ended successfully on server");
      
      stopStreaming();
      onEndStream();
      
      toast({
        title: "Stream ended",
        description: "Your live stream has been ended successfully.",
      });
      
    } catch (error) {
      console.error("Failed to end stream:", error);
      toast({
        title: "Error ending stream",
        description: "There was an issue ending your stream.",
        variant: "destructive",
      });
    }
  };

  if (isConnecting) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Starting your live stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex">
      {/* Main video area */}
      <div className="flex-1 relative">
        {videoError ? (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <div className="text-center text-white">
              <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2">
                {loadingTimeout ? "Camera Loading Timeout" : "Camera Not Available"}
              </h3>
              <p className="text-gray-400 mb-4">
                {loadingTimeout 
                  ? "Camera took too long to load. Please check your camera permissions and try again."
                  : "Unable to access your camera. Please check permissions and try again."
                }
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={() => {
                    setVideoError(false);
                    setVideoLoaded(false);
                    setLoadingTimeout(false);
                    startStreaming();
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Try Again
                </Button>
                <Button 
                  onClick={() => {
                    setVideoError(false);
                    setVideoLoaded(false);
                    setLoadingTimeout(false);
                    // Try with different constraints
                    startStreamingWithFallback();
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  Try Without Camera
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            {/* Always render video element */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ backgroundColor: 'black' }}
            />
            
            {/* Loading overlay when video is not loaded */}
            {!videoLoaded && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Loading camera...</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {loadingCountdown > 0 ? `Timeout in ${loadingCountdown}s` : "Checking camera..."}
                  </p>
                </div>
              </div>
            )}
            
            {/* Debug overlay */}
            <div className="absolute top-2 left-2 bg-black/50 text-white p-2 rounded text-xs">
              <div>Stream: {streamRef.current ? 'Active' : 'None'}</div>
              <div>Video Element: {videoRef.current ? 'Ready' : 'Not Ready'}</div>
              <div>Video Source: {videoRef.current?.srcObject ? 'Set' : 'Not Set'}</div>
              <div>Ready State: {videoRef.current?.readyState || 'N/A'}</div>
              <div>Network State: {videoRef.current?.networkState || 'N/A'}</div>
              <div>Video Loaded: {videoLoaded ? 'Yes' : 'No'}</div>
              <button 
                onClick={() => {
                  if (videoRef.current && streamRef.current) {
                    console.log("Manual refresh triggered");
                    videoRef.current.srcObject = null;
                    videoRef.current.srcObject = streamRef.current;
                    videoRef.current.play().catch(console.error);
                  }
                }}
                className="mt-1 px-2 py-1 bg-blue-600 text-white rounded text-xs"
              >
                Refresh Video
              </button>
            </div>
          </div>
        )}
        
        {/* Stream info overlay */}
        <div className="absolute top-4 left-4 text-white">
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && (
            <p className="text-gray-300 mt-1">{description}</p>
          )}
        </div>
        
        {/* Live indicator */}
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <div className="flex items-center space-x-2 bg-red-600 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-white font-semibold">LIVE</span>
          </div>
          <div className="flex items-center space-x-1 bg-black/50 px-3 py-1 rounded-full">
            <Users className="w-4 h-4 text-white" />
            <span className="text-white">{viewerCount}</span>
          </div>
        </div>
        
        {/* Control buttons */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
          <Button
            onClick={toggleCamera}
            variant={cameraEnabled ? "default" : "destructive"}
            size="lg"
            className="rounded-full"
          >
            {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>
          
          <Button
            onClick={toggleMicrophone}
            variant={microphoneEnabled ? "default" : "destructive"}
            size="lg"
            className="rounded-full"
          >
            {microphoneEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>
          
          <Button
            onClick={endStream}
            variant="destructive"
            size="lg"
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      {/* Chat sidebar */}
      <div className="w-80 bg-gray-900 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-white font-semibold">Live Chat</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => (
            <div key={message.id} className="flex space-x-3">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {message.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-semibold text-sm">{message.username}</span>
                  <span className="text-gray-400 text-xs">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {message.type === "reaction" ? (
                  <div className="text-2xl">
                    {message.content}
                  </div>
                ) : (
                  <p className="text-gray-300 text-sm">{message.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-700">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Send a message..."
              className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
            />
            <Button onClick={sendMessage} size="sm">
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
