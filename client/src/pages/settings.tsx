import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Settings,
  User,
  Shield,
  Bell,
  Palette,
  Globe,
  Eye,
  Lock,
  Smartphone,
  Download,
  Trash2,
  AlertTriangle,
  Check,
  Camera
} from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [accountData, setAccountData] = useState({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
    website: user?.website || '',
    location: user?.location || '',
  });

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    searchVisibility: true,
    messagePermissions: 'everyone',
    onlineStatus: true,
    readReceipts: true,
    activityStatus: true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    likesComments: true,
    mentions: true,
    follows: true,
    messages: true,
    posts: true,
    marketing: false,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    loginAlerts: true,
    deviceApprovals: true,
  });

  const [websiteError, setWebsiteError] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'password' | 'otp' | 'confirm'>('password');
  const [deleteData, setDeleteData] = useState({
    password: '',
    otp: '',
    confirmText: '',
  });
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isValidUrl = (url: string) => {
    if (!url.trim()) return true; // Allow empty URL
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSaveAccount = async () => {
    // Validate website URL
    if (accountData.website && !isValidUrl(accountData.website)) {
      toast({
        title: "Invalid Website URL",
        description: "Please enter a valid website URL (starting with http:// or https://)",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/users/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Account information updated successfully",
        });
      } else {
        throw new Error('Failed to update account');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update account information",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteDialog(true);
    setDeleteStep('password');
    setDeleteData({ password: '', otp: '', confirmText: '' });
    setDeleteError('');
  };

  const handleDeleteStep = async () => {
    setDeleteError('');
    setDeleteLoading(true);

    try {
      if (deleteStep === 'password') {
        // Step 1: Verify password
        if (!deleteData.password) {
          setDeleteError('Password is required');
          setDeleteLoading(false);
          return;
        }

        const response = await fetch('/api/auth/verify-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ password: deleteData.password }),
        });

        if (response.ok) {
          // Send OTP to user's email
          const otpResponse = await fetch('/api/auth/send-delete-otp', {
            method: 'POST',
            credentials: 'include',
          });

          if (otpResponse.ok) {
            setDeleteStep('otp');
            toast({
              title: "Verification Code Sent",
              description: "Check your email for the verification code",
            });
          } else {
            setDeleteError('Failed to send verification code');
          }
        } else {
          const errorData = await response.json();
          setDeleteError(errorData.message || 'Invalid password');
        }
      } else if (deleteStep === 'otp') {
        // Step 2: Verify OTP
        if (!deleteData.otp || deleteData.otp.length !== 6) {
          setDeleteError('Please enter the 6-digit verification code');
          setDeleteLoading(false);
          return;
        }

        const response = await fetch('/api/auth/verify-delete-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ otp: deleteData.otp }),
        });

        if (response.ok) {
          setDeleteStep('confirm');
        } else {
          const errorData = await response.json();
          setDeleteError(errorData.message || 'Invalid verification code');
        }
      } else if (deleteStep === 'confirm') {
        // Step 3: Final confirmation
        if (deleteData.confirmText !== 'DELETE') {
          setDeleteError('Please type "DELETE" to confirm account deletion');
          setDeleteLoading(false);
          return;
        }

        const response = await fetch('/api/auth/delete-account', {
          method: 'DELETE',
          credentials: 'include',
        });

        if (response.ok) {
          toast({
            title: "Account Deleted",
            description: "Your account has been permanently deleted",
          });
          // Redirect to home page after successful deletion
          window.location.href = '/';
        } else {
          const errorData = await response.json();
          setDeleteError(errorData.message || 'Failed to delete account');
        }
      }
    } catch (error) {
      setDeleteError('Something went wrong. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetDeleteFlow = () => {
    setShowDeleteDialog(false);
    setDeleteStep('password');
    setDeleteData({ password: '', otp: '', confirmText: '' });
    setDeleteError('');
    setDeleteLoading(false);
  };

  const handleDownloadData = async () => {
    try {
      toast({
        title: "Preparing Download",
        description: "Your data is being prepared for download...",
      });

      const response = await fetch('/api/user/export', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${user?.username || 'user'}-data-export.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Download Complete",
          description: "Your data has been downloaded successfully",
        });
      } else {
        throw new Error('Failed to download data');
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download your data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewDataUsage = async () => {
    try {
      const response = await fetch('/api/user/data-usage', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        toast({
          title: "Data Usage",
          description: `Posts: ${data.postsCount || 0}, Comments: ${data.commentsCount || 0}, Storage: ${data.storageUsed || '0 MB'}`,
        });
      } else {
        throw new Error('Failed to get data usage');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data usage information",
        variant: "destructive",
      });
    }
  };

  const handlePhotoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    input.onchange = async (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file && user) {
        try {
          const formData = new FormData();
          formData.append('profilePicture', file);

          const response = await fetch(`/api/users/${user.id}/profile-picture`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });

          if (response.ok) {
            const result = await response.json();
            toast({
              title: "Success",
              description: "Profile picture updated successfully",
            });
            // Refresh the page to show updated avatar
            window.location.reload();
          } else {
            throw new Error('Failed to upload photo');
          }
        } catch (error) {
          toast({
            title: "Upload Failed",
            description: "Failed to upload profile picture. Please try again.",
            variant: "destructive",
          });
        }
      }
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };



  return (
    <div className="w-full mx-auto px-4 py-6 dark:bg-gray-900 overflow-y-auto h-[calc(100vh-3.5rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center dark:text-white">
          <Settings className="w-8 h-8 mr-3" />
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 dark:bg-gray-800">
          <TabsTrigger value="account" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">Account</TabsTrigger>
          <TabsTrigger value="privacy" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">Privacy</TabsTrigger>
          <TabsTrigger value="notifications" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">Notifications</TabsTrigger>
          <TabsTrigger value="security" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">Security</TabsTrigger>
          <TabsTrigger value="data" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center dark:text-white">
                <User className="w-5 h-5 mr-2" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={user?.avatar || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-xl dark:bg-gray-700">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full p-0 dark:bg-gray-700"
                    onClick={handlePhotoUpload}
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">{user?.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">@{user?.username}</p>
                  <Button variant="outline" size="sm" className="mt-2 dark:border-gray-600 dark:text-gray-200" onClick={handlePhotoUpload}>
                    Change Photo
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="dark:text-gray-200">Full Name</Label>
                  <Input
                    id="name"
                    value={accountData.name}
                    onChange={(e) => setAccountData({...accountData, name: e.target.value})}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username" className="dark:text-gray-200">Username</Label>
                  <Input
                    id="username"
                    value={accountData.username}
                    onChange={(e) => setAccountData({...accountData, username: e.target.value})}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="dark:text-gray-200">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={accountData.email}
                    onChange={(e) => setAccountData({...accountData, email: e.target.value})}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website" className="dark:text-gray-200">Website</Label>
                  <Input
                    id="website"
                    value={accountData.website}
                    onChange={(e) => {
                      const value = e.target.value;
                      setAccountData({...accountData, website: value});

                      // Real-time validation
                      if (value && !isValidUrl(value)) {
                        setWebsiteError('Please enter a valid URL (starting with http:// or https://)');
                      } else {
                        setWebsiteError('');
                      }
                    }}
                    placeholder="https://yourwebsite.com"
                    className={`${websiteError ? 'border-red-500 focus:border-red-500' : ''} dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                  />
                  {websiteError && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {websiteError}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="dark:text-gray-200">Bio</Label>
                <Textarea
                  id="bio"
                  value={accountData.bio}
                  onChange={(e) => setAccountData({...accountData, bio: e.target.value})}
                  placeholder="Tell people about yourself..."
                  rows={3}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="dark:text-gray-200">Location</Label>
                <Input
                  id="location"
                  value={accountData.location}
                  onChange={(e) => setAccountData({...accountData, location: e.target.value})}
                  placeholder="Your location"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <Button onClick={handleSaveAccount} className="w-full">
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center dark:text-white">
                <Shield className="w-5 h-5 mr-2" />
                Privacy Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium dark:text-white">Profile Visibility</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Who can see your profile</p>
                  </div>
                  <Select value={privacySettings.profileVisibility} onValueChange={(value) =>
                    setPrivacySettings({...privacySettings, profileVisibility: value})
                  }>
                    <SelectTrigger className="w-32 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="friends">Friends</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="dark:bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium dark:text-white">Search Visibility</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Allow others to find you in search</p>
                  </div>
                  <Switch
                    checked={privacySettings.searchVisibility}
                    onCheckedChange={(checked) =>
                      setPrivacySettings({...privacySettings, searchVisibility: checked})
                    }
                  />
                </div>

                <Separator className="dark:bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium dark:text-white">Message Permissions</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Who can send you messages</p>
                  </div>
                  <Select value={privacySettings.messagePermissions} onValueChange={(value) =>
                    setPrivacySettings({...privacySettings, messagePermissions: value})
                  }>
                    <SelectTrigger className="w-32 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      <SelectItem value="everyone">Everyone</SelectItem>
                      <SelectItem value="friends">Friends</SelectItem>
                      <SelectItem value="nobody">Nobody</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="dark:bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium dark:text-white">Online Status</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Show when you're active</p>
                  </div>
                  <Switch
                    checked={privacySettings.onlineStatus}
                    onCheckedChange={(checked) =>
                      setPrivacySettings({...privacySettings, onlineStatus: checked})
                    }
                  />
                </div>

                <Separator className="dark:bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium dark:text-white">Read Receipts</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Let others know when you've read their messages</p>
                  </div>
                  <Switch
                    checked={privacySettings.readReceipts}
                    onCheckedChange={(checked) =>
                      setPrivacySettings({...privacySettings, readReceipts: checked})
                    }
                  />
                </div>

                <Separator className="dark:bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium dark:text-white">Activity Status</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Show your activity status to friends</p>
                  </div>
                  <Switch
                    checked={privacySettings.activityStatus}
                    onCheckedChange={(checked) =>
                      setPrivacySettings({...privacySettings, activityStatus: checked})
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center dark:text-white">
                <Bell className="w-5 h-5 mr-2" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium dark:text-white">Email Notifications</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({...notificationSettings, emailNotifications: checked})
                    }
                  />
                </div>

                <Separator className="dark:bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium dark:text-white">Push Notifications</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive push notifications on your device</p>
                  </div>
                  <Switch
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({...notificationSettings, pushNotifications: checked})
                    }
                  />
                </div>

                <Separator className="dark:bg-gray-700" />

                <div className="space-y-3">
                  <h4 className="font-medium dark:text-white">Notification Types</h4>

                  <div className="flex items-center justify-between">
                    <span className="text-sm dark:text-gray-300">Likes and Comments</span>
                    <Switch
                      checked={notificationSettings.likesComments}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({...notificationSettings, likesComments: checked})
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm dark:text-gray-300">Mentions</span>
                    <Switch
                      checked={notificationSettings.mentions}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({...notificationSettings, mentions: checked})
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm dark:text-gray-300">New Followers</span>
                    <Switch
                      checked={notificationSettings.follows}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({...notificationSettings, follows: checked})
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm dark:text-gray-300">Messages</span>
                    <Switch
                      checked={notificationSettings.messages}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({...notificationSettings, messages: checked})
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm dark:text-gray-300">Posts from Friends</span>
                    <Switch
                      checked={notificationSettings.posts}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({...notificationSettings, posts: checked})
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm dark:text-gray-300">Marketing Emails</span>
                    <Switch
                      checked={notificationSettings.marketing}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({...notificationSettings, marketing: checked})
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center dark:text-white">
                <Lock className="w-5 h-5 mr-2" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium dark:text-white">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={securitySettings.twoFactorAuth}
                      onCheckedChange={(checked) =>
                        setSecuritySettings({...securitySettings, twoFactorAuth: checked})
                      }
                    />
                    {securitySettings.twoFactorAuth && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>

                <Separator className="dark:bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium dark:text-white">Login Alerts</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when someone logs into your account</p>
                  </div>
                  <Switch
                    checked={securitySettings.loginAlerts}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({...securitySettings, loginAlerts: checked})
                    }
                  />
                </div>

                <Separator className="dark:bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium dark:text-white">Device Approvals</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Require approval for new device logins</p>
                  </div>
                  <Switch
                    checked={securitySettings.deviceApprovals}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({...securitySettings, deviceApprovals: checked})
                    }
                  />
                </div>

                <Separator className="dark:bg-gray-700" />

                <div className="space-y-3">
                  <h4 className="font-medium dark:text-white">Active Sessions</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-700 dark:bg-gray-700/50">
                      <div className="flex items-center space-x-3">
                        <Smartphone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium dark:text-white">Current Device</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Chrome on Windows • Active now</p>
                        </div>
                      </div>
                      <span className="text-xs text-green-600 font-medium dark:text-green-400">CURRENT</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center dark:text-white">
                <Download className="w-5 h-5 mr-2" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium dark:text-white">Download Your Data</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Get a copy of your information</p>
                  </div>
                  <Button variant="outline" onClick={handleDownloadData} className="dark:border-gray-600 dark:text-gray-200">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>

                <Separator className="dark:bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium dark:text-white">Data Usage</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">See how much storage you're using</p>
                  </div>
                  <Button variant="outline" onClick={handleViewDataUsage} className="dark:border-gray-600 dark:text-gray-200">View Details</Button>
                </div>

                <Separator className="dark:bg-gray-700" />

                <div className="space-y-3">
                  <h4 className="font-medium text-red-600 flex items-center dark:text-red-400">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Danger Zone
                  </h4>
                  <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:border-red-900 dark:bg-red-900/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-red-800 dark:text-red-300">Delete Account</h5>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Permanently delete your account and all associated data
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        className="ml-4"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Secure Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={resetDeleteFlow}>
        <DialogContent className="sm:max-w-md dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center dark:text-red-400">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Delete Account - Step {deleteStep === 'password' ? '1' : deleteStep === 'otp' ? '2' : '3'} of 3
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {deleteStep === 'password' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  To delete your account, first confirm your password:
                </p>
                <div className="space-y-2">
                  <Label htmlFor="delete-password" className="dark:text-gray-200">Current Password</Label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={deleteData.password}
                    onChange={(e) => setDeleteData({...deleteData, password: e.target.value})}
                    placeholder="Enter your current password"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  />
                </div>
              </div>
            )}

            {deleteStep === 'otp' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We've sent a verification code to your email. Enter it below:
                </p>
                <div className="space-y-2">
                  <Label htmlFor="delete-otp" className="dark:text-gray-200">Verification Code</Label>
                  <Input
                    id="delete-otp"
                    type="text"
                    maxLength={6}
                    value={deleteData.otp}
                    onChange={(e) => setDeleteData({...deleteData, otp: e.target.value.replace(/\D/g, '')})}
                    placeholder="Enter 6-digit code"
                    className="text-center text-lg tracking-widest dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            )}

            {deleteStep === 'confirm' && (
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-900">
                  <p className="text-sm text-red-800 font-medium dark:text-red-300">
                    ⚠️ This action cannot be undone!
                  </p>
                  <p className="text-sm text-red-600 mt-1 dark:text-red-400">
                    All your data, posts, messages, and account information will be permanently deleted.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delete-confirm" className="dark:text-gray-200">Type "DELETE" to confirm</Label>
                  <Input
                    id="delete-confirm"
                    type="text"
                    value={deleteData.confirmText}
                    onChange={(e) => setDeleteData({...deleteData, confirmText: e.target.value})}
                    placeholder="Type DELETE to confirm"
                    className="font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            )}

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-900">
                <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={resetDeleteFlow}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteStep}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  "Processing..."
                ) : deleteStep === 'password' ? (
                  "Verify Password"
                ) : deleteStep === 'otp' ? (
                  "Verify Code"
                ) : (
                  "Delete Account"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
