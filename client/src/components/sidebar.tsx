import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/lib/auth";
import {
  Home,
  Search,
  MessageCircle,
  Heart,
  User,
  Users,
  Bookmark,
  Settings,
  LogOut,
  Sparkles,
  Activity,
  Calendar,
  Play,
  Camera,
  UserSquare2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const menuItems = [
    { icon: Home, label: "Home", path: "/", active: location === "/" },
    {
      icon: Play,
      label: "Reels",
      path: "/reels",
      active: location === "/reels",
    },
    {
      icon: Camera,
      label: "Status",
      path: "/status",
      active: location === "/status",
    },
    {
      icon: Video,
      label: "Live Streams",
      path: "/live-streams",
      active: location === "/live-streams",
    },
    {
      icon: Search,
      label: "Explore",
      path: "/explore",
      active: location === "/explore",
    },
    {
      icon: MessageCircle,
      label: "Messages",
      path: "/messages",
      active: location === "/messages",
    },
    {
      icon: Heart,
      label: "Notifications",
      path: "/notifications",
      active: location === "/notifications",
    },
    {
      icon: User,
      label: "Profile",
      path: "/profile",
      active: location === "/profile",
    },
  ];

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    try {
      setShowLogoutDialog(false);
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="sticky left-0 h-[calc(100vh-3.5rem)] w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm z-30 flex flex-col">
      {/* User Profile Section - Fixed */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar || ""} />
            <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-semibold">
              {getUserInitials(user)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {user?.name || user?.username}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user?.username}</p>
          </div>
        </div>
      </div>

      {/* Scrollable Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-2 space-y-1">
          {menuItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <button
                className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                  item.active
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 ${
                    item.active ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                {item.label}
              </button>
            </Link>
          ))}
        </div>

        {/* Additional Options */}
        <div className="px-2 mt-8 space-y-1">
          <Link href="/friends">
            <button
              className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                location === "/friends"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Users
                className={`mr-3 h-5 w-5 ${
                  location === "/friends" ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                }`}
              />
              Friends
            </button>
          </Link>

          <Link href="/virtual-rooms">
            <button
              className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                location === "/virtual-rooms"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Video
                className={`mr-3 h-5 w-5 ${
                  location === "/virtual-rooms"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              />
              Virtual Rooms
            </button>
          </Link>
          <Link href="/wellness">
            <button
              className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                location === "/wellness"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Activity
                className={`mr-3 h-5 w-5 ${
                  location === "/wellness" ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                }`}
              />
              Wellness
            </button>
          </Link>
          <Link href="/groups">
            <button
              className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                location === "/groups"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Users
                className={`mr-3 h-5 w-5 ${
                  location === "/groups" ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                }`}
              />
              Groups
            </button>
          </Link>
          <Link href="/communities">
            <button
              className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                location === "/communities"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Sparkles
                className={`mr-3 h-5 w-5 ${
                  location === "/communities"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              />
              Communities
            </button>
          </Link>
          <Link href="/events">
            <button
              className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                location === "/events"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Calendar
                className={`mr-3 h-5 w-5 ${
                  location === "/events" ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                }`}
              />
              Events
            </button>
          </Link>
          <Link href="/saved">
            <button
              className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                location === "/saved"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Bookmark
                className={`mr-3 h-5 w-5 ${
                  location === "/saved" ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                }`}
              />
              Saved
            </button>
          </Link>
          <Link href="/settings">
            <button
              className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                location === "/settings"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Settings
                className={`mr-3 h-5 w-5 ${
                  location === "/settings" ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                }`}
              />
              Settings
            </button>
          </Link>
        </div>
      </nav>

      {/* Logout Button - Fixed at bottom */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Logout
        </Button>
      </div>
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="max-w-sm dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Confirm Logout</DialogTitle>
          </DialogHeader>
          <DialogDescription className="dark:text-gray-400">
            Are you sure you want to sign out? You'll need to sign in again to access your account.
          </DialogDescription>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowLogoutDialog(false)} className="dark:hover:bg-gray-700">Cancel</Button>
            <Button variant="destructive" onClick={confirmLogout}>Logout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
