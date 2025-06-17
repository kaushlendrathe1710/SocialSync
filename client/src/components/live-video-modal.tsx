import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings,
  Users,
  Eye
} from 'lucide-react';

interface LiveVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LiveVideoModal({ isOpen, onClose }: LiveVideoModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(true);

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setPrivacy('public');
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsPreviewMode(true);
    onClose();
  };

  const handleStartLive = () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please add a title for your live video",
        variant: "destructive",
      });
      return;
    }

    // In a real implementation, this would integrate with WebRTC or streaming service
    toast({
      title: "Live video feature",
      description: "Live streaming would be implemented with WebRTC integration",
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