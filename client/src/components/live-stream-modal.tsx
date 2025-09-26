import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import LiveStreamBroadcaster from "./live-stream-broadcaster";
import {
  Video,
  Camera,
  Mic,
  MicOff,
  VideoOff,
  X,
  ArrowLeft,
  ArrowRight,
  Settings,
  Tag,
  Eye,
  Users,
  Clock,
} from "lucide-react";

interface LiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StreamSetup {
  title: string;
  description: string;
  tags: string[];
  privacy: "public" | "friends" | "private";
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
}

export default function LiveStreamModal({ isOpen, onClose }: LiveStreamModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [currentStep, setCurrentStep] = useState<"details" | "camera" | "ready">("details");
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [streamId, setStreamId] = useState<number | null>(null);
  
  const [setup, setSetup] = useState<StreamSetup>({
    title: "",
    description: "",
    tags: [],
    privacy: "public",
    cameraEnabled: true,
    microphoneEnabled: true,
  });

  const [tagInput, setTagInput] = useState("");

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep("details");
      setSetup({
        title: "",
        description: "",
        tags: [],
        privacy: "public",
        cameraEnabled: true,
        microphoneEnabled: true,
      });
      setTagInput("");
      setHasPermissions(false);
      setPermissionError("");
    } else {
      // Clean up media stream when closing
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }
    }
  }, [isOpen]);

  // Request camera and microphone access
  const requestMediaAccess = async () => {
    try {
      setPermissionError("");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: true,
      });

      setMediaStream(stream);
      setHasPermissions(true);

      // Display stream in video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }

      toast({
        title: "Camera access granted!",
        description: "Your camera and microphone are now active.",
      });

      setCurrentStep("ready");
    } catch (error: any) {
      console.error("Error accessing media:", error);
      setHasPermissions(false);
      
      let errorMessage = "Unable to access camera and microphone.";
      if (error.name === "NotAllowedError") {
        errorMessage = "Camera and microphone access was denied. Please allow access to continue.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No camera or microphone found. Please connect your devices.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera or microphone is being used by another application.";
      }
      
      setPermissionError(errorMessage);
      toast({
        title: "Media access failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Add tag
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !setup.tags.includes(tag) && setup.tags.length < 5) {
      setSetup(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput("");
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setSetup(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Toggle camera
  const toggleCamera = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setSetup(prev => ({ ...prev, cameraEnabled: videoTrack.enabled }));
      }
    }
  };

  // Toggle microphone
  const toggleMicrophone = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setSetup(prev => ({ ...prev, microphoneEnabled: audioTrack.enabled }));
      }
    }
  };

  // Start live stream
  const startLiveStream = async () => {
    if (!setup.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your live stream.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    
    try {
      // Create live stream on server
      const response = await apiRequest("POST", "/api/live-streams", {
        title: setup.title.trim(),
        description: setup.description.trim() || undefined,
        tags: setup.tags,
        privacy: setup.privacy,
      });

      const streamData = await response.json();
      setStreamId(streamData.id);
      
      // Refresh live streams list
      queryClient.invalidateQueries({ queryKey: ["/api/live-streams"] });
      
      toast({
        title: "Live stream created!",
        description: "Starting your broadcast...",
      });

      // Start broadcasting
      setIsBroadcasting(true);
      
    } catch (error: any) {
      console.error("Failed to create live stream:", error);
      toast({
        title: "Failed to start live stream",
        description: error.message || "An error occurred while creating your stream.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEndStream = () => {
    console.log("Ending stream, refreshing live streams list");
    setIsBroadcasting(false);
    setStreamId(null);
    
    // Refresh live streams list to remove the ended stream
    queryClient.invalidateQueries({ queryKey: ["/api/live-streams"] });
    
    onClose();
  };

  // Handle key press for tag input
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Video className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-semibold">Go Live</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep === "details" ? "text-blue-600" : currentStep === "camera" || currentStep === "ready" ? "text-green-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === "details" ? "bg-blue-600 text-white" : currentStep === "camera" || currentStep === "ready" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"}`}>
                1
              </div>
              <span className="text-sm font-medium">Details</span>
            </div>
            <div className={`flex-1 h-0.5 ${currentStep === "camera" || currentStep === "ready" ? "bg-green-600" : "bg-gray-200"}`}></div>
            <div className={`flex items-center space-x-2 ${currentStep === "camera" ? "text-blue-600" : currentStep === "ready" ? "text-green-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === "camera" ? "bg-blue-600 text-white" : currentStep === "ready" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"}`}>
                2
              </div>
              <span className="text-sm font-medium">Camera</span>
            </div>
            <div className={`flex-1 h-0.5 ${currentStep === "ready" ? "bg-green-600" : "bg-gray-200"}`}></div>
            <div className={`flex items-center space-x-2 ${currentStep === "ready" ? "text-blue-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === "ready" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>
                3
              </div>
              <span className="text-sm font-medium">Go Live</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Stream Details */}
          {currentStep === "details" && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Stream Details</h3>
                <p className="text-gray-600">Tell viewers what your stream is about</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                    Stream Title *
                  </Label>
                  <Input
                    id="title"
                    value={setup.title}
                    onChange={(e) => setSetup(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter your stream title..."
                    className="mt-1"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {setup.title.length}/100 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="description"
                    value={setup.description}
                    onChange={(e) => setSetup(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Tell viewers what your stream is about..."
                    className="mt-1"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {setup.description.length}/500 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="tags" className="text-sm font-medium text-gray-700">
                    Tags (Optional)
                  </Label>
                  <div className="mt-1 space-y-2">
                    <div className="flex space-x-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={handleTagKeyPress}
                        placeholder="Add a tag..."
                        className="flex-1"
                        maxLength={20}
                      />
                      <Button
                        type="button"
                        onClick={addTag}
                        disabled={!tagInput.trim() || setup.tags.length >= 5}
                        size="sm"
                      >
                        <Tag className="w-4 h-4" />
                      </Button>
                    </div>
                    {setup.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {setup.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="flex items-center space-x-1"
                          >
                            <span>#{tag}</span>
                            <button
                              onClick={() => removeTag(tag)}
                              className="ml-1 hover:text-red-500"
                              title={`Remove tag ${tag}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      Add up to 5 tags to help viewers find your stream
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Privacy</Label>
                  <div className="mt-1">
                    <Select
                      value={setup.privacy}
                      onValueChange={(value: "public" | "friends" | "private") => 
                        setSetup(prev => ({ ...prev, privacy: value }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select privacy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Who can watch?</SelectLabel>
                          <SelectItem value="public">
                            <div className="flex items-center space-x-2">
                              <Eye className="w-4 h-4" />
                              <span>Public - Everyone can see</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="friends">
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4" />
                              <span>Friends - Your followers only</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="private">
                            <div className="flex items-center space-x-2">
                              <Settings className="w-4 h-4" />
                              <span>Private - Only invited users</span>
                            </div>
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setCurrentStep("camera")}
                  disabled={!setup.title.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Camera Setup */}
          {currentStep === "camera" && (
            <div className="space-y-6">
              <div className="text-center">
                <Camera className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Camera & Microphone</h3>
                <p className="text-gray-600">Set up your camera and microphone for streaming</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                {hasPermissions ? (
                  <div className="space-y-4">
                    <div className="bg-black rounded-lg aspect-video overflow-hidden">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex justify-center space-x-4">
                      <Button
                        onClick={toggleCamera}
                        variant={setup.cameraEnabled ? "default" : "destructive"}
                        size="sm"
                      >
                        {setup.cameraEnabled ? (
                          <>
                            <Camera className="w-4 h-4 mr-2" />
                            Camera On
                          </>
                        ) : (
                          <>
                            <VideoOff className="w-4 h-4 mr-2" />
                            Camera Off
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={toggleMicrophone}
                        variant={setup.microphoneEnabled ? "default" : "destructive"}
                        size="sm"
                      >
                        {setup.microphoneEnabled ? (
                          <>
                            <Mic className="w-4 h-4 mr-2" />
                            Mic On
                          </>
                        ) : (
                          <>
                            <MicOff className="w-4 h-4 mr-2" />
                            Mic Off
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      Click below to allow camera and microphone access
                    </p>
                    {permissionError && (
                      <p className="text-red-600 text-sm mb-4">{permissionError}</p>
                    )}
                    <Button
                      onClick={requestMediaAccess}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Enable Camera & Microphone
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("details")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep("ready")}
                  disabled={!hasPermissions}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Ready to Go Live */}
          {currentStep === "ready" && (
            <div className="space-y-6">
              <div className="text-center">
                <Video className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ready to Go Live!</h3>
                <p className="text-gray-600">Review your settings and start broadcasting</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-700">Title:</span>
                  <p className="text-gray-900">{setup.title}</p>
                </div>
                {setup.description && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Description:</span>
                    <p className="text-gray-900">{setup.description}</p>
                  </div>
                )}
                {setup.tags.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {setup.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">#{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-700">Privacy:</span>
                  <p className="text-gray-900 capitalize">{setup.privacy}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Camera:</span>
                  <p className={setup.cameraEnabled ? "text-green-600" : "text-red-600"}>
                    {setup.cameraEnabled ? "✓ Enabled" : "✗ Disabled"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Microphone:</span>
                  <p className={setup.microphoneEnabled ? "text-green-600" : "text-red-600"}>
                    {setup.microphoneEnabled ? "✓ Enabled" : "✗ Disabled"}
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("camera")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={startLiveStream}
                  disabled={isCreating}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Starting...
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      Go Live
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Live Stream Broadcaster */}
      {isBroadcasting && streamId && (
        <LiveStreamBroadcaster
          streamId={streamId}
          title={setup.title}
          description={setup.description}
          onEndStream={handleEndStream}
        />
      )}
    </div>
  );
}
