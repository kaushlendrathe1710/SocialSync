import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  FileText, 
  MessageSquare, 
  Activity,
  Search,
  Trash2,
  Shield,
  ShieldCheck,
  Crown,
  Eye
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";

interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  activeUsersToday: number;
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  username: string;
  role: string;
  isSuperAdmin: boolean;
  canDelete: boolean;
  isVerified: boolean;
  createdAt: string;
}

interface AdminPost {
  id: number;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [userSearch, setUserSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: stats } = useQuery({
    queryKey: ['/api/admin/stats'],
  });

  const { data: users } = useQuery({
    queryKey: ['/api/admin/users', currentPage, userSearch],
    queryFn: () => fetch(`/api/admin/users?page=${currentPage}&search=${userSearch}`).then(res => res.json()),
  });

  const { data: posts } = useQuery({
    queryKey: ['/api/admin/posts', currentPage],
    queryFn: () => fetch(`/api/admin/posts?page=${currentPage}`).then(res => res.json()),
  });

  const handleDeleteUser = async (userId: number) => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          // Refresh users list
          window.location.reload();
        }
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        const response = await fetch(`/api/admin/posts/${postId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          // Refresh posts list
          window.location.reload();
        }
      } catch (error) {
        console.error('Failed to delete post:', error);
      }
    }
  };

  const handleUpdateUserRole = async (userId: number, newRole: string, canDelete: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, canDelete }),
      });
      if (response.ok) {
        // Refresh users list
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const getRoleIcon = (role: string, isSuperAdmin: boolean) => {
    if (isSuperAdmin) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (role === 'admin') return <Shield className="h-4 w-4 text-blue-500" />;
    return <Users className="h-4 w-4 text-gray-500" />;
  };

  const getRoleBadge = (role: string, isSuperAdmin: boolean) => {
    if (isSuperAdmin) return <Badge variant="default" className="bg-yellow-500">Super Admin</Badge>;
    if (role === 'admin') return <Badge variant="default" className="bg-blue-500">Admin</Badge>;
    return <Badge variant="outline">User</Badge>;
  };

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-8">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
            <p>You don't have permission to access the admin dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back, {user.name}. Manage your platform from here.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalPosts || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalComments || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Today</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.activeUsersToday || 0}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users && Array.isArray(users) && users.map((adminUser: AdminUser) => (
                    <div key={adminUser.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>
                            {adminUser.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{adminUser.name || adminUser.username}</h3>
                            {getRoleIcon(adminUser.role, adminUser.isSuperAdmin)}
                            {getRoleBadge(adminUser.role, adminUser.isSuperAdmin)}
                          </div>
                          <p className="text-sm text-gray-500">{adminUser.email}</p>
                          <p className="text-xs text-gray-400">
                            Joined {formatDistanceToNow(new Date(adminUser.createdAt))} ago
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {user?.role === 'super_admin' && !adminUser.isSuperAdmin && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateUserRole(
                                adminUser.id, 
                                adminUser.role === 'admin' ? 'user' : 'admin',
                                adminUser.role !== 'admin'
                              )}
                            >
                              {adminUser.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                            </Button>
                          </div>
                        )}
                        {user?.canDelete && !adminUser.isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(adminUser.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Post Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {posts && Array.isArray(posts) && posts.map((post: AdminPost) => (
                    <div key={post.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>
                              {post.user.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{post.user.username}</span>
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(post.createdAt))} ago
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {post.content?.substring(0, 200)}
                          {post.content && post.content.length > 200 && '...'}
                        </p>
                        {post.imageUrl && (
                          <div className="mt-2">
                            <img
                              src={post.imageUrl}
                              alt="Post content"
                              className="max-w-xs rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/post/${post.id}`, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {user?.canDelete && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Super Admin Status</h3>
                      <p className="text-sm text-gray-500">
                        You have {user.isSuperAdmin ? 'full' : 'limited'} administrative privileges
                      </p>
                    </div>
                    <Badge variant={user.isSuperAdmin ? "default" : "outline"}>
                      {user.isSuperAdmin ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Delete Permissions</h3>
                      <p className="text-sm text-gray-500">
                        Ability to delete users and content
                      </p>
                    </div>
                    <Badge variant={user.canDelete ? "destructive" : "outline"}>
                      {user.canDelete ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Account Protection</h3>
                      <p className="text-sm text-gray-500">
                        Super admin accounts cannot be deleted
                      </p>
                    </div>
                    <Badge variant="outline">
                      <ShieldCheck className="h-4 w-4 mr-1" />
                      Protected
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}