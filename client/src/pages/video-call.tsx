import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/contexts/notification-context';
import VideoCall from '@/components/video-call';
import { User } from '@shared/schema';

interface VideoCallPageState {
  otherUser: User;
  isInitiator: boolean;
  callId?: string;
}

export default function VideoCallPage() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { wsConnection } = useNotifications();
  const [pageState, setPageState] = useState<VideoCallPageState | null>(null);
  const [isCallActive, setIsCallActive] = useState(true);

  useEffect(() => {
    // For now, we'll get the state from sessionStorage or URL params
    // This is a workaround since wouter doesn't support state passing the same way
    const stateFromStorage = sessionStorage.getItem('videoCallState');
    if (stateFromStorage) {
      try {
        const state = JSON.parse(stateFromStorage) as VideoCallPageState;
        if (state && state.otherUser) {
          setPageState(state);
          sessionStorage.removeItem('videoCallState');
        } else {
          setLocation('/messages');
        }
      } catch (error) {
        console.error('Error parsing video call state:', error);
        setLocation('/messages');
      }
    } else {
      setLocation('/messages');
    }
  }, [setLocation]);

  const handleCallEnd = () => {
    setIsCallActive(false);
    // Redirect back to messages after a short delay
    setTimeout(() => {
      setLocation('/messages');
    }, 1000);
  };

  if (!user || !pageState || !wsConnection) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading video call...</p>
        </div>
      </div>
    );
  }

  if (!isCallActive) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Call Ended</h2>
          <p className="text-gray-400">Redirecting back to messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Debug Info */}
      <div className="fixed top-4 left-4 z-50 bg-black/80 text-white p-4 rounded-lg text-sm">
        <div>User: {user?.name}</div>
        <div>Other User: {pageState.otherUser.name}</div>
        <div>Is Initiator: {pageState.isInitiator ? 'Yes' : 'No'}</div>
        <div>WebSocket: {wsConnection ? 'Connected' : 'Disconnected'}</div>
        <div>Call ID: {pageState.callId || 'None'}</div>
      </div>
      
      <VideoCall
        isOpen={true}
        onClose={handleCallEnd}
        otherUser={pageState.otherUser}
        wsConnection={wsConnection}
        isInitiator={pageState.isInitiator}
      />
    </div>
  );
}
