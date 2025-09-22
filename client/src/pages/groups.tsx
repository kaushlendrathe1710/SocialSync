import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar as UIAvatar, AvatarFallback as UIAvatarFallback, AvatarImage as UIAvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
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
  Clock,
  Volume2
} from 'lucide-react';

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
  const { user } = useAuth();
  const params = useParams();
  const groupId = params.id;
  
  const [activeTab, setActiveTab] = useState('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  // Fetch specific group with join/owner awareness
  const { data: currentGroup, isLoading: groupLoading } = useQuery({
    queryKey: ['/api/groups', groupId],
    queryFn: () => fetch(`/api/groups/${groupId}`).then(res => res.json()),
    enabled: !!groupId,
  });

  // Fetch groups list when not viewing specific group
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['/api/groups', activeTab, selectedCategory, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      return fetch(`/api/groups?${params}`).then(res => res.json());
    },
    enabled: !groupId,
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: FormData) => {
      // Backend expects JSON; ignore coverImage upload for now
      const payload = {
        name: groupData.get('name'),
        description: groupData.get('description'),
        category: groupData.get('category'),
        privacy: groupData.get('privacy'),
        tags: JSON.parse((groupData.get('tags') as string) || '[]'),
      } as any;
      return fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      setShowCreateModal(false);
      resetNewGroup();
      toast({ title: "Group created successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to create group", variant: "destructive" });
    },
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      return fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        credentials: 'include',
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      toast({ title: "Joined group successfully!" });
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

  const handleSubmitGroup = () => {
    if (!newGroup.name || !newGroup.description || !newGroup.category) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append('name', newGroup.name);
    formData.append('description', newGroup.description);
    formData.append('category', newGroup.category);
    formData.append('privacy', newGroup.privacy);
    formData.append('tags', JSON.stringify(newGroup.tags));
    // coverImage upload not yet supported by /api/groups JSON endpoint

    createGroupMutation.mutate(formData);
  };

  // Group events when viewing a specific group
  const { data: groupEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/groups', groupId, 'events'],
    queryFn: () => fetch(`/api/groups/${groupId}/events`).then(res => res.json()),
    enabled: !!groupId,
  });

  // If viewing a specific group, render group detail view
  if (groupId) {
    if (groupLoading) {
      return (
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading group...</p>
          </div>
        </div>
      );
    }

    if (!currentGroup) {
      return (
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Group not found</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6">
        {/* Group Header */}
        <div className="relative">
          {currentGroup.coverImage && (
            <img 
              src={currentGroup.coverImage} 
              alt={currentGroup.name}
              className="w-full h-64 object-cover rounded-lg"
            />
          )}
          <div className="bg-white rounded-lg shadow-lg p-6 mt-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold">{currentGroup.name}</h1>
                  {currentGroup.isVerified && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  <Badge variant="outline">{currentGroup.privacy}</Badge>
                </div>
                <p className="text-gray-600 mb-4">{currentGroup.description}</p>
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {currentGroup.memberCount} members
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Created {new Date(currentGroup.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button onClick={() => joinGroupMutation.mutate(currentGroup.id)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Group
                </Button>
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Group Content Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                {user && user.id === currentGroup.creator.id && (
                  <OwnerActions groupId={currentGroup.id} type="post" />
                )}
                <ItemsList endpoint={`/api/groups/${currentGroup.id}/posts`} queryKey={["/api/groups", currentGroup.id, "posts"]} empty="No posts yet" renderItem={(post: any) => (
                  <div key={post.id} className="p-3 border rounded">
                    <div className="text-sm text-gray-500 mb-1">by {post.user?.name || 'Owner'}</div>
                    <div>{post.content}</div>
                  </div>
                )} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                {user && user.id === currentGroup.creator.id && (
                  <OwnerActions groupId={currentGroup.id} type="event" />
                )}
                {eventsLoading ? (
                  <p className="text-center text-gray-500">Loading events…</p>
                ) : groupEvents.length === 0 ? (
                  <p className="text-center text-gray-500">No events yet</p>
                ) : (
                  <div className="space-y-3">
                    {groupEvents.map((ev: any) => (
                      <div key={ev.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="font-medium">{ev.title}</div>
                            <div className="text-sm text-gray-500">
                              {ev.eventDate ? new Date(ev.eventDate).toLocaleString() : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {ev.status && (
                            <Badge variant="outline">{ev.status}</Badge>
                          )}
                          {user && user.id === currentGroup.creator.id && (
                            <EventActions groupId={currentGroup.id} event={ev} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                {user && user.id === currentGroup.creator.id && (
                  <OwnerActions groupId={currentGroup.id} type="file" />
                )}
                <ItemsList endpoint={`/api/groups/${currentGroup.id}/files`} queryKey={["/api/groups", currentGroup.id, "files"]} empty="No files yet" renderItem={(f: any) => (
                  <div key={f.id} className="flex items-center justify-between gap-3 p-3 border rounded">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{f.fileName}</div>
                      <div className="text-xs text-gray-500 truncate">{f.fileType} • {((f.fileSize||0)/1024/1024).toFixed(1)} MB</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={f.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600">Open</a>
                      {user && user.id === currentGroup.creator.id && (
                        <FileActions groupId={currentGroup.id} file={f} />
                      )}
                    </div>
                  </div>
                )} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <MembersList groupId={currentGroup.id} creatorId={currentGroup.creator.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Main groups list view
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Group name"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              />
              <Textarea
                placeholder="Group description"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              />
              <Select value={newGroup.category} onValueChange={(value) => setNewGroup({ ...newGroup, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {groupCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newGroup.privacy} onValueChange={(value: any) => setNewGroup({ ...newGroup, privacy: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="request_to_join">Request to Join</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSubmitGroup} disabled={createGroupMutation.isPending}>
                {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {groupCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.icon} {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Groups Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="my-groups">My Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-32 bg-gray-300 rounded-t-lg"></div>
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group: Group) => (
                <Card key={group.id} className="hover:shadow-lg transition-shadow">
                  {group.coverImage && (
                    <img src={group.coverImage} alt={group.name} className="w-full h-32 object-cover rounded-t-lg" />
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg truncate">{group.name}</h3>
                      {group.isVerified && <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                    </div>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{group.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="w-4 h-4 mr-1" />
                        {group.memberCount} members
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.location.href = `/groups/${group.id}`}
                        >
                          View Group
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => joinGroupMutation.mutate(group.id)}
                          disabled={group.isJoined || joinGroupMutation.isPending}
                        >
                          {group.isJoined ? 'Joined' : 'Join'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-groups" className="space-y-4">
          {groups.filter((group: Group) => group.isJoined || group.membershipStatus).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Groups Yet</h3>
                <p className="text-gray-500 mb-4">You haven't joined any groups yet. Discover and join groups that interest you!</p>
                <Button onClick={() => setActiveTab('discover')}>
                  Discover Groups
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.filter((group: Group) => group.isJoined || group.membershipStatus).map((group: Group) => (
                <Card key={group.id} className="hover:shadow-lg transition-shadow">
                  {group.coverImage && (
                    <img src={group.coverImage} alt={group.name} className="w-full h-32 object-cover rounded-t-lg" />
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg truncate">{group.name}</h3>
                      <div className="flex items-center space-x-1">
                        {group.membershipStatus === 'admin' && <Crown className="w-4 h-4 text-yellow-600" />}
                        {group.isVerified && <Shield className="w-4 h-4 text-blue-600" />}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{group.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="w-4 h-4 mr-1" />
                        {group.memberCount} members
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.location.href = `/groups/${group.id}`}
                        >
                          View Group
                        </Button>
                        {group.membershipStatus === 'admin' && (
                          <Button size="sm" variant="secondary">
                            <Settings className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MembersList({ groupId, creatorId }: { groupId: number; creatorId: number }) {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['/api/groups', groupId, 'members'],
    queryFn: () => fetch(`/api/groups/${groupId}/members`).then(res => res.json()),
  });

  if (isLoading) {
    return <p className="text-center text-gray-500">Loading members…</p>;
  }

  if (!members.length) {
    return <p className="text-center text-gray-500">No members yet</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {members.map((m: any) => (
        <div key={m.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3 min-w-0">
            <UIAvatar className="h-8 w-8 shrink-0">
              <UIAvatarImage src={m.avatar || undefined} />
              <UIAvatarFallback>{m.name?.[0] || '?'}</UIAvatarFallback>
            </UIAvatar>
            <div className="min-w-0">
              <div className="font-medium truncate">{m.name}</div>
              <div className="text-xs text-gray-500 truncate">@{m.username}</div>
            </div>
          </div>
          {m.id === creatorId && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">Owner</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ItemsList({ endpoint, queryKey, empty, renderItem }: { endpoint: string; queryKey: any[]; empty: string; renderItem: (item: any) => JSX.Element }) {
  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetch(endpoint).then(res => res.json()),
    refetchInterval: 5000,
  });
  if (isLoading) return <p className="text-center text-gray-500">Loading…</p>;
  if (!data.length) return <p className="text-center text-gray-500">{empty}</p>;
  return <div className="space-y-3">{data.map(renderItem)}</div>;
}

function OwnerActions({ groupId, type }: { groupId: number; type: 'post' | 'event' | 'file' }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');

  const submit = async () => {
    if (type === 'post') {
      await fetch(`/api/groups/${groupId}/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ content: text }) });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, 'posts'] });
      setText('');
    } else if (type === 'event') {
      await fetch(`/api/groups/${groupId}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ title, eventDate: when }) });
      // reuse events query
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, 'events'] });
      setTitle(''); setWhen('');
    } else {
      await fetch(`/api/groups/${groupId}/files`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ fileName, fileUrl, fileType: 'link', fileSize: 0 }) });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, 'files'] });
      setFileName(''); setFileUrl('');
    }
  };

  if (type === 'post') {
    return (
      <div className="flex gap-2">
        <Input placeholder="Write a post…" value={text} onChange={(e) => setText(e.target.value)} />
        <Button size="sm" onClick={submit} disabled={!text.trim()}>Post</Button>
      </div>
    );
  }
  if (type === 'event') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Input placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <Button size="sm" onClick={submit} disabled={!title || !when}>Create</Button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <Input placeholder="File name" value={fileName} onChange={(e) => setFileName(e.target.value)} />
      <Input placeholder="File URL" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
      <Button size="sm" onClick={submit} disabled={!fileName || !fileUrl}>Add File</Button>
    </div>
  );
}

function EventActions({ groupId, event }: { groupId: number; event: any }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title || '');
  const [when, setWhen] = useState(event.eventDate ? new Date(event.eventDate).toISOString().slice(0,16) : '');

  const save = async () => {
    await fetch(`/api/groups/${groupId}/events/${event.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title, eventDate: when })
    });
    queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, 'events'] });
    setEditing(false);
  };
  const del = async () => {
    if (!confirm('Delete this event?')) return;
    await fetch(`/api/groups/${groupId}/events/${event.id}`, { method: 'DELETE', credentials: 'include' });
    queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, 'events'] });
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input className="h-8" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input className="h-8" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <Button size="sm" onClick={save}>Save</Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
      <Button size="sm" variant="destructive" onClick={del}>Delete</Button>
    </div>
  );
}

function FileActions({ groupId, file }: { groupId: number; file: any }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [fileName, setFileName] = useState(file.fileName || '');
  const [fileUrl, setFileUrl] = useState(file.fileUrl || '');
  const [description, setDescription] = useState(file.description || '');

  const save = async () => {
    await fetch(`/api/groups/${groupId}/files/${file.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ fileName, fileUrl, description })
    });
    queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, 'files'] });
    setEditing(false);
  };

  const del = async () => {
    if (!confirm('Delete this file?')) return;
    await fetch(`/api/groups/${groupId}/files/${file.id}`, { method: 'DELETE', credentials: 'include' });
    queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, 'files'] });
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input className="h-8" value={fileName} onChange={(e) => setFileName(e.target.value)} />
        <Input className="h-8" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
        <Button size="sm" onClick={save}>Save</Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
        <Button size="sm" variant="destructive" onClick={del}>Delete</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
      <Button size="sm" variant="destructive" onClick={del}>Delete</Button>
    </div>
  );
}