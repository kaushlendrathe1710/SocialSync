import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  Bell,
  Eye,
  Users,
  Lock,
  Mail,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Globe,
  Volume2,
  Download,
  Trash2,
  UserX,
  AlertTriangle
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'settings' | 'privacy' | 'help' | 'display';
}

export default function SettingsModal({ isOpen, onClose, type }: SettingsModalProps) {
  const [notifications, setNotifications] = useState({
    likes: true,
    comments: true,
    follows: true,
    messages: true,
    email: false,
    push: true,
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    whoCanMessage: 'everyone',
    whoCanFollow: 'everyone',
    showOnlineStatus: true,
    showLastSeen: true,
    twoFactorAuth: false,
  });

  const [display, setDisplay] = useState({
    theme: 'system',
    language: 'en',
    fontSize: 'medium',
    reducedMotion: false,
    highContrast: false,
    autoplay: true,
  });

  const getModalContent = () => {
    switch (type) {
      case 'settings':
        return {
          title: 'Settings',
          description: 'Manage your account settings and preferences',
        };
      case 'privacy':
        return {
          title: 'Settings & Privacy',
          description: 'Control your privacy and security settings',
        };
      case 'help':
        return {
          title: 'Help & Support',
          description: 'Get help and support for your account',
        };
      case 'display':
        return {
          title: 'Display & Accessibility',
          description: 'Customize your display and accessibility preferences',
        };
      default:
        return {
          title: 'Settings',
          description: 'Manage your account settings',
        };
    }
  };

  const modalContent = getModalContent();

  if (type === 'help') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>{modalContent.title}</span>
            </DialogTitle>
            <DialogDescription>{modalContent.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Help Center */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Help Center</CardTitle>
                <CardDescription>Find answers to common questions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  Getting Started Guide
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Account & Privacy
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Posts & Stories
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Messages & Notifications
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Troubleshooting
                </Button>
              </CardContent>
            </Card>

            {/* Contact Support */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Support</CardTitle>
                <CardDescription>Get personalized help from our team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Support
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Live Chat
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Report a Problem
                </Button>
              </CardContent>
            </Card>

            {/* Community */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Community</CardTitle>
                <CardDescription>Connect with other users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  Community Guidelines
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Terms of Service
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Privacy Policy
                </Button>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (type === 'display') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Monitor className="w-5 h-5" />
              <span>{modalContent.title}</span>
            </DialogTitle>
            <DialogDescription>{modalContent.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Theme */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Theme</CardTitle>
                <CardDescription>Choose your preferred color scheme</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={display.theme} onValueChange={(value) => setDisplay({...display, theme: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center space-x-2">
                        <Sun className="w-4 h-4" />
                        <span>Light</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center space-x-2">
                        <Moon className="w-4 h-4" />
                        <span>Dark</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center space-x-2">
                        <Monitor className="w-4 h-4" />
                        <span>System</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Language */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Language</CardTitle>
                <CardDescription>Select your preferred language</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={display.language} onValueChange={(value) => setDisplay({...display, language: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="it">Italiano</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="ru">Русский</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="ko">한국어</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Font Size */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Font Size</CardTitle>
                <CardDescription>Adjust text size for better readability</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={display.fontSize} onValueChange={(value) => setDisplay({...display, fontSize: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="extra-large">Extra Large</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Accessibility */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Accessibility</CardTitle>
                <CardDescription>Options to improve accessibility</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="reduced-motion">Reduced Motion</Label>
                    <p className="text-sm text-muted-foreground">Reduce animations and transitions</p>
                  </div>
                  <Switch
                    id="reduced-motion"
                    checked={display.reducedMotion}
                    onCheckedChange={(checked) => setDisplay({...display, reducedMotion: checked})}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="high-contrast">High Contrast</Label>
                    <p className="text-sm text-muted-foreground">Increase contrast for better visibility</p>
                  </div>
                  <Switch
                    id="high-contrast"
                    checked={display.highContrast}
                    onCheckedChange={(checked) => setDisplay({...display, highContrast: checked})}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoplay">Autoplay Videos</Label>
                    <p className="text-sm text-muted-foreground">Automatically play videos in feed</p>
                  </div>
                  <Switch
                    id="autoplay"
                    checked={display.autoplay}
                    onCheckedChange={(checked) => setDisplay({...display, autoplay: checked})}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>{modalContent.title}</span>
          </DialogTitle>
          <DialogDescription>{modalContent.description}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Manage your basic account settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="w-4 h-4 mr-2" />
                  Change Email
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
                <Separator />
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Download Your Data
                </Button>
                <Button variant="destructive" className="w-full justify-start">
                  <UserX className="w-4 h-4 mr-2" />
                  Deactivate Account
                </Button>
                <Button variant="destructive" className="w-full justify-start">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Privacy</CardTitle>
                <CardDescription>Control who can see your profile and posts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="profile-visibility">Profile Visibility</Label>
                  <Select value={privacy.profileVisibility} onValueChange={(value) => setPrivacy({...privacy, profileVisibility: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="friends">Friends Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="who-can-message">Who Can Message You</Label>
                  <Select value={privacy.whoCanMessage} onValueChange={(value) => setPrivacy({...privacy, whoCanMessage: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Everyone</SelectItem>
                      <SelectItem value="friends">Friends Only</SelectItem>
                      <SelectItem value="nobody">Nobody</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="who-can-follow">Who Can Follow You</Label>
                  <Select value={privacy.whoCanFollow} onValueChange={(value) => setPrivacy({...privacy, whoCanFollow: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Everyone</SelectItem>
                      <SelectItem value="approval">Require Approval</SelectItem>
                      <SelectItem value="nobody">Nobody</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="show-online">Show Online Status</Label>
                    <p className="text-sm text-muted-foreground">Let others see when you're online</p>
                  </div>
                  <Switch
                    id="show-online"
                    checked={privacy.showOnlineStatus}
                    onCheckedChange={(checked) => setPrivacy({...privacy, showOnlineStatus: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="show-last-seen">Show Last Seen</Label>
                    <p className="text-sm text-muted-foreground">Let others see when you were last active</p>
                  </div>
                  <Switch
                    id="show-last-seen"
                    checked={privacy.showLastSeen}
                    onCheckedChange={(checked) => setPrivacy({...privacy, showLastSeen: checked})}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Push Notifications</CardTitle>
                <CardDescription>Choose what notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="likes-notif">Likes</Label>
                    <p className="text-sm text-muted-foreground">When someone likes your posts</p>
                  </div>
                  <Switch
                    id="likes-notif"
                    checked={notifications.likes}
                    onCheckedChange={(checked) => setNotifications({...notifications, likes: checked})}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="comments-notif">Comments</Label>
                    <p className="text-sm text-muted-foreground">When someone comments on your posts</p>
                  </div>
                  <Switch
                    id="comments-notif"
                    checked={notifications.comments}
                    onCheckedChange={(checked) => setNotifications({...notifications, comments: checked})}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="follows-notif">New Followers</Label>
                    <p className="text-sm text-muted-foreground">When someone starts following you</p>
                  </div>
                  <Switch
                    id="follows-notif"
                    checked={notifications.follows}
                    onCheckedChange={(checked) => setNotifications({...notifications, follows: checked})}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="messages-notif">Messages</Label>
                    <p className="text-sm text-muted-foreground">When you receive new messages</p>
                  </div>
                  <Switch
                    id="messages-notif"
                    checked={notifications.messages}
                    onCheckedChange={(checked) => setNotifications({...notifications, messages: checked})}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notif">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    id="email-notif"
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications({...notifications, email: checked})}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Account Security</CardTitle>
                <CardDescription>Keep your account safe and secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Switch
                    id="two-factor"
                    checked={privacy.twoFactorAuth}
                    onCheckedChange={(checked) => setPrivacy({...privacy, twoFactorAuth: checked})}
                  />
                </div>
                <Separator />
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="w-4 h-4 mr-2" />
                  View Login Activity
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Manage Devices
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Globe className="w-4 h-4 mr-2" />
                  Apps and Websites
                </Button>
                <Separator />
                <Button variant="destructive" className="w-full justify-start">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Log Out All Devices
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}