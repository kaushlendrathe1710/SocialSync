import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { 
  Image, 
  UserRound, 
  Smile, 
  MapPin, 
  Flag, 
  X, 
  Upload,
  Clock
} from 'lucide-react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [duration, setDuration] = useState<string>('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [showMediaUpload, setShowMediaUpload] = useState(false);

  // Debug logging
  console.log('CreatePostModal rendered:', { isOpen, user: !!user });

  const createPostMutation = useMutation({
    mutationFn: async (data: FormData) => {
      try {
        const response = await api.createPost(data);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error('Create post error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({
        title: "Post created!",
        description: "Your post has been shared successfully.",
      });
      handleClose();
    },
    onError: (error: any) => {
      console.error('Post creation failed:', error);
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
    setDuration('');
    setMediaFile(null);
    setMediaPreview(null);
    setShowMediaUpload(false);
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && !mediaFile) {
      toast({
        title: "Error",
        description: "Please add some content or media to your post",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    if (content.trim()) {
      formData.append('content', content.trim());
    }
    if (mediaFile) {
      formData.append('media', mediaFile);
    }
    formData.append('privacy', privacy);
    if (duration && duration !== 'permanent') {
      formData.append('duration', duration);
    }

    createPostMutation.mutate(formData);
  };

  // Early return if user is not loaded to prevent errors
  if (!user) {
    console.log('CreatePostModal: User not loaded, returning null');
    return null;
  }

  try {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
          </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
          
          {/* Post Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Post Duration (Optional)</label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select duration (permanent if not set)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permanent">Permanent</SelectItem>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="1m">1 Month</SelectItem>
              </SelectContent>
            </Select>
            {duration && duration !== 'permanent' && (
              <p className="text-xs text-gray-500">
                This post will automatically be deleted after {
                  duration === '24h' ? '24 hours' :
                  duration === '7d' ? '7 days' :
                  duration === '1m' ? '1 month' : ''
                }
              </p>
            )}
          </div>
          
          <Textarea
            placeholder={`What's on your mind, ${user?.name?.split(' ')[0]}?`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] text-lg border-none focus:ring-0 resize-none"
            disabled={createPostMutation.isPending}
          />
          
          {/* Media Preview */}
          {mediaPreview && (
            <div className="relative">
              {mediaFile?.type.startsWith('image/') ? (
                <img 
                  src={mediaPreview} 
                  alt="Preview" 
                  className="w-full h-64 object-cover rounded-lg"
                />
              ) : (
                <video 
                  src={mediaPreview} 
                  controls 
                  className="w-full h-64 rounded-lg"
                />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleRemoveMedia}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          {/* Media Upload Area */}
          {showMediaUpload && !mediaPreview && (
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">Add photos/videos</p>
              <p className="text-xs text-muted-foreground mb-4">or drag and drop</p>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="media-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('media-upload')?.click()}
              >
                Select Files
              </Button>
            </div>
          )}
          
          {/* Post Options */}
          <div className="border border-muted rounded-lg p-3">
            <p className="text-sm font-medium mb-2">Add to your post</p>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowMediaUpload(!showMediaUpload)}
                className="p-2 hover:bg-muted"
              >
                <Image className="w-5 h-5 text-green-500" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-muted"
                disabled
              >
                <UserRound className="w-5 h-5 text-blue-500" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-muted"
                disabled
              >
                <Smile className="w-5 h-5 text-yellow-500" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-muted"
                disabled
              >
                <MapPin className="w-5 h-5 text-red-500" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-muted"
                disabled
              >
                <Flag className="w-5 h-5 text-orange-500" />
              </Button>
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full facebook-blue"
            disabled={createPostMutation.isPending || (!content.trim() && !mediaFile)}
          >
            {createPostMutation.isPending ? 'Posting...' : 'Post'}
          </Button>
        </form>
        </DialogContent>
      </Dialog>
    );
  } catch (error) {
    console.error('CreatePostModal render error:', error);
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p>There was an error loading the create post form. Please try again.</p>
            <Button onClick={handleClose} className="mt-4">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}
