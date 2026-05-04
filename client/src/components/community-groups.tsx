import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Plus,
  Heart,
  Sparkles,
  Briefcase,
  Baby,
  BookOpen,
  Dumbbell,
  Brain,
  Coffee,
  Search,
  Crown,
  UserCheck,
  MessageCircle,
  ArrowRight
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface CommunityGroup {
  id: number;
  name: string;
  description: string | null;
  category: string;
  privacy: string;
  coverImage: string | null;
  creatorId: number;
  memberCount: number;
  isVerified: boolean;
  tags: string[] | null;
  createdAt: string;
  creator: {
    id: number;
    name: string;
    username: string;
    avatar: string | null;
  };
  membershipStatus?: string;
  isJoined?: boolean;
}

export function CommunityGroups() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    category: "beauty",
    privacy: "public",
    tags: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Categories with icons
  const categories = [
    { id: "all", label: "All Groups", icon: Users },
    { id: "beauty", label: "Beauty & Style", icon: Sparkles },
    { id: "wellness", label: "Wellness", icon: Heart },
    { id: "career", label: "Career", icon: Briefcase },
    { id: "motherhood", label: "Motherhood", icon: Baby },
    { id: "education", label: "Education", icon: BookOpen },
    { id: "fitness", label: "Fitness", icon: Dumbbell },
    { id: "mindfulness", label: "Mindfulness", icon: Brain },
    { id: "lifestyle", label: "Lifestyle", icon: Coffee },
  ];

  // Fetch community groups with proper category filtering
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["/api/groups", selectedCategory],
    queryFn: async () => {
      const categoryParam = selectedCategory !== "all" ? `?category=${selectedCategory}` : "";
      const response = await fetch(`/api/groups${categoryParam}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch community groups');
      }
      return response.json();
    },
  });

  // Filter groups by search term only (category filtering is handled server-side)
  const filteredGroups = groups.filter((group: CommunityGroup) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Mutations
  const createGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating community group:', data);
      const response = await fetch("/api/groups", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          category: data.category,
          privacy: data.privacy,
          tags: data.tags ? data.tags.split(",").map((tag: string) => tag.trim()) : [],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Community creation failed:', errorText);
        throw new Error(errorText || 'Failed to create community group');
      }

      const result = await response.json();
      console.log('Community created successfully:', result);
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Community created",
        description: `Your community "${data.name}" has been created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Community creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create community group",
        variant: "destructive",
      });
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const response = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to join community');
      }

      return response.json();
    },
    onSuccess: (_data, groupId) => {
      toast({
        title: "Joined community",
        description: "You've successfully joined the community!",
      });
      // Optimistically update currently loaded list so member count and button state update immediately
      queryClient.setQueryData(["/api/groups", selectedCategory], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((g: any) =>
          g.id === groupId
            ? { ...g, isJoined: true, membershipStatus: g.membershipStatus || "member", memberCount: (g.memberCount || 0) + 1 }
            : g
        );
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"], exact: false });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join community",
        variant: "destructive",
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to delete community');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Community deleted' });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete community', variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setCreateForm({
      name: "",
      description: "",
      category: "beauty",
      privacy: "public",
      tags: "",
    });
  };

  const handleCreateGroup = () => {
    if (!createForm.name.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }
    console.log('Submitting community form:', createForm);
    createGroupMutation.mutate(createForm);
  };

  const handleJoinGroup = (groupId: number) => {
    joinGroupMutation.mutate(groupId);
  };

  const handleViewGroup = (groupId: number) => {
    setLocation(`/groups/${groupId}`);
  };

  const handleMessageMembers = (groupId: number) => {
    setLocation(`/messages?group=${groupId}`);
  };

  const handleDeleteGroup = (groupId: number) => {
    if (!confirm('Delete this community? This cannot be undone.')) return;
    deleteGroupMutation.mutate(groupId);
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(cat => cat.id === category);
    return categoryData?.icon || Users;
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      beauty: "bg-pink-100 text-pink-800",
      wellness: "bg-green-100 text-green-800",
      career: "bg-blue-100 text-blue-800",
      motherhood: "bg-purple-100 text-purple-800",
      education: "bg-yellow-100 text-yellow-800",
      fitness: "bg-red-100 text-red-800",
      mindfulness: "bg-indigo-100 text-indigo-800",
      lifestyle: "bg-orange-100 text-orange-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="w-full mx-auto p-6 space-y-6 dark:bg-gray-900 h-[calc(100vh-3.5rem)] overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-purple-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Community Groups</h1>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Community
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="w-full">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search communities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="-mx-3 sm:mx-0 overflow-x-auto">
        <div className="px-3 sm:px-0 flex gap-2 whitespace-nowrap">
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="flex items-center gap-1 dark:border-gray-600 dark:text-gray-200"
              >
                <IconComponent className="h-3 w-3" />
                {category.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Featured Communities */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Crown className="h-5 w-5 text-yellow-500" />
            Featured Communities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups
              .filter((group: CommunityGroup) => group.isVerified)
              .slice(0, 6)
              .map((group: CommunityGroup, index: number) => {
                const IconComponent = getCategoryIcon(group.category);
                return (
                  <Card key={`${group.id}-${index}`} className="p-4 border-2 border-yellow-200 dark:border-yellow-900 dark:bg-gray-700/50">
                    <div className="space-y-3 overflow-hidden">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-5 w-5 text-purple-500" />
                          <Crown className="h-4 w-4 text-yellow-500" />
                        </div>
                        <Badge className={`${getCategoryColor(group.category)} dark:bg-gray-600 dark:text-gray-200`}>
                          {group.category}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-semibold text-lg dark:text-white">{group.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2 dark:text-gray-400">
                          {group.description || "No description available"}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={group.creator.avatar || undefined} />
                          <AvatarFallback className="text-xs dark:bg-gray-600 dark:text-white">
                            {group.creator.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          by {group.creator.name}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Users className="h-4 w-4" />
                          <span>{group.memberCount} members</span>
                          {user && group.creator && user.id === group.creator.id && (
                            <Badge variant="secondary" className="text-xs">Owner</Badge>
                          )}
                        </div>
                        {group.isJoined ? (
                          <div className="flex flex-wrap gap-2 w-full sm:w-auto max-w-full">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewGroup(group.id)}
                              className="flex items-center gap-1 w-full sm:w-auto shrink-0"
                            >
                              <ArrowRight className="h-3 w-3" />
                              View Group
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleMessageMembers(group.id)}
                              className="flex items-center gap-1 w-full sm:w-auto shrink-0"
                            >
                              <MessageCircle className="h-3 w-3" />
                              Message
                            </Button>
                            {user && user.id === group.creator.id && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteGroup(group.id)}
                                disabled={deleteGroupMutation.isPending}
                                className="w-full sm:w-auto shrink-0"
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleJoinGroup(group.id)}
                            disabled={joinGroupMutation.isPending}
                            className="w-full sm:w-auto shrink-0"
                          >
                            Join
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* All Communities */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">
            {selectedCategory === "all" ? "All Communities" :
             categories.find(cat => cat.id === selectedCategory)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-48"></div>
                </div>
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4 dark:text-gray-400">
                {searchTerm ? "No communities found matching your search" : "No communities in this category yet"}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create the First Community
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map((group: CommunityGroup, index: number) => {
                const IconComponent = getCategoryIcon(group.category);
                return (
                  <Card key={`${group.id}-${index}`} className="p-4 hover:shadow-md transition-shadow dark:bg-gray-700 dark:border-gray-600">
                    <div className="space-y-3 overflow-hidden">
                      <div className="flex items-start justify-between">
                        <IconComponent className="h-5 w-5 text-purple-500" />
                        <div className="flex items-center gap-2">
                          {group.isVerified && <Crown className="h-4 w-4 text-yellow-500" />}
                          <Badge className={`${getCategoryColor(group.category)} dark:bg-gray-600 dark:text-gray-200`}>
                            {group.category}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-lg dark:text-white">{group.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2 dark:text-gray-400">
                          {group.description || "No description available"}
                        </p>
                      </div>

                      {group.tags && group.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {group.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-200">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={group.creator.avatar || undefined} />
                          <AvatarFallback className="text-xs dark:bg-gray-600 dark:text-white">
                            {group.creator.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          by {group.creator.name}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Users className="h-4 w-4" />
                          <span>{group.memberCount} members</span>
                          {user && group.creator && user.id === group.creator.id && (
                            <Badge variant="secondary" className="text-xs dark:bg-gray-600 dark:text-gray-200">Owner</Badge>
                          )}
                        </div>
                        {group.isJoined ? (
                          <div className="flex flex-wrap gap-2 w-full sm:w-auto max-w-full">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewGroup(group.id)}
                              className="flex items-center gap-1 w-full sm:w-auto shrink-0 dark:border-gray-600 dark:text-gray-200"
                            >
                              <ArrowRight className="h-3 w-3" />
                              Enter Group
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleMessageMembers(group.id)}
                              className="flex items-center gap-1 w-full sm:w-auto shrink-0"
                            >
                              <MessageCircle className="h-3 w-3" />
                              Message Members
                            </Button>
                            {user && user.id === group.creator.id && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteGroup(group.id)}
                                disabled={deleteGroupMutation.isPending}
                                className="w-full sm:w-auto shrink-0"
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleJoinGroup(group.id)}
                            disabled={joinGroupMutation.isPending}
                            className="w-full sm:w-auto shrink-0"
                          >
                            Join
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Community Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Create New Community</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="groupName" className="dark:text-gray-200">Community Name</Label>
                <Input
                  id="groupName"
                  placeholder="e.g., Skincare Enthusiasts"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
              </div>

              <div>
                <Label htmlFor="groupDescription" className="dark:text-gray-200">Description</Label>
                <Textarea
                  id="groupDescription"
                  placeholder="What is your community about? What can members expect?"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category" className="dark:text-gray-200">Category</Label>
                  <select
                    id="category"
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    aria-label="Category"
                    value={createForm.category}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {categories.slice(1).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="privacy" className="dark:text-gray-200">Privacy</Label>
                  <select
                    id="privacy"
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    aria-label="Privacy"
                    value={createForm.privacy}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, privacy: e.target.value }))}
                  >
                    <option value="public">Public - Anyone can join</option>
                    <option value="request_to_join">Request to Join - Approval required</option>
                    <option value="private">Private - Invite only</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="tags" className="dark:text-gray-200">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="e.g., skincare, beauty, tips, routine"
                  value={createForm.tags}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, tags: e.target.value }))}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
                <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                  Add relevant tags to help people find your community
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="dark:border-gray-600 dark:text-gray-200">
                Cancel
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={createGroupMutation.isPending}
              >
                {createGroupMutation.isPending ? "Creating..." : "Create Community"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
