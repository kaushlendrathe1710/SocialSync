import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { 
  Image, 
  Video, 
  Upload, 
  Camera, 
  X, 
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize
} from 'lucide-react';

interface PhotoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PhotoVideoModal({ isOpen, onClose }: PhotoVideoModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [isPlaying, setIsPlaying] = useState<boolean[]>([]);
  const [isMuted, setIsMuted] = useState<boolean[]>([]);

  const createPostMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await api.createPost(data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({
        title: "Post created!",
        description: "Your media post has been shared successfully.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setContent('');
    setPrivacy('public');
    setMediaFiles([]);
    setMediaPreviews([]);
    setActiveTab('upload');
    setIsPlaying([]);
    setIsMuted([]);
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 10 files
    const selectedFiles = files.slice(0, 10);
    setMediaFiles(prev => [...prev, ...selectedFiles].slice(0, 10));
    
    // Generate previews
    selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Initialize video controls
    setIsPlaying(prev => [...prev, ...selectedFiles.map(() => false)]);
    setIsMuted(prev => [...prev, ...selectedFiles.map(() => false)]);
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
    setIsPlaying(prev => prev.filter((_, i) => i !== index));
    setIsMuted(prev => prev.filter((_, i) => i !== index));
  };

  const toggleVideoPlay = (index: number) => {
    const video = document.getElementById(`video-${index}`) as HTMLVideoElement;
    if (video) {
      if (isPlaying[index]) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(prev => prev.map((playing, i) => i === index ? !playing : playing));
    }
  };

  const toggleVideoMute = (index: number) => {
    const video = document.getElementById(`video-${index}`) as HTMLVideoElement;
    if (video) {
      video.muted = !isMuted[index];
      setIsMuted(prev => prev.map((muted, i) => i === index ? !muted : muted));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mediaFiles.length === 0) {
      toast({
        title: "No media selected",
        description: "Please select at least one photo or video",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    if (content.trim()) {
      formData.append('content', content.trim());
    }
    
    // For now, we'll upload the first file (extend for multiple files)
    if (mediaFiles[0]) {
      formData.append('media', mediaFiles[0]);
    }
    formData.append('privacy', privacy);

    createPostMutation.mutate(formData);
  };

  const handleCameraCapture = () => {
    toast({
      title: "Camera feature",
      description: "Camera capture would be implemented with getUserMedia API",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Image className="w-5 h-5 text-green-500" />
            <span>Create Photo/Video Post</span>
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
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="friends">Friends</SelectItem>
                  <SelectItem value="private">Only me</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Textarea
            placeholder={`What's happening, ${user?.name?.split(' ')[0]}?`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] text-lg border-none focus:ring-0 resize-none"
            disabled={createPostMutation.isPending}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Upload Files</span>
              </TabsTrigger>
              <TabsTrigger value="camera" className="flex items-center space-x-2">
                <Camera className="w-4 h-4" />
                <span>Take Photo/Video</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              {mediaFiles.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="flex space-x-4">
                      <Image className="w-12 h-12 text-green-500" />
                      <Video className="w-12 h-12 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">Add Photos and Videos</p>
                      <p className="text-gray-500">or drag and drop</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Select Files
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      {mediaFiles[index]?.type.startsWith('image/') ? (
                        <div className="relative">
                          <img 
                            src={preview} 
                            alt={`Preview ${index + 1}`} 
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveMedia(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <video 
                            id={`video-${index}`}
                            src={preview} 
                            className="w-full h-48 object-cover rounded-lg"
                            muted={isMuted[index]}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex space-x-2">
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => toggleVideoPlay(index)}
                                className="bg-black/50 hover:bg-black/70"
                              >
                                {isPlaying[index] ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => toggleVideoMute(index)}
                                className="bg-black/50 hover:bg-black/70"
                              >
                                {isMuted[index] ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveMedia(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {mediaFiles.length < 10 && (
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg h-48 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">Add More</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="camera" className="space-y-4">
              <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
                <div className="text-white text-center">
                  <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Camera Preview</p>
                  <p className="text-sm opacity-75">Camera access would be implemented here</p>
                </div>
              </div>
              <div className="flex justify-center space-x-4">
                <Button onClick={handleCameraCapture} className="bg-blue-500 hover:bg-blue-600">
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
                <Button onClick={handleCameraCapture} className="bg-red-500 hover:bg-red-600">
                  <Video className="w-4 h-4 mr-2" />
                  Record Video
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex space-x-3">
            <Button onClick={handleClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createPostMutation.isPending || mediaFiles.length === 0}
              className="flex-1"
            >
              {createPostMutation.isPending ? 'Posting...' : 'Share'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}