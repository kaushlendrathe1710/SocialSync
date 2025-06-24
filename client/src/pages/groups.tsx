import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  FileText,
  Settings,
  Crown,
  Shield,
  UserPlus,
  MessageSquare,
  Pin,
  Upload,
  Image as ImageIcon,
  Video,
  Download,
  ExternalLink,
  MapPin,
  Clock
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Group {
  id: number;
  name: string;
  description: string;
  category: string;
  privacy: 'public' | 'private' | 'request_to_join';
  coverImage?: string;
  memberCount: number;
  isVerified: boolean;
  tags: string[];
  createdAt: string;
  creator: {
    id: number;
    name: string;
    username: string;
    avatar?: string;
  };
  membershipStatus?: 'member' | 'admin' | 'pending' | null;
  isJoined?: boolean;
}

interface GroupEvent {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  endDate?: string;
  location?: string;
  isVirtual: boolean;
  meetingLink?: string;
  maxAttendees?: number;
  currentAttendees: number;
  coverImage?: string;
  status: 'active' | 'cancelled' | 'completed';
  creator: {
    id: number;
    name: string;
    username: string;
    avatar?: string;
  };
  attendeeStatus?: 'going' | 'interested' | 'not_going';
}

interface GroupFile {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: 'document' | 'image' | 'video' | 'audio';
  fileSize: number;
  description?: string;
  downloadCount: number;
  createdAt: string;
  uploader: {
    id: number;
    name: string;
    username: string;
    avatar?: string;
  };
}

const groupCategories = [
  { id: 'beauty', name: 'Beauty & Skincare', icon: '💄', color: 'pink' },
  { id: 'wellness', name: 'Health & Wellness', icon: '🧘', color: 'green' },
  { id: 'career', name: 'Career & Business', icon: '💼', color: 'blue' },
  { id: 'motherhood', name: 'Motherhood', icon: '👶', color: 'yellow' },
  { id: 'lifestyle', name: 'Lifestyle', icon: '✨', color: 'purple' },
  { id: 'fitness', name: 'Fitness', icon: '💪', color: 'orange' },
  { id: 'food', name: 'Food & Cooking', icon: '🍳', color: 'red' },
  { id: 'travel', name: 'Travel', icon: '✈️', color: 'cyan' },
];

export default function GroupsPage() {
  const [activeTab, setActiveTab] = useState('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    category: '',
    privacy: 'public' as 'public' | 'private' | 'request_to_join',
    tags: [] as string[],
    coverImage: null as File | null,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch groups based on tab
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['/api/groups', activeTab, selectedCategory, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (activeTab === 'my-groups') params.append('filter', 'joined');
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      return fetch(`/api/groups?${params}`).then(res => res.json());
    },
  });

  // Fetch group events
  const { data: groupEvents = [] } = useQuery({
    queryKey: ['/api/group-events', selectedGroup?.id],
    enabled: !!selectedGroup,
  });

  // Fetch group files
  const { data: groupFiles = [] } = useQuery({
    queryKey: ['/api/group-files', selectedGroup?.id],
    enabled: !!selectedGroup,
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: FormData) => {
      return apiRequest('/api/groups', {
        method: 'POST',
        body: groupData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      setShowCreateModal(false);
      resetNewGroup();
      toast({
        title: "Group Created",
        description: "Your group has been created successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create group. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      return apiRequest(`/api/groups/${groupId}/join`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      toast({
        title: "Joined Group",
        description: "You have successfully joined the group!",
      });
    },
  });

  // RSVP to event mutation
  const rsvpEventMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: number; status: string }) => {
      return apiRequest(`/api/group-events/${eventId}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/group-events'] });
    },
  });

  const resetNewGroup = () => {
    setNewGroup({
      name: '',
      description: '',
      category: '',
      privacy: 'public',
      tags: [],
      coverImage: null,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setNewGroup({ ...newGroup, coverImage: file });
    }
  };

  const handleSubmitGroup = () => {
    if (!newGroup.name || !newGroup.description || !newGroup.category) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('name', newGroup.name);
    formData.append('description', newGroup.description);
    formData.append('category', newGroup.category);
    formData.append('privacy', newGroup.privacy);
    formData.append('tags', JSON.stringify(newGroup.tags));
    if (newGroup.coverImage) {
      formData.append('coverImage', newGroup.coverImage);
    }

    createGroupMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'audio': return <Volume2 className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Groups</h1>
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Group
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Group Name *</label>
                    <Input
                      placeholder="Enter group name"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description *</label>
                    <Textarea
                      placeholder="Describe your group..."
                      value={newGroup.description}
                      onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Category *</label>
                    <Select value={newGroup.category} onValueChange={(value) => setNewGroup({ ...newGroup, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {groupCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center space-x-2">
                              <span>{category.icon}</span>
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Privacy</label>
                    <Select value={newGroup.privacy} onValueChange={(value: any) => setNewGroup({ ...newGroup, privacy: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public - Anyone can join</SelectItem>
                        <SelectItem value="request_to_join">Request to Join - Approval required</SelectItem>
                        <SelectItem value="private">Private - Invite only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Cover Image</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="cover-upload"
                      />
                      <label htmlFor="cover-upload" className="cursor-pointer">
                        <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <span className="text-sm text-gray-600">
                          {newGroup.coverImage ? newGroup.coverImage.name : 'Click to upload cover image'}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitGroup}
                      disabled={createGroupMutation.isPending}
                      className="flex-1"
                    >
                      {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="discover">Discover</TabsTrigger>
              <TabsTrigger value="my-groups">My Groups</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Discover Groups */}
          <TabsContent value="discover" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search groups..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {groupCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group: Group) => (
                <Card key={group.id} className="hover:shadow-lg transition-shadow">
                  <div className="relative">
                    {group.coverImage ? (
                      <img
                        src={group.coverImage}
                        alt={group.name}
                        className="w-full h-32 object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-lg flex items-center justify-center">
                        <Users className="w-8 h-8 text-white" />
                      </div>
                    )}
                    {group.isVerified && (
                      <Badge className="absolute top-2 right-2 bg-blue-500">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <Badge variant="outline">
                        {groupCategories.find(c => c.id === group.category)?.icon}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {group.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{group.memberCount} members</span>
                      </div>
                      <Badge variant={group.privacy === 'public' ? 'default' : 'secondary'}>
                        {group.privacy === 'public' ? 'Public' : 
                         group.privacy === 'private' ? 'Private' : 'Request to Join'}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={group.creator.avatar} />
                        <AvatarFallback>{group.creator.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-600">
                        Created by {group.creator.name}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {group.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                      {group.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{group.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {group.membershipStatus === 'member' || group.isJoined ? (
                        <Button 
                          className="flex-1" 
                          onClick={() => setSelectedGroup(group)}
                        >
                          View Group
                        </Button>
                      ) : (
                        <Button 
                          className="flex-1"
                          onClick={() => joinGroupMutation.mutate(group.id)}
                          disabled={joinGroupMutation.isPending}
                        >
                          {group.privacy === 'public' ? 'Join' : 'Request to Join'}
                        </Button>
                      )}
                      <Button variant="outline" size="icon">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty State */}
            {groups.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Groups Found</h2>
                <p className="text-gray-600 mb-4">
                  {searchQuery || selectedCategory !== 'all' 
                    ? 'Try adjusting your search or filters.' 
                    : 'Be the first to create a group in your community!'}
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Group
                </Button>
              </div>
            )}
          </TabsContent>

          {/* My Groups */}
          <TabsContent value="my-groups">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.filter((group: Group) => group.isJoined).map((group: Group) => (
                <Card key={group.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      {group.membershipStatus === 'admin' && (
                        <Badge variant="outline">
                          <Crown className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{group.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{group.memberCount} members</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        className="flex-1"
                        onClick={() => setSelectedGroup(group)}
                      >
                        View Group
                      </Button>
                      {group.membershipStatus === 'admin' && (
                        <Button variant="outline" size="icon">
                          <Settings className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Events */}
          <TabsContent value="events">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupEvents.map((event: GroupEvent) => (
                <Card key={event.id} className="hover:shadow-lg transition-shadow">
                  {event.coverImage && (
                    <img
                      src={event.coverImage}
                      alt={event.title}
                      className="w-full h-32 object-cover rounded-t-lg"
                    />
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {event.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span>{event.isVirtual ? 'Virtual Event' : event.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>{event.currentAttendees} attending</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant={event.attendeeStatus === 'going' ? 'default' : 'outline'}
                        onClick={() => rsvpEventMutation.mutate({
                          eventId: event.id,
                          status: event.attendeeStatus === 'going' ? 'not_going' : 'going'
                        })}
                      >
                        {event.attendeeStatus === 'going' ? 'Going' : 'Join Event'}
                      </Button>
                      <Button size="sm" variant="outline">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Group Detail Modal */}
      {selectedGroup && (
        <Dialog open={true} onOpenChange={() => setSelectedGroup(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <span>{selectedGroup.name}</span>
                {selectedGroup.isVerified && (
                  <Badge className="bg-blue-500">Verified</Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-gray-600">{selectedGroup.description}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Category</h3>
                  <Badge variant="outline">
                    {groupCategories.find(c => c.id === selectedGroup.category)?.name}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedGroup.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="events" className="space-y-4">
                {groupEvents.map((event: GroupEvent) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <CardDescription>{event.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {new Date(event.eventDate).toLocaleDateString()} • {event.currentAttendees} attending
                        </div>
                        <Button size="sm">View Details</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="files" className="space-y-4">
                {groupFiles.map((file: GroupFile) => (
                  <Card key={file.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(file.fileType)}
                          <div>
                            <p className="font-medium">{file.fileName}</p>
                            <p className="text-sm text-gray-600">
                              {formatFileSize(file.fileSize)} • {file.downloadCount} downloads
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="members" className="space-y-4">
                <div className="text-center text-gray-600">
                  Member list coming soon...
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}