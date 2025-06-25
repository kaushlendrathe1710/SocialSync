import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Play, 
  Pause, 
  Heart, 
  MessageCircle, 
  Share, 
  Bookmark,
  Music,
  Plus,
  Volume2,
  VolumeX,
  MoreVertical,
  Upload,
  Video,
  Camera
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Reel {
  id: number;
  userId: number;
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  duration: number;
  privacy: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  trending: boolean;
  createdAt: string;
  user: {
    id: number;
    name: string;
    username: string;
    avatar?: string;
  };
  music?: {
    id: number;
    title: string;
    artist: string;
  };
  isLiked?: boolean;
}

export default function ReelsPage() {
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReel, setNewReel] = useState({
    caption: '',
    privacy: 'public',
    videoFile: null as File | null,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement }>({});

  // Fetch reels
  const { data: reels = [], isLoading } = useQuery({
    queryKey: ['/api/reels'],
  });

  // Create reel mutation
  const createReelMutation = useMutation({
    mutationFn: async (reelData: FormData) => {
      return apiRequest('/api/reels', {
        method: 'POST',
        body: reelData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reels'] });
      setShowCreateModal(false);
      setNewReel({ caption: '', privacy: 'public', videoFile: null });
      toast({
        title: "Reel Created",
        description: "Your reel has been uploaded successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload your reel. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Like reel mutation
  const likeReelMutation = useMutation({
    mutationFn: async (reelId: number) => {
      return apiRequest(`/api/reels/${reelId}/like`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reels'] });
    },
  });

  // Handle video play/pause
  const togglePlayPause = (index: number) => {
    const video = videoRefs.current[index];
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  // Handle mute/unmute
  const toggleMute = () => {
    Object.values(videoRefs.current).forEach(video => {
      if (video) {
        video.muted = !isMuted;
      }
    });
    setIsMuted(!isMuted);
  };

  // Handle scroll to next reel
  const handleScroll = (e: React.WheelEvent) => {
    if (e.deltaY > 0 && currentReelIndex < reels.length - 1) {
      setCurrentReelIndex(currentReelIndex + 1);
    } else if (e.deltaY < 0 && currentReelIndex > 0) {
      setCurrentReelIndex(currentReelIndex - 1);
    }
  };

  // Auto-play current video
  useEffect(() => {
    Object.values(videoRefs.current).forEach((video, index) => {
      if (video) {
        if (index === currentReelIndex) {
          video.play();
          setIsPlaying(true);
        } else {
          video.pause();
        }
      }
    });
  }, [currentReelIndex]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setNewReel({ ...newReel, videoFile: file });
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid video file.",
        variant: "destructive",
      });
    }
  };

  // Submit new reel
  const handleSubmitReel = () => {
    if (!newReel.videoFile) {
      toast({
        title: "No Video Selected",
        description: "Please select a video to upload.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('video', newReel.videoFile);
    formData.append('caption', newReel.caption);
    formData.append('privacy', newReel.privacy);

    createReelMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading Reels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="fixed top-16 left-0 right-0 z-20 bg-gradient-to-b from-black/90 via-black/60 to-transparent p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">Reels</h1>
            <div className="hidden sm:block">
              <span className="text-sm text-gray-300">Discover amazing videos</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white hover:bg-white/20 rounded-full"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Create Reel Button - Prominent Center Position */}
      <div className="fixed top-28 left-1/2 transform -translate-x-1/2 z-30">
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 rounded-full px-8 py-3 border-3 border-white/30 animate-pulse"
            >
              <Camera className="w-6 h-6 mr-2" />
              Create Reel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Video className="w-5 h-5 mr-2" />
                Create New Reel
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Upload Video</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="video-upload"
                  />
                  <label
                    htmlFor="video-upload"
                    className="cursor-pointer"
                  >
                    {newReel.videoFile ? (
                      <div className="flex items-center justify-center space-x-2">
                        <Video className="w-8 h-8 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-green-600">{newReel.videoFile.name}</p>
                          <p className="text-xs text-gray-500">Click to change video</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">Click to upload video</p>
                        <p className="text-xs text-gray-400">MP4, MOV, AVI up to 100MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Caption</label>
                <Textarea
                  placeholder="What's this reel about? Add hashtags and mentions..."
                  value={newReel.caption}
                  onChange={(e) => setNewReel({ ...newReel, caption: e.target.value })}
                  className="min-h-[80px]"
                  maxLength={150}
                />
                <p className="text-xs text-gray-400 mt-1">{newReel.caption.length}/150 characters</p>
              </div>
              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReel}
                  disabled={createReelMutation.isPending || !newReel.videoFile}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  {createReelMutation.isPending ? 'Uploading...' : 'Share Reel'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
        </Dialog>
      </div>

      {/* Quick Upload Button - Floating */}
      <div className="fixed bottom-6 right-6 z-20">
        <div className="relative">
          <Button
            onClick={() => setShowCreateModal(true)}
            size="lg"
            className="rounded-full w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 border-3 border-white/30"
          >
            <Plus className="w-7 h-7" />
          </Button>
          {/* Pulse animation */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 animate-ping opacity-20"></div>
        </div>
      </div>

      {/* Reels Container */}
      <div 
        className="h-screen snap-y snap-mandatory overflow-y-auto pt-32"
        onWheel={handleScroll}
      >
        {reels.map((reel: Reel, index: number) => (
          <div
            key={reel.id}
            className="relative h-screen snap-start flex items-center justify-center"
          >
            {/* Video */}
            <video
              ref={(el) => {
                if (el) videoRefs.current[index] = el;
              }}
              src={reel.videoUrl}
              className="h-full w-auto max-w-full object-cover"
              loop
              muted={isMuted}
              playsInline
              onClick={() => togglePlayPause(index)}
            />

            {/* Play/Pause Overlay */}
            {!isPlaying && index === currentReelIndex && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  size="icon"
                  className="rounded-full bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => togglePlayPause(index)}
                >
                  <Play className="w-8 h-8" />
                </Button>
              </div>
            )}

            {/* Reel Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* User Info */}
                  <div className="flex items-center space-x-3 mb-2">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={reel.user.avatar} />
                      <AvatarFallback>{reel.user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">@{reel.user.username}</p>
                      {reel.music && (
                        <div className="flex items-center space-x-1 text-sm text-gray-300">
                          <Music className="w-3 h-3" />
                          <span>{reel.music.title} - {reel.music.artist}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Caption */}
                  {reel.caption && (
                    <p className="text-sm mb-2">{reel.caption}</p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center space-x-4 text-sm text-gray-300">
                    <span>{reel.viewsCount} views</span>
                    <span>{reel.likesCount} likes</span>
                    <span>{reel.commentsCount} comments</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-4 ml-4">
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`rounded-full ${reel.isLiked ? 'text-red-500' : 'text-white'} hover:bg-white/20`}
                    onClick={() => likeReelMutation.mutate(reel.id)}
                  >
                    <Heart className={`w-6 h-6 ${reel.isLiked ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full text-white hover:bg-white/20"
                  >
                    <MessageCircle className="w-6 h-6" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full text-white hover:bg-white/20"
                  >
                    <Share className="w-6 h-6" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full text-white hover:bg-white/20"
                  >
                    <Bookmark className="w-6 h-6" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full text-white hover:bg-white/20"
                  >
                    <MoreVertical className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Trending Badge */}
            {reel.trending && (
              <div className="absolute top-20 left-4">
                <Badge variant="secondary" className="bg-yellow-500 text-black">
                  🔥 Trending
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {reels.length === 0 && (
        <div className="h-screen flex items-center justify-center px-4 pt-20">
          <div className="text-center max-w-sm">
            <Video className="w-24 h-24 mx-auto mb-6 text-gray-500" />
            <h3 className="text-2xl font-semibold mb-3 text-white">No reels yet</h3>
            <p className="text-gray-400 mb-8">Share your first reel to get started! Create short, engaging videos to connect with your community.</p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              size="lg"
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 px-8 py-3 text-lg font-bold rounded-full shadow-xl"
            >
              <Camera className="w-6 h-6 mr-2" />
              Create Your First Reel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}