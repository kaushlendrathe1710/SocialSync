import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { getUserInitials } from "@/lib/auth";
import PostCard from "@/components/post-card";
import StoryViewer from "@/components/story-viewer";
import CreatePostModal from "@/components/create-post-modal";
import { 
  Plus, 
  ImageIcon, 
  Video, 
  Smile,
  Users
} from "lucide-react";
import type { PostWithUser, Story, User } from "@shared/schema";

export default function FeedPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['/api/posts'],
    queryFn: async () => {
      const response = await api.getPosts();
      return response.json() as Promise<PostWithUser[]>;
    },
  });

  const { data: stories, isLoading: storiesLoading } = useQuery({
    queryKey: ['/api/stories'],
    queryFn: async () => {
      const response = await api.getStories();
      return response.json() as Promise<(Story & { user: any })[]>;
    },
  });

  const createStoryMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await api.createStory(data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stories'] });
      toast({
        title: "Story created!",
        description: "Your story has been posted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create story",
        variant: "destructive",
      });
    },
  });

  const handleCreateStory = () => {
    // In a real app, this would open a story creation modal
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append('media', file);
        createStoryMutation.mutate(formData);
      }
    };
    input.click();
  };

  const handleViewStory = (story: Story & { user: any }) => {
    setSelectedStory(story);
    setShowStoryViewer(true);
  };

  if (postsLoading || storiesLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex space-x-4 overflow-x-auto pb-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex-shrink-0 text-center">
                  <Skeleton className="w-16 h-16 rounded-full mb-2" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Sidebar */}
        <div className="hidden lg:block">
          <Card className="p-4 mb-4">
            <div className="flex items-center space-x-3 mb-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={user?.avatar || undefined} />
                <AvatarFallback>
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{user?.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {user?.bio || 'Tell us about yourself'}
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Profile views</span>
                <span className="font-semibold text-[hsl(221,44%,41%)]">127</span>
              </div>
              <div className="flex justify-between">
                <span>Post impressions</span>
                <span className="font-semibold text-[hsl(221,44%,41%)]">1,432</span>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Main Feed */}
        <div className="lg:col-span-2">
          
          {/* Stories Section */}
          <Card className="p-4 mb-6">
            <div className="flex space-x-4 overflow-x-auto pb-2">
              {/* Create Story */}
              <div className="flex-shrink-0 text-center cursor-pointer" onClick={handleCreateStory}>
                <div className="w-16 h-16 bg-gradient-to-r from-[hsl(347,75%,60%)] via-[hsl(36,95%,60%)] to-[hsl(262,60%,55%)] rounded-full p-0.5">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                    <Plus className="w-6 h-6 text-[hsl(221,44%,41%)]" />
                  </div>
                </div>
                <p className="text-xs mt-1 font-medium">Your Story</p>
              </div>
              
              {/* Stories */}
              {stories?.map((story) => (
                <div 
                  key={story.id} 
                  className="flex-shrink-0 text-center cursor-pointer"
                  onClick={() => handleViewStory(story)}
                >
                  <div className="w-16 h-16 bg-gradient-to-r from-[hsl(347,75%,60%)] via-[hsl(36,95%,60%)] to-[hsl(262,60%,55%)] rounded-full p-0.5">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={story.user.avatar || undefined} />
                      <AvatarFallback>
                        {story.user.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <p className="text-xs mt-1 truncate w-16">{story.user.name}</p>
                </div>
              ))}
            </div>
          </Card>
          
          {/* Create Post */}
          <Card className="p-4 mb-6">
            <div className="flex items-center space-x-3 mb-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user?.avatar || undefined} />
                <AvatarFallback>
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                className="flex-1 justify-start text-muted-foreground"
                onClick={() => setShowCreatePost(true)}
              >
                What's on your mind, {user?.name?.split(' ')[0]}?
              </Button>
            </div>
            <Separator className="mb-3" />
            <div className="flex justify-around">
              <Button 
                variant="ghost" 
                className="flex items-center space-x-2"
                onClick={() => setShowCreatePost(true)}
              >
                <Image className="w-5 h-5 text-green-500" />
                <span>Photo/Video</span>
              </Button>
              <Button 
                variant="ghost" 
                className="flex items-center space-x-2"
                onClick={() => setShowCreatePost(true)}
              >
                <Smile className="w-5 h-5 text-yellow-500" />
                <span>Feeling/Activity</span>
              </Button>
              <Button 
                variant="ghost" 
                className="flex items-center space-x-2 hidden md:flex"
                onClick={() => setShowCreatePost(true)}
              >
                <Video className="w-5 h-5 text-red-500" />
                <span>Live Video</span>
              </Button>
            </div>
          </Card>
          
          {/* Posts */}
          <div className="space-y-6">
            {posts?.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            
            {posts?.length === 0 && (
              <Card className="p-8 text-center">
                <div className="text-muted-foreground">
                  <p className="text-lg mb-2">No posts yet!</p>
                  <p>Be the first to share something with the community.</p>
                </div>
              </Card>
            )}
          </div>
        </div>
        
        {/* Right Sidebar */}
        <div className="hidden lg:block">
          <Card className="p-4 mb-4">
            <h3 className="font-semibold mb-3">Trending Topics</h3>
            <div className="space-y-2 text-sm">
              <div className="hover:bg-muted p-2 rounded cursor-pointer">
                <p className="font-medium">#TechInnovation</p>
                <p className="text-muted-foreground">12.5K posts</p>
              </div>
              <div className="hover:bg-muted p-2 rounded cursor-pointer">
                <p className="font-medium">#SustainableLiving</p>
                <p className="text-muted-foreground">8.2K posts</p>
              </div>
              <div className="hover:bg-muted p-2 rounded cursor-pointer">
                <p className="font-medium">#WorkFromHome</p>
                <p className="text-muted-foreground">15.7K posts</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <CreatePostModal 
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
      />
      
      {selectedStory && (
        <StoryViewer
          story={selectedStory}
          isOpen={showStoryViewer}
          onClose={() => {
            setShowStoryViewer(false);
            setSelectedStory(null);
          }}
        />
      )}
    </div>
  );
}
