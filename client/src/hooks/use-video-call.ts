import React, { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { User } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface CallState {
  isInCall: boolean;
  incomingCall: {
    from: User;
    callId: string;
  } | null;
  outgoingCall: {
    to: User;
    callId: string;
  } | null;
}

interface WebRTCSignalingMessage {
  type: 'call-request' | 'call-accept' | 'call-reject' | 'call-end';
  data: {
    callId: string;
    from: number;
    to: number;
  };
}

export function useVideoCall(wsConnection: WebSocket | null) {
  const { toast } = useToast();
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    incomingCall: null,
    outgoingCall: null
  });

  const callTimeoutRef = useRef<NodeJS.Timeout>();
  const [pendingCallUserId, setPendingCallUserId] = useState<number | null>(null);
  const [wsReady, setWsReady] = useState(false);

  // Monitor WebSocket connection state
  React.useEffect(() => {
    if (!wsConnection) {
      setWsReady(false);
      return;
    }

    const handleOpen = () => {
      console.log('WebSocket ready for video calls');
      setWsReady(true);
    };

    const handleClose = () => {
      console.log('WebSocket closed for video calls');
      setWsReady(false);
    };

    const handleError = (error: Event) => {
      console.error('WebSocket error for video calls:', error);
      setWsReady(false);
    };

    wsConnection.addEventListener('open', handleOpen);
    wsConnection.addEventListener('close', handleClose);
    wsConnection.addEventListener('error', handleError);

    // Check if already connected
    if (wsConnection.readyState === WebSocket.OPEN) {
      setWsReady(true);
    }

    return () => {
      wsConnection.removeEventListener('open', handleOpen);
      wsConnection.removeEventListener('close', handleClose);
      wsConnection.removeEventListener('error', handleError);
    };
  }, [wsConnection]);

  // Fetch user data for incoming calls
  const { data: incomingCallUser } = useQuery({
    queryKey: ['/api/users', pendingCallUserId],
    queryFn: async () => {
      if (!pendingCallUserId) return null;
      const response = await api.getUser(pendingCallUserId);
      return response.json() as Promise<User>;
    },
    enabled: !!pendingCallUserId,
  });

  // Generate unique call ID
  const generateCallId = useCallback(() => {
    return `call_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }, []);

  // Send call request
  const sendCallRequest = useCallback((to: User, currentUserId: number) => {
    if (!wsConnection || !wsReady || callState.isInCall) {
      if (!wsReady) {
        toast({
          title: "Connection Error",
          description: "WebSocket not connected. Please refresh the page.",
          variant: "destructive"
        });
      }
      return;
    }

    const callId = generateCallId();
    
    setCallState(prev => ({
      ...prev,
      outgoingCall: { to, callId },
      isInCall: true
    }));

    const message: WebRTCSignalingMessage = {
      type: 'call-request',
      data: {
        callId,
        from: currentUserId,
        to: to.id
      }
    };

    console.log('Sending call request:', message); // Debug log

    try {
      const signalingMessage = {
        type: 'webrtc-signaling',
        data: message
      };
      
      console.log('Sending WebRTC signaling message:', signalingMessage);
      console.log('WebSocket ready state:', wsConnection.readyState);
      console.log('Target user ID:', to.id);
      
      wsConnection.send(JSON.stringify(signalingMessage));

      // Set timeout for call request
      callTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Call timeout reached, ending call');
        toast({
          title: "Call Timeout",
          description: "The call request timed out",
          variant: "destructive"
        });
        endCall();
      }, 60000); // Increased to 60 seconds to allow more time for connection
      
      // Make timeout clearing function globally available
      (window as any).clearCallTimeout = () => {
        if (callTimeoutRef.current) {
          console.log('✅ Clearing call timeout - connection established');
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = undefined;
        }
      };

      toast({
        title: "Calling...",
        description: `Calling ${to.name}`,
      });
    } catch (error) {
      console.error('Error sending call request:', error);
      toast({
        title: "Call Failed",
        description: "Failed to send call request",
        variant: "destructive"
      });
      endCall();
    }
  }, [wsConnection, wsReady, callState.isInCall, generateCallId, toast]);

  // Accept incoming call
  const acceptCall = useCallback((currentUserId: number) => {
    if (!callState.incomingCall) return;

    const message: WebRTCSignalingMessage = {
      type: 'call-accept',
      data: {
        callId: callState.incomingCall.callId,
        from: currentUserId,
        to: callState.incomingCall.from.id
      }
    };

    console.log('Sending call accept:', message); // Debug log

    wsConnection?.send(JSON.stringify({
      type: 'webrtc-signaling',
      data: message
    }));

    setCallState(prev => {
      const newState = {
        ...prev,
        isInCall: true,
        incomingCall: null
      };
      console.log('📞 Call state after accepting:', newState);
      return newState;
    });

    toast({
      title: "Call Accepted",
      description: `Accepted call from ${callState.incomingCall.from.name}`,
    });
  }, [callState.incomingCall, wsConnection, toast]);

  // Reject incoming call
  const rejectCall = useCallback((currentUserId: number) => {
    if (!callState.incomingCall) return;

    const message: WebRTCSignalingMessage = {
      type: 'call-reject',
      data: {
        callId: callState.incomingCall.callId,
        from: currentUserId,
        to: callState.incomingCall.from.id
      }
    };

    console.log('Sending call reject:', message); // Debug log

    wsConnection?.send(JSON.stringify({
      type: 'webrtc-signaling',
      data: message
    }));

    setCallState(prev => ({
      ...prev,
      incomingCall: null
    }));

    toast({
      title: "Call Rejected",
      description: `Rejected call from ${callState.incomingCall.from.name}`,
    });
  }, [callState.incomingCall, wsConnection, toast]);

  // End call
  const endCall = useCallback(() => {
    console.log('📞 Ending call, clearing timeout');
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = undefined;
    }

    setCallState({
      isInCall: false,
      incomingCall: null,
      outgoingCall: null
    });
  }, []);

  // Handle incoming call request
  const handleIncomingCall = useCallback((fromUserId: number, callId: string) => {
    console.log('🎉 INCOMING CALL RECEIVED!');
    console.log('From user ID:', fromUserId);
    console.log('Call ID:', callId);
    console.log('Current call state:', callState);
    
    if (callState.isInCall) {
      console.log('Already in a call, rejecting...');
      // Reject call if already in a call
      const message: WebRTCSignalingMessage = {
        type: 'call-reject',
        data: {
          callId,
          from: 0,
          to: fromUserId
        }
      };

      wsConnection?.send(JSON.stringify({
        type: 'webrtc-signaling',
        data: message
      }));

      toast({
        title: "Call Rejected",
        description: "Already in a call",
        variant: "destructive"
      });
      return;
    }

    console.log('Setting pending call user ID:', fromUserId);
    setPendingCallUserId(fromUserId);
  }, [callState.isInCall, wsConnection, toast]);

  // Update incoming call when user data is fetched
  React.useEffect(() => {
    if (incomingCallUser && pendingCallUserId) {
      console.log('Setting up incoming call for user:', incomingCallUser); // Debug log
      setCallState(prev => ({
        ...prev,
        incomingCall: { from: incomingCallUser, callId: `call_${pendingCallUserId}_${Date.now()}` }
      }));

      toast({
        title: "Incoming Call",
        description: `${incomingCallUser.name} is calling you`,
      });
    }
  }, [incomingCallUser, pendingCallUserId, toast]);

  // Handle call accepted
  const handleCallAccepted = useCallback(() => {
    console.log('✅ Call accepted, clearing timeout');
    console.log('📞 Current call state before acceptance:', callState);
    
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = undefined;
    }

    setCallState(prev => {
      const newState = {
        ...prev,
        outgoingCall: null,
        isInCall: true // Start the actual video call
      };
      console.log('📞 New call state after acceptance:', newState);
      return newState;
    });

    toast({
      title: "Call Accepted",
      description: "Your call has been accepted",
    });
  }, [toast, callState]);

  // Handle call rejected
  const handleCallRejected = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
    }

    setCallState(prev => ({
      ...prev,
      outgoingCall: null,
      isInCall: false
    }));

    toast({
      title: "Call Rejected",
      description: "Your call was rejected",
      variant: "destructive"
    });
  }, [toast]);

  // Handle call ended
  const handleCallEnded = useCallback(() => {
    endCall();
    toast({
      title: "Call Ended",
      description: "The call has ended",
    });
  }, [endCall, toast]);

  return {
    callState,
    sendCallRequest,
    acceptCall,
    rejectCall,
    endCall,
    handleIncomingCall,
    handleCallAccepted,
    handleCallRejected,
    handleCallEnded
  };
}
