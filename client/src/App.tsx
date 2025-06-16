import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth";
import { useAuth } from "./hooks/use-auth";
import AuthPage from "@/pages/auth";
import FeedPage from "@/pages/feed";
import ProfilePage from "@/pages/profile";
import ExplorePage from "@/pages/explore";
import MessagesPage from "@/pages/messages";
import NotificationsPage from "@/pages/notifications";
import Navigation from "@/components/navigation";
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

  return (
    <div className="min-h-screen bg-[hsl(210,36%,96%)]">
      <Navigation />
      <main className="pt-16 pb-20 md:pb-4">
        <Switch>
          <Route path="/" component={FeedPage} />
          <Route path="/profile/:id?" component={ProfilePage} />
          <Route path="/explore" component={ExplorePage} />
          <Route path="/messages" component={MessagesPage} />
          <Route path="/notifications" component={NotificationsPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
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
