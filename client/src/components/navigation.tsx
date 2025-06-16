import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
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
  Plus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Navigation() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-50">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Logo */}
        <div className="flex items-center space-x-4">
          <Link href="/">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">Social</span>
            </div>
          </Link>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search for people, posts, and more..."
              className="pl-10 pr-4 py-2 w-full bg-gray-100 border-0 rounded-full focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Right: Action Buttons and User Menu */}
        <div className="flex items-center space-x-3">
          {/* Create Post Button */}
          <Button size="sm" className="rounded-full">
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Create</span>
          </Button>

          {/* Messages */}
          <Link href="/messages">
            <Button variant="ghost" size="sm" className="relative p-2 rounded-full">
              <MessageCircle className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500">
                3
              </Badge>
            </Button>
          </Link>

          {/* Notifications */}
          <Link href="/notifications">
            <Button variant="ghost" size="sm" className="relative p-2 rounded-full">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500">
                5
              </Badge>
            </Button>
          </Link>

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
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
