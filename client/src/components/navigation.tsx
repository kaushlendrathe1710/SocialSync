import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useAuthContext } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { getUserInitials } from "@/lib/auth";
import { 
  Search, 
  MessageCircle, 
  Bell, 
  Settings,
  LogOut,
  Plus,
  Monitor,
  HelpCircle,
  Shield,
  UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SearchDropdown from "./search-dropdown";
import NotificationsDropdown from "./notifications-dropdown";
import MessagesDropdown from "./messages-dropdown";
import CreateDropdown from "./create-dropdown";
import SettingsModal from "./settings-modal";

export default function Navigation() {
  const { user, logout } = useAuth();
  const { impersonation, stopImpersonation } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsModalType, setSettingsModalType] = useState<'settings' | 'privacy' | 'help' | 'display'>('settings');

  // Get real-time counts for notifications and messages
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/conversations'],
    refetchInterval: 5000, // Refresh every 5 seconds for faster updates
  });

  const unreadNotifications = Array.isArray(notifications) 
    ? notifications.filter((n: any) => !n.isRead).length 
    : 0;
    
  const unreadMessages = Array.isArray(conversations) 
    ? conversations.filter((c: any) => !c.readAt && c.receiverId === user?.id).length 
    : 0;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleStopImpersonation = async () => {
    try {
      await stopImpersonation();
      window.location.href = '/admin';
    } catch (error: any) {
      console.error("Failed to stop impersonation:", error);
    }
  };

  return (
    <>
      {/* Impersonation Indicator */}
      {impersonation?.isImpersonating && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            onClick={handleStopImpersonation}
            className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg flex items-center space-x-2"
            size="sm"
          >
            <UserCheck className="h-4 w-4" />
            <span>Exit Impersonation</span>
          </Button>
        </div>
      )}

      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-[70]">
          <div className="flex items-center h-14 px-4 max-w-7xl mx-auto">
            {/* Left: Logo and Search */}
            <div className="flex items-center space-x-3 flex-1">
              <Link href="/">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">f</span>
                  </div>
                </div>
              </Link>
              
              {/* Search Bar */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search Facebook"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchOpen(true)}
                  className="pl-10 pr-4 py-2 w-80 bg-gray-100 border-0 rounded-full focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <SearchDropdown
                  isOpen={isSearchOpen}
                  onClose={() => setIsSearchOpen(false)}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              </div>
            </div>

            {/* Center: Navigation Icons */}
            <div className="flex items-center justify-center flex-1">
              <div className="flex items-center space-x-2">
                <Link href="/">
                  <div className="p-3 rounded-lg hover:bg-gray-100 cursor-pointer">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9.464 2.114a.5.5 0 0 1 .72 0l.03.03L12 3.9l1.786-1.756a.5.5 0 0 1 .72 0l.03.03 1.72 1.72c.131.131.131.343 0 .474L14.5 5.914V11.5a.5.5 0 0 1-.5.5H10a.5.5 0 0 1-.5-.5V5.914L7.744 4.158a.5.5 0 0 1 0-.474l1.72-1.72z"/>
                      <path d="M2 11a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-7zm3 0a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-7zm3 0a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-7z"/>
                    </svg>
                  </div>
                </Link>
                <Link href="/friends">
                  <div className="p-3 rounded-lg hover:bg-gray-100 cursor-pointer">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </Link>
                <Link href="/explore">
                  <div className="p-3 rounded-lg hover:bg-gray-100 cursor-pointer">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                    </svg>
                  </div>
                </Link>
                <Link href="/wellness">
                  <div className="p-3 rounded-lg hover:bg-gray-100 cursor-pointer">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a1.5 1.5 0 011.5 1.5 1.5 1.5 0 11-3 0V9z" />
                    </svg>
                  </div>
                </Link>
                <Link href="/communities">
                  <div className="p-3 rounded-lg hover:bg-gray-100 cursor-pointer">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </Link>
              </div>
            </div>

            {/* Right: Action Buttons and User Menu */}
            <div className="flex items-center space-x-2 flex-1 justify-end">
          {/* Create Button */}
          <div className="relative">
            <Button 
              size="sm" 
              className="rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 border-0"
              onClick={() => {
                setIsCreateOpen(!isCreateOpen);
                setIsSearchOpen(false);
                setIsNotificationsOpen(false);
                setIsMessagesOpen(false);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <CreateDropdown
              isOpen={isCreateOpen}
              onClose={() => setIsCreateOpen(false)}
              onCreatePost={() => {
                setIsCreateOpen(false);
                const event = new CustomEvent('openCreatePost');
                window.dispatchEvent(event);
              }}
              onCreateStory={() => {
                setIsCreateOpen(false);
                const event = new CustomEvent('openCreateStory');
                window.dispatchEvent(event);
              }}
              onCreateEvent={() => {
                setIsCreateOpen(false);
                const event = new CustomEvent('openCreateEvent');
                window.dispatchEvent(event);
              }}
              onCreateRoom={() => {
                setIsCreateOpen(false);
                const event = new CustomEvent('openCreateRoom');
                window.dispatchEvent(event);
              }}
            />
          </div>

          {/* Messages */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800"
              onClick={() => {
                setIsMessagesOpen(!isMessagesOpen);
                setIsSearchOpen(false);
                setIsNotificationsOpen(false);
                setIsCreateOpen(false);
              }}
            >
              <MessageCircle className="h-5 w-5" />
              {unreadMessages > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </Badge>
              )}
            </Button>
            <MessagesDropdown
              isOpen={isMessagesOpen}
              onClose={() => setIsMessagesOpen(false)}
            />
          </div>

          {/* Notifications */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800"
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsSearchOpen(false);
                setIsMessagesOpen(false);
                setIsCreateOpen(false);
              }}
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Badge>
              )}
            </Button>
            <NotificationsDropdown
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
            />
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar || ""} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-semibold">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem className="flex flex-col items-start p-3">
                <div className="font-medium">{user?.name || user?.username}</div>
                <div className="text-sm text-muted-foreground">@{user?.username}</div>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile" className="w-full">
                  <div className="flex items-center">
                    <Avatar className="h-4 w-4 mr-2">
                      <AvatarImage src={user?.avatar || ""} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                        {getUserInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <span>View Profile</span>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSettingsModalType('privacy');
                setShowSettingsModal(true);
              }}>
                <Shield className="mr-2 h-4 w-4" />
                <span>Settings & Privacy</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSettingsModalType('help');
                setShowSettingsModal(true);
              }}>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Help & Support</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSettingsModalType('display');
                setShowSettingsModal(true);
              }}>
                <Monitor className="mr-2 h-4 w-4" />
                <span>Display & Accessibility</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Modals */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        type={settingsModalType}
      />
    </nav>
    </>
  );
}
