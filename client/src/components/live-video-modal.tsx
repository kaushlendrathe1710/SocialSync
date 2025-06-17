import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings,
  Users,
  Eye,
  StopCircle,
  Radio,
  AlertCircle
} from 'lucide-react';

interface LiveVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LiveVideoModal({ isOpen, onClose }: LiveVideoModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState('');

  // Initialize camera and microphone
  useEffect(() => {
    if (isOpen && !stream) {
      initializeMedia();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  const initializeMedia = async () => {
    try {
      setIsSettingUp(true);
      setPermissionError('');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      
      setStream(mediaStream);
      setHasPermissions(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPermissionError(`Camera/microphone access denied: ${errorMessage}`);
      toast({
        title: "Permission denied",
        description: "Please allow camera and microphone access to start live video",
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

  const createLiveStreamMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; privacy: string }) => {
      const response = await fetch('/api/live-streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create live stream');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({
        title: "Live stream started!",
        description: "Your live video is now broadcasting",
      });
    }
  });

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setTitle('');
    setDescription('');
    setPrivacy('public');
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsLive(false);
    setHasPermissions(false);
    setPermissionError('');
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
    setViewerCount(Math.floor(Math.random() * 50) + 1); // Simulated viewer count
    
    // Create the live stream record
    createLiveStreamMutation.mutate({
      title,
      description,
      privacy
    });
  };

  const handleStopLive = () => {
    setIsLive(false);
    setViewerCount(0);
    toast({
      title: "Live stream ended",
      description: "Your live video has been saved to your profile",
    });
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Video className="w-5 h-5 text-red-500" />
            <span>Go Live</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user?.avatar || undefined} />
              <AvatarFallback>
                {user?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-semibold">{user?.name}</h4>
              <Select value={privacy} onValueChange={setPrivacy}>
                <SelectTrigger className="w-fit bg-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Public</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="friends">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Friends</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4" />
                      <span>Only me</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Live Video Preview */}
          <div className="relative bg-black rounded-lg aspect-video flex items-center justify-center">
            {isPreviewMode ? (
              <div className="text-white text-center">
                <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Camera preview will appear here</p>
                <p className="text-sm opacity-75">Click "Start Live Video" to begin</p>
              </div>
            ) : (
              <div className="text-white text-center">
                <div className="animate-pulse">
                  <div className="w-4 h-4 bg-red-500 rounded-full mx-auto mb-2"></div>
                  <p>LIVE</p>
                </div>
              </div>
            )}
            
            {/* Control buttons overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
              <Button
                variant={isVideoEnabled ? "secondary" : "destructive"}
                size="icon"
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
              >
                {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </Button>
              <Button
                variant={isAudioEnabled ? "secondary" : "destructive"}
                size="icon"
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              >
                {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </Button>
              <Button variant="secondary" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Live Video Details */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
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
              <label className="text-sm font-medium mb-1 block">Description (optional)</label>
              <Textarea
                placeholder="Tell viewers what to expect..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={500}
              />
            </div>
          </div>

          {/* Live Video Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Live Video Tips:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Make sure you have a stable internet connection</li>
              <li>• Your live video will be saved to your profile</li>
              <li>• Viewers can comment and react in real-time</li>
              <li>• You'll receive notifications when people join</li>
            </ul>
          </div>

          <div className="flex space-x-3">
            <Button onClick={handleClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleStartLive}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              <Video className="w-4 h-4 mr-2" />
              Start Live Video
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}