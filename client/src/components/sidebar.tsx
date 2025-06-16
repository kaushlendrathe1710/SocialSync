import { Link, useLocation } from "wouter";
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
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const menuItems = [
    { icon: Home, label: "Home", path: "/", active: location === "/" },
    { icon: Search, label: "Explore", path: "/explore", active: location === "/explore" },
    { icon: MessageCircle, label: "Messages", path: "/messages", active: location === "/messages" },
    { icon: Heart, label: "Notifications", path: "/notifications", active: location === "/notifications" },
    { icon: User, label: "Profile", path: "/profile", active: location === "/profile" },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="fixed left-0 top-14 h-full w-64 bg-white border-r border-gray-200 shadow-sm z-40">
      <div className="flex flex-col h-full">
        {/* User Profile Section */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar || ""} />
              <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                {getUserInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.name || user?.username}
              </p>
              <p className="text-xs text-gray-500 truncate">
                @{user?.username}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-4">
          <div className="px-2 space-y-1">
            {menuItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <button
                  className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                    item.active
                      ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${item.active ? "text-blue-600" : "text-gray-400"}`} />
                  {item.label}
                </button>
              </Link>
            ))}
          </div>

          {/* Additional Options */}
          <div className="px-2 mt-8 space-y-1">
            <button className="w-full flex items-center px-3 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <Users className="mr-3 h-5 w-5 text-gray-400" />
              Friends
            </button>
            <button className="w-full flex items-center px-3 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <Bookmark className="mr-3 h-5 w-5 text-gray-400" />
              Saved
            </button>
            <button className="w-full flex items-center px-3 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <Settings className="mr-3 h-5 w-5 text-gray-400" />
              Settings
            </button>
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-100">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}