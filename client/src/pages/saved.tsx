import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Bookmark, Search, Grid, List, Heart, MessageCircle, Share, MoreHorizontal, Filter, Plus } from 'lucide-react';
import PostCard from '@/components/post-card';
import type { PostWithUser } from '@shared/schema';

export default function SavedPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [collections, setCollections] = useState([
    { id: 1, name: "All Saved", count: 0, color: "bg-blue-500" },
    { id: 2, name: "Travel", count: 0, color: "bg-green-500" },
    { id: 3, name: "Food", count: 0, color: "bg-orange-500" },
    { id: 4, name: "Tech", count: 0, color: "bg-purple-500" },
    { id: 5, name: "Inspiration", count: 0, color: "bg-pink-500" },
  ]);

  // Fetch user's liked posts as saved items
  const { data: likedPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['/api/posts'],
    enabled: !!user,
  });

  // Filter posts that user has liked (simulating saved posts)
  const savedPosts = likedPosts.filter((post: PostWithUser) => post.isLiked);

  const filteredSavedPosts = savedPosts.filter((post: PostWithUser) =>
    post.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUnsavePost = async (postId: number) => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Post removed from saved items",
        });
        window.location.reload();
      } else {
        throw new Error('Failed to unsave post');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove from saved items",
        variant: "destructive",
      });
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a collection name",
        variant: "destructive",
      });
      return;
    }

    try {
      const colors = ["bg-blue-500", "bg-green-500", "bg-orange-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-red-500"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const newCollection = {
        id: collections.length + 1,
        name: newCollectionName.trim(),
        count: 0,
        color: randomColor
      };

      setCollections([...collections, newCollection]);
      setNewCollectionName('');
      setShowCreateDialog(false);

      toast({
        title: "Success",
        description: `Collection "${newCollectionName}" created successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create collection",
        variant: "destructive",
      });
    }
  };

  // Update collection counts based on saved posts
  const savedCollections = collections.map(collection => ({
    ...collection,
    count: collection.name === "All Saved" ? savedPosts.length : Math.floor(savedPosts.length * 0.2)
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <Bookmark className="w-8 h-8 mr-3" />
          Saved
        </h1>
        <p className="text-gray-600">Keep track of posts you want to see again</p>
      </div>

      <Tabs defaultValue="posts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="posts">
            Saved Posts ({savedPosts.length})
          </TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="search">Search Saved</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4 mr-2" />
                Grid
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4 mr-2" />
                List
              </Button>
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {postsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="h-20 bg-gray-200 rounded mb-4"></div>
                    <div className="flex space-x-4">
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : savedPosts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No saved posts yet</h3>
                <p className="text-gray-500 mb-4">
                  When you like posts, they'll appear here so you can easily find them later
                </p>
                <Button>Explore Posts</Button>
              </CardContent>
            </Card>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-4'}>
              {savedPosts.map((post: PostWithUser) => (
                <div key={post.id} className="relative group">
                  {viewMode === 'grid' ? (
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {post.user.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{post.user.name}</p>
                              <p className="text-xs text-gray-500">@{post.user.username}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnsavePost(post.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Bookmark className="w-4 h-4 fill-current" />
                          </Button>
                        </div>
                        <p className="text-sm text-gray-700 mb-3 line-clamp-3">{post.text}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <Heart className="w-3 h-3 mr-1" />
                              Like
                            </span>
                            <span className="flex items-center">
                              <MessageCircle className="w-3 h-3 mr-1" />
                              Comment
                            </span>
                            <span className="flex items-center">
                              <Share className="w-3 h-3 mr-1" />
                              Share
                            </span>
                          </div>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <PostCard post={post} />
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="collections" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedCollections.map((collection) => (
                  <Card key={collection.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`w-10 h-10 ${collection.color} rounded-lg flex items-center justify-center`}>
                          <Bookmark className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{collection.name}</h3>
                          <p className="text-sm text-gray-500">{collection.count} saved</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="aspect-square bg-gray-100 rounded"></div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors cursor-pointer">
                      <CardContent className="p-4 flex flex-col items-center justify-center h-full text-center">
                        <div className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center mb-2">
                          <Plus className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">Create Collection</p>
                        <p className="text-xs text-gray-500">Organize your saved posts</p>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Collection</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="collection-name">Collection Name</Label>
                        <Input
                          id="collection-name"
                          placeholder="Enter collection name..."
                          value={newCollectionName}
                          onChange={(e) => setNewCollectionName(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleCreateCollection();
                            }
                          }}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateCollection}>
                          Create Collection
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="w-5 h-5 mr-2" />
                Search Your Saved Posts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search saved posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {searchQuery && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      {filteredSavedPosts.length} results for "{searchQuery}"
                    </p>
                    <Badge variant="secondary">{filteredSavedPosts.length}</Badge>
                  </div>
                  
                  {filteredSavedPosts.length === 0 ? (
                    <div className="text-center py-8">
                      <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No saved posts match your search</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredSavedPosts.map((post: PostWithUser) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}