import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import LiveStreamViewer from "@/components/live-stream-viewer";
import { Video } from "lucide-react";

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

export default function LiveStreamPage() {
  const [, setLocation] = useLocation();
  const [streamId, setStreamId] = useState<number | null>(null);
  const [stream, setStream] = useState<LiveStream | null>(null);

  // Get stream ID from URL params
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    if (id && !isNaN(Number(id))) {
      setStreamId(Number(id));
    } else {
      setLocation('/feed');
    }
  }, [setLocation]);

  // Fetch stream data
  const { data: streamData, isLoading } = useQuery({
    queryKey: [`/api/live-streams/${streamId}`],
    enabled: !!streamId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  useEffect(() => {
    if (streamData) {
      setStream(streamData);
    }
  }, [streamData]);

  const handleClose = () => {
    setLocation('/feed');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading live stream...</p>
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Stream not found
          </h3>
          <p className="text-gray-600 mb-6">
            This live stream may have ended or doesn't exist.
          </p>
          <button
            onClick={() => setLocation('/feed')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Go to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <LiveStreamViewer
      isOpen={true}
      onClose={handleClose}
      stream={stream}
    />
  );
}