import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import WebRTCLiveStreamViewer from "@/components/webrtc-live-stream-viewer";
import {
  Video,
  Eye,
  Clock,
  Users,
  TrendingUp,
  Calendar,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface LiveStream {
  id: number;
  title: string;
  description?: string;
  privacy: string;
  isActive: boolean;
  viewerCount: number;
  startedAt: string;
  user: {
    id: number;
    name: string;
    username: string;
    avatar?: string;
  };
}

export default function LiveStreamsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "trending" | "recent">("all");

  // Fetch active live streams
  const {
    data: liveStreams = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["/api/live-streams"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Filter streams based on search and filter
  const filteredStreams = liveStreams.filter((stream: LiveStream) => {
    const matchesSearch =
      stream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stream.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (stream.description &&
        stream.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    switch (filter) {
      case "trending":
        return stream.viewerCount > 10; // Streams with more than 10 viewers
      case "recent":
        const streamStart = new Date(stream.startedAt);
        const now = new Date();
        const minutesSinceStart =
          (now.getTime() - streamStart.getTime()) / (1000 * 60);
        return minutesSinceStart < 30; // Streams started in the last 30 minutes
      default:
        return true;
    }
  });

  const handleJoinStream = (stream: LiveStream) => {
    setSelectedStream(stream);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedStream(null);
  };

  const formatDuration = (startedAt: string) => {
    const startTime = new Date(startedAt);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const getViewerCountText = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Live Streams
            </h1>
            <p className="text-gray-600">
              Discover and join live streams from creators around the world
            </p>
          </div>
          <Button
            onClick={() => {
              const event = new CustomEvent("openLiveVideo");
              window.dispatchEvent(event);
            }}
            className="bg-red-500 hover:bg-red-600"
          >
            <Video className="w-4 h-4 mr-2" />
            Go Live
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search live streams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "trending" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("trending")}
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Trending
            </Button>
            <Button
              variant={filter === "recent" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("recent")}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Recent
            </Button>
          </div>
        </div>
      </div>

      {/* Live Streams Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-200 rounded-t-lg"></div>
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredStreams.length === 0 ? (
        <div className="text-center py-12">
          <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? "No streams found" : "No live streams right now"}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery
              ? "Try adjusting your search terms or filters"
              : "Be the first to start a live stream!"}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => {
                const event = new CustomEvent("openLiveVideo");
                window.dispatchEvent(event);
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              <Video className="w-4 h-4 mr-2" />
              Start Your First Stream
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStreams.map((stream: LiveStream) => (
            <Card
              key={stream.id}
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div
                className="relative aspect-video bg-gradient-to-br from-red-500 to-pink-500 cursor-pointer"
                onClick={() => handleJoinStream(stream)}
              >
                {/* Live indicator */}
                <div className="absolute top-3 left-3 flex items-center space-x-2">
                  <Badge variant="destructive" className="bg-red-500">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1"></div>
                    LIVE
                  </Badge>
                  <Badge variant="secondary" className="bg-black/50 text-white">
                    <Eye className="w-3 h-3 mr-1" />
                    {getViewerCountText(stream.viewerCount)}
                  </Badge>
                </div>

                {/* Duration */}
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="bg-black/50 text-white">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDuration(stream.startedAt)}
                  </Badge>
                </div>

                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Video className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Host info overlay */}
                <div className="absolute bottom-3 left-3 flex items-center space-x-2">
                  <Avatar className="w-8 h-8 border-2 border-white">
                    <AvatarImage src={stream.user.avatar || undefined} />
                    <AvatarFallback className="bg-gray-600 text-white text-xs">
                      {stream.user.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-white text-sm">
                    <p className="font-medium">{stream.user.name}</p>
                    <p className="opacity-75">@{stream.user.username}</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-4">
                <CardTitle className="text-lg mb-2 line-clamp-2">
                  {stream.title}
                </CardTitle>
                {stream.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {stream.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      {getViewerCountText(stream.viewerCount)} watching
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatDuration(stream.startedAt)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleJoinStream(stream)}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Join
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Live Stream Viewer Modal */}
      <WebRTCLiveStreamViewer
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
        stream={selectedStream}
      />
    </div>
  );
}
