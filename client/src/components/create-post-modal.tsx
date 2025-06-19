import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
  Clock,
  Plus,
  Search
} from 'lucide-react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Emoji data with names
const emojiData = [
  { emoji: '😀', name: 'Grinning Face' },
  { emoji: '😁', name: 'Beaming Face' },
  { emoji: '😂', name: 'Face with Tears of Joy' },
  { emoji: '🤣', name: 'Rolling on the Floor Laughing' },
  { emoji: '😊', name: 'Smiling Face with Smiling Eyes' },
  { emoji: '😇', name: 'Smiling Face with Halo' },
  { emoji: '🙂', name: 'Slightly Smiling Face' },
  { emoji: '🙃', name: 'Upside-Down Face' },
  { emoji: '😉', name: 'Winking Face' },
  { emoji: '😌', name: 'Relieved Face' },
  { emoji: '😍', name: 'Smiling Face with Heart-Eyes' },
  { emoji: '🥰', name: 'Smiling Face with Hearts' },
  { emoji: '😘', name: 'Face Blowing a Kiss' },
  { emoji: '😗', name: 'Kissing Face' },
  { emoji: '😙', name: 'Kissing Face with Smiling Eyes' },
  { emoji: '😚', name: 'Kissing Face with Closed Eyes' },
  { emoji: '😋', name: 'Face Savoring Food' },
  { emoji: '😛', name: 'Face with Tongue' },
  { emoji: '😝', name: 'Squinting Face with Tongue' },
  { emoji: '😜', name: 'Winking Face with Tongue' },
  { emoji: '🤪', name: 'Zany Face' },
  { emoji: '🤨', name: 'Face with Raised Eyebrow' },
  { emoji: '🧐', name: 'Face with Monocle' },
  { emoji: '🤓', name: 'Nerd Face' },
  { emoji: '😎', name: 'Smiling Face with Sunglasses' },
  { emoji: '🤩', name: 'Star-Struck' },
  { emoji: '🥳', name: 'Partying Face' },
  { emoji: '😏', name: 'Smirking Face' },
  { emoji: '😒', name: 'Unamused Face' },
  { emoji: '😞', name: 'Disappointed Face' },
  { emoji: '😔', name: 'Pensive Face' },
  { emoji: '😟', name: 'Worried Face' },
  { emoji: '😕', name: 'Confused Face' },
  { emoji: '🙁', name: 'Slightly Frowning Face' },
  { emoji: '☹️', name: 'Frowning Face' },
  { emoji: '😣', name: 'Persevering Face' },
  { emoji: '😖', name: 'Confounded Face' },
  { emoji: '😫', name: 'Tired Face' },
  { emoji: '😩', name: 'Weary Face' },
  { emoji: '🥺', name: 'Pleading Face' },
  { emoji: '😢', name: 'Crying Face' },
  { emoji: '😭', name: 'Loudly Crying Face' },
  { emoji: '😤', name: 'Face with Steam From Nose' },
  { emoji: '😠', name: 'Angry Face' },
  { emoji: '😡', name: 'Pouting Face' },
  { emoji: '🤬', name: 'Face with Symbols on Mouth' },
  { emoji: '🤯', name: 'Exploding Head' },
  { emoji: '😳', name: 'Flushed Face' },
  { emoji: '🥵', name: 'Hot Face' },
  { emoji: '🥶', name: 'Cold Face' },
  { emoji: '😱', name: 'Face Screaming in Fear' },
  { emoji: '😨', name: 'Fearful Face' },
  { emoji: '😰', name: 'Anxious Face with Sweat' },
  { emoji: '😥', name: 'Sad but Relieved Face' },
  { emoji: '😓', name: 'Downcast Face with Sweat' },
  { emoji: '🤗', name: 'Hugging Face' },
  { emoji: '🤔', name: 'Thinking Face' },
  { emoji: '🤭', name: 'Face with Hand Over Mouth' },
  { emoji: '🤫', name: 'Shushing Face' },
  { emoji: '🤥', name: 'Lying Face' },
  { emoji: '😶', name: 'Face Without Mouth' },
  { emoji: '😐', name: 'Neutral Face' },
  { emoji: '😑', name: 'Expressionless Face' },
  { emoji: '😬', name: 'Grimacing Face' },
  { emoji: '🙄', name: 'Face with Rolling Eyes' },
  { emoji: '😯', name: 'Hushed Face' },
  { emoji: '😦', name: 'Frowning Face with Open Mouth' },
  { emoji: '😧', name: 'Anguished Face' },
  { emoji: '😮', name: 'Face with Open Mouth' },
  { emoji: '😲', name: 'Astonished Face' },
  { emoji: '🥱', name: 'Yawning Face' },
  { emoji: '😴', name: 'Sleeping Face' },
  { emoji: '🤤', name: 'Drooling Face' },
  { emoji: '😪', name: 'Sleepy Face' },
  { emoji: '😵', name: 'Dizzy Face' },
  { emoji: '🤐', name: 'Zipper-Mouth Face' },
  { emoji: '🥴', name: 'Woozy Face' },
  { emoji: '🤢', name: 'Nauseated Face' },
  { emoji: '🤮', name: 'Face Vomiting' },
  { emoji: '🤧', name: 'Sneezing Face' },
  { emoji: '😷', name: 'Face with Medical Mask' },
  { emoji: '🤒', name: 'Face with Thermometer' },
  { emoji: '🤕', name: 'Face with Head-Bandage' },
  { emoji: '🤑', name: 'Money-Mouth Face' },
  { emoji: '🤠', name: 'Cowboy Hat Face' },
  { emoji: '😈', name: 'Smiling Face with Horns' },
  { emoji: '👿', name: 'Angry Face with Horns' },
  { emoji: '👹', name: 'Ogre' },
  { emoji: '👺', name: 'Goblin' },
  { emoji: '🤡', name: 'Clown Face' },
  { emoji: '💩', name: 'Pile of Poo' },
  { emoji: '👻', name: 'Ghost' },
  { emoji: '💀', name: 'Skull' },
  { emoji: '☠️', name: 'Skull and Crossbones' },
  { emoji: '👽', name: 'Alien' },
  { emoji: '👾', name: 'Alien Monster' },
  { emoji: '🤖', name: 'Robot' },
  { emoji: '🎃', name: 'Jack-O-Lantern' },
  { emoji: '😺', name: 'Grinning Cat' },
  { emoji: '😸', name: 'Grinning Cat with Smiling Eyes' },
  { emoji: '😹', name: 'Cat with Tears of Joy' },
  { emoji: '😻', name: 'Smiling Cat with Heart-Eyes' },
  { emoji: '😼', name: 'Cat with Wry Smile' },
  { emoji: '😽', name: 'Kissing Cat' },
  { emoji: '🙀', name: 'Weary Cat' },
  { emoji: '😿', name: 'Crying Cat' },
  { emoji: '😾', name: 'Pouting Cat' }
];

const popularEmojis = ['😀', '😂', '😍', '🥰', '😊', '🤔', '😎', '🥳', '🤗', '😭'];

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [location, setLocation] = useState('');
  const [taggedPeople, setTaggedPeople] = useState<string[]>([]);



  const createPostMutation = useMutation({
    mutationFn: async (data: FormData) => {
      try {
        const response = await api.createPost(data);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      } catch (error) {
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
    setShowEmojiPicker(false);
    setShowLocationPicker(false);
    setLocation('');
    setTaggedPeople([]);
    onClose();
  };

  const addEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
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
      setShowMediaUpload(false); // Hide upload area after selection
    }
  };

  const triggerFileInput = () => {
    const fileInput = document.getElementById('media-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
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
            <DialogDescription>
              Share what's on your mind with your friends and followers
            </DialogDescription>
          </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hidden file input */}
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
            id="media-upload"
          />
          
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
              <Button
                type="button"
                variant="outline"
                onClick={triggerFileInput}
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
                onClick={triggerFileInput}
                className="p-2 hover:bg-muted"
                title="Add photos/videos"
              >
                <Image className="w-5 h-5 text-green-500" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Tag people functionality - could open a people picker modal
                  toast({
                    title: "Tag People",
                    description: "People tagging feature coming soon!",
                  });
                }}
                className="p-2 hover:bg-muted"
                title="Tag people"
              >
                <UserRound className="w-5 h-5 text-blue-500" />
              </Button>
              
              {/* Emoji Picker with + button */}
              <div className="relative">
                <div className="flex items-center">
                  {/* Show popular emojis */}
                  {popularEmojis.slice(0, 3).map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => addEmoji(emoji)}
                      className="text-lg hover:bg-gray-100 rounded p-1 transition-colors mr-1"
                      title={emojiData.find(e => e.emoji === emoji)?.name}
                    >
                      {emoji}
                    </button>
                  ))}
                  
                  {/* Plus button to show all emojis */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1 hover:bg-muted"
                    title="More emojis"
                  >
                    <Plus className="w-4 h-4 text-yellow-500" />
                  </Button>
                </div>
                
                {/* Emoji Picker Dropdown */}
                {showEmojiPicker && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 w-80 max-h-60 overflow-y-auto">
                    <div className="grid grid-cols-8 gap-1">
                      {emojiData.map((item) => (
                        <button
                          key={item.emoji}
                          type="button"
                          onClick={() => {
                            addEmoji(item.emoji);
                            setShowEmojiPicker(false);
                          }}
                          className="text-lg hover:bg-gray-100 rounded p-2 transition-colors relative group"
                          title={item.name}
                        >
                          {item.emoji}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {item.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowLocationPicker(!showLocationPicker)}
                className="p-2 hover:bg-muted"
                title="Add location"
              >
                <MapPin className="w-5 h-5 text-red-500" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Flag/report functionality
                  toast({
                    title: "Flag Content",
                    description: "Content flagging feature coming soon!",
                  });
                }}
                className="p-2 hover:bg-muted"
                title="Flag content"
              >
                <Flag className="w-5 h-5 text-orange-500" />
              </Button>
            </div>
          </div>
          
          {/* Location Picker */}
          {showLocationPicker && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Add Location</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLocationPicker(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Input
                placeholder="Where are you?"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mb-2"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {location ? `Location: ${location}` : 'No location set'}
                </span>
                {location && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation('')}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* Display selected location */}
          {location && !showLocationPicker && (
            <div className="flex items-center text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
              <MapPin className="w-4 h-4 mr-2 text-red-500" />
              <span>at {location}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLocation('')}
                className="ml-auto p-1"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
          
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
