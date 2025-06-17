import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth.tsx";
import { useAuth } from "./hooks/use-auth";
import AuthPage from "@/pages/auth";
import FeedPage from "@/pages/feed";
import ProfilePage from "@/pages/profile";
import ExplorePage from "@/pages/explore";
import MessagesPage from "@/pages/messages";
import NotificationsPage from "@/pages/notifications";
import FriendsPage from "@/pages/friends";
import SavedPage from "@/pages/saved";
import SettingsPage from "@/pages/settings";
import AdminDashboard from "@/pages/admin";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import NotFound from "@/pages/not-found";

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Check if user is admin and automatically redirect or show admin interface
  const isAdminUser = user.role === 'admin' || user.role === 'super_admin';
  const isAdminRoute = window.location.pathname.startsWith('/admin');

  // Auto-redirect admin users to admin dashboard if they're on the main site
  if (isAdminUser && !isAdminRoute && window.location.pathname === '/') {
    window.location.href = '/admin';
    return null;
  }

  if (isAdminUser && isAdminRoute) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Switch>
          <Route path="/admin" component={AdminDashboard} />
          <Route component={NotFound} />
        </Switch>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      <div className="flex pt-14">
        <Sidebar />
        <main className="flex-1 ml-64 min-h-screen">
          <Switch>
            <Route path="/" component={FeedPage} />
            <Route path="/profile/:id?" component={ProfilePage} />
            <Route path="/profile" component={ProfilePage} />
            <Route path="/explore" component={ExplorePage} />
            <Route path="/messages" component={MessagesPage} />
            <Route path="/notifications" component={NotificationsPage} />
            <Route path="/friends" component={FriendsPage} />
            <Route path="/saved" component={SavedPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
