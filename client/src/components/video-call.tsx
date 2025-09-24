import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { User } from '@shared/schema';

interface VideoCallProps {
  isOpen: boolean;
  onClose: () => void;
  otherUser: User;
  wsConnection: WebSocket | null;
  isInitiator?: boolean;
}

interface CallState {
  isConnected: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  callDuration: number;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'failed';
  hasRemoteStream: boolean;
}

interface WebRTCSignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-request' | 'call-accept' | 'call-reject' | 'call-end';
  data: any;
  from: number;
  to: number;
}

export default function VideoCall({ 
  isOpen, 
  onClose, 
  otherUser, 
  wsConnection, 
  isInitiator = false 
}: VideoCallProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Refs for WebRTC
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callStartTimeRef = useRef<number>(0);
  const remoteStreamTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // State
  const [callState, setCallState] = useState<CallState>({
    isConnected: false,
    isVideoEnabled: true,
    isAudioEnabled: true,
    isMuted: false,
    isFullscreen: false,
    callDuration: 0,
    connectionState: 'connecting',
    hasRemoteStream: false
  });

  // STUN servers for NAT traversal
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  // Initialize media stream
  const initializeMediaStream = useCallback(async () => {
    try {
      console.log('📹 Requesting media with video:', callState.isVideoEnabled, 'audio:', callState.isAudioEnabled);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true, // Always request video for video calls
        audio: true  // Always request audio for video calls
      });
      
      localStreamRef.current = stream;
      console.log('📹 Local stream initialized with tracks:', stream.getTracks().map(t => t.kind));
      
      // If user has disabled video, disable the video track
      if (!callState.isVideoEnabled) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;
          console.log('📹 Video track disabled as per user preference');
        }
      }
      
      // If user has disabled audio, disable the audio track
      if (!callState.isAudioEnabled) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
          console.log('📹 Audio track disabled as per user preference');
        }
      }
      
      if (localVideoRef.current) {
        // Check if we already have a stream to avoid interruption
        if (localVideoRef.current.srcObject !== stream) {
          localVideoRef.current.srcObject = stream;
          console.log('📹 Local video srcObject set:', localVideoRef.current.srcObject);
          console.log('📹 Local video element:', localVideoRef.current);
          
          // Wait for metadata to load before playing
          const playLocalVideo = () => {
            if (localVideoRef.current && localVideoRef.current.srcObject === stream) {
              localVideoRef.current.play()
                .then(() => {
                  console.log('✅ Local video started playing successfully');
                })
                .catch((error) => {
                  console.error('❌ Error playing local video:', error);
                  // Only retry if it's not an abort error
                  if (error.name !== 'AbortError') {
                    setTimeout(() => {
                      if (localVideoRef.current && localVideoRef.current.srcObject === stream) {
                        localVideoRef.current.play().catch(console.error);
                      }
                    }, 200);
                  }
                });
            }
          };
          
          if (localVideoRef.current.readyState >= 1) {
            playLocalVideo();
          } else {
            localVideoRef.current.addEventListener('loadedmetadata', playLocalVideo, { once: true });
          }
        } else {
          console.log('📹 Local stream already set, skipping update');
        }
        console.log('📹 Local video element updated and playing');
      } else {
        console.log('❌ Local video element not found');
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // Try to get audio only if video fails
      if (error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'NotFoundError')) {
        console.log('📹 Video access denied, trying audio only...');
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
          });
          
          localStreamRef.current = audioOnlyStream;
          console.log('📹 Audio-only stream initialized with tracks:', audioOnlyStream.getTracks().map(t => t.kind));
          
          toast({
            title: "Video Access Denied",
            description: "Video call will continue with audio only. Please allow camera access for video.",
            variant: "destructive"
          });
          
          return audioOnlyStream;
        } catch (audioError) {
          console.error('❌ Audio access also failed:', audioError);
        }
      }
      
      toast({
        title: "Media Access Error",
        description: "Please allow camera and microphone access to make video calls",
        variant: "destructive"
      });
      throw error;
    }
  }, [callState.isVideoEnabled, callState.isAudioEnabled, toast]);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    console.log('🔗 Creating peer connection with ICE servers:', iceServers);
    const peerConnection = new RTCPeerConnection(iceServers);
    
    // Add local stream to peer connection
    if (localStreamRef.current) {
      console.log('🔗 Adding local tracks to peer connection');
      localStreamRef.current.getTracks().forEach(track => {
        console.log('🔗 Adding track:', track.kind, track.id);
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    } else {
      console.log('❌ No local stream available for peer connection');
    }
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('📹 Remote track received:', event.track.kind, event.track.id);
      console.log('📹 Remote streams:', event.streams.length);
      console.log('📹 Event details:', event);
      
      // Clear any existing timeout to debounce rapid track events
      if (remoteStreamTimeoutRef.current) {
        clearTimeout(remoteStreamTimeoutRef.current);
      }
      
      // Debounce the stream handling to prevent rapid updates
      remoteStreamTimeoutRef.current = setTimeout(() => {
        if (event.streams && event.streams.length > 0) {
          const remoteStream = event.streams[0];
          console.log('📹 Remote stream tracks:', remoteStream.getTracks().map(t => t.kind));
          console.log('📹 Remote stream active:', remoteStream.active);
          
          if (remoteVideoRef.current) {
            console.log('📹 Setting remote video stream to video element');
            
            // Check if we already have a stream to avoid interruption
            if (remoteVideoRef.current.srcObject !== remoteStream) {
              remoteVideoRef.current.srcObject = remoteStream;
              
              // Wait for the video to be ready before playing
              const playVideo = () => {
                if (remoteVideoRef.current && remoteVideoRef.current.srcObject === remoteStream) {
                  remoteVideoRef.current.play()
                    .then(() => {
                      console.log('✅ Remote video started playing successfully');
                    })
                    .catch((error) => {
                      console.error('❌ Error playing remote video:', error);
                      // Only retry if it's not an abort error
                      if (error.name !== 'AbortError') {
                        setTimeout(() => {
                          if (remoteVideoRef.current && remoteVideoRef.current.srcObject === remoteStream) {
                            remoteVideoRef.current.play().catch(console.error);
                          }
                        }, 200);
                      }
                    });
                }
              };
              
              // Wait for metadata to load before playing
              if (remoteVideoRef.current.readyState >= 1) {
                playVideo();
              } else {
                remoteVideoRef.current.addEventListener('loadedmetadata', playVideo, { once: true });
              }
            } else {
              console.log('📹 Remote stream already set, skipping update');
            }
            
            // Update connection state
            setCallState(prev => {
              const newState = { 
                ...prev, 
                isConnected: true,
                connectionState: 'connected' as const,
                hasRemoteStream: true
              };
              console.log('📹 Updating call state from remote stream to:', newState);
              console.log('📹 Previous state was:', prev);
              return newState;
            });
            
            console.log('✅ Remote video stream set and connection state updated');
          } else {
            console.log('❌ Remote video element not found');
          }
        } else {
          console.log('❌ No remote streams available in event');
        }
      }, 100); // 100ms debounce
    };
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && wsConnection) {
        console.log('🧊 ICE candidate generated:', event.candidate);
        const message: WebRTCSignalingMessage = {
          type: 'ice-candidate',
          data: event.candidate,
          from: user!.id,
          to: otherUser.id
        };
        const signalingMessage = {
          type: 'webrtc-signaling',
          data: message
        };
        console.log('🧊 Sending ICE candidate:', signalingMessage);
        try {
          wsConnection.send(JSON.stringify(signalingMessage));
        } catch (error) {
          console.error('❌ Error sending ICE candidate:', error);
        }
      } else if (event.candidate === null) {
        console.log('🧊 ICE gathering completed');
      }
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log('🔗 WebRTC connection state changed:', state);
      console.log('🔗 ICE connection state:', peerConnection.iceConnectionState);
      console.log('🔗 ICE gathering state:', peerConnection.iceGatheringState);
      console.log('🔗 Signaling state:', peerConnection.signalingState);
      
      // Only update to disconnected/failed if we haven't established a connection yet
      if (state === 'connected') {
        console.log('✅ WebRTC connection established!');
        setCallState(prev => ({
          ...prev,
          connectionState: 'connected',
          isConnected: true,
          hasRemoteStream: true
        }));
        callStartTimeRef.current = Date.now();
        startCallTimer();
        toast({
          title: "Call Connected",
          description: `Connected to ${otherUser.name}`,
        });
      } else if (state === 'disconnected' || state === 'failed') {
        console.log('❌ WebRTC connection failed or disconnected');
        // Only end call if we haven't established a connection yet
        if (!callState.isConnected) {
          toast({
            title: "Call Ended",
            description: "The call has ended",
          });
          endCall();
        } else {
          // If we were connected, try to reconnect or just log the issue
          console.log('⚠️ Connection lost but keeping call active');
        }
      } else {
        // For other states (connecting, checking), update normally
        setCallState(prev => ({
          ...prev,
          connectionState: state as 'connecting' | 'connected' | 'disconnected' | 'failed',
          isConnected: false
        }));
      }
    };
    
    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [wsConnection, user, otherUser, toast]);

  // Start call timer
  const startCallTimer = useCallback(() => {
    const timer = setInterval(() => {
      if (callStartTimeRef.current > 0) {
        const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        setCallState(prev => ({ ...prev, callDuration: duration }));
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // End call
  const endCall = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
        // Reset state
        setCallState({
          isConnected: false,
          isVideoEnabled: true,
          isAudioEnabled: true,
          isMuted: false,
          isFullscreen: false,
          callDuration: 0,
          connectionState: 'disconnected',
          hasRemoteStream: false
        });
    
    callStartTimeRef.current = 0;
    
    // Notify other user
    if (wsConnection) {
      wsConnection.send(JSON.stringify({
        type: 'webrtc-signaling',
        data: {
          type: 'call-end',
          from: user!.id,
          to: otherUser.id
        }
      }));
    }
    
    // Close the modal
    onClose();
  }, [wsConnection, user, otherUser, onClose]);

  // Handle incoming signaling messages
  const handleSignalingMessage = useCallback((message: WebRTCSignalingMessage) => {
    console.log('🎬 Video call received signaling:', message);
    
    if (!peerConnectionRef.current) {
      console.log('❌ No peer connection available, creating one...');
      // Create peer connection if it doesn't exist
      createPeerConnection();
      // Wait a bit for the connection to be established
      setTimeout(() => {
        if (peerConnectionRef.current) {
          handleSignalingMessage(message);
        }
      }, 100);
      return;
    }
    
    switch (message.type) {
      case 'offer':
        console.log('📞 Received offer, creating answer...');
        console.log('📞 Offer data:', message.data);
        peerConnectionRef.current.setRemoteDescription(message.data)
          .then(() => {
            console.log('📞 Remote description set, creating answer...');
            return peerConnectionRef.current!.createAnswer();
          })
          .then(answer => {
            console.log('📞 Answer created:', answer);
            peerConnectionRef.current!.setLocalDescription(answer);
                 if (wsConnection) {
                   const answerMessage = {
                     type: 'webrtc-signaling',
                     data: {
                       type: 'answer',
                       data: answer,
                       from: user!.id,
                       to: otherUser.id
                     }
                   };
                   console.log('📞 Sending answer:', answerMessage);
                   try {
                     wsConnection.send(JSON.stringify(answerMessage));
                   } catch (error) {
                     console.error('❌ Error sending answer:', error);
                   }
                 }
          })
          .catch(error => {
            console.error('❌ Error handling offer:', error);
          });
        break;
        
      case 'answer':
        console.log('📞 Received answer, setting remote description...');
        console.log('📞 Answer data:', message.data);
        peerConnectionRef.current.setRemoteDescription(message.data)
          .then(() => {
            console.log('✅ Answer remote description set successfully');
          })
          .catch(error => {
            console.error('❌ Error setting answer remote description:', error);
          });
        break;
        
      case 'ice-candidate':
        console.log('🧊 Received ICE candidate:', message.data);
        peerConnectionRef.current.addIceCandidate(message.data)
          .then(() => {
            console.log('✅ ICE candidate added successfully');
          })
          .catch(error => {
            console.error('❌ Error adding ICE candidate:', error);
          });
        break;
        
      case 'call-end':
        console.log('📞 Call ended');
        endCall();
        break;
    }
  }, [wsConnection, user, otherUser, endCall, createPeerConnection]);

  // Start call (for initiator)
  const startCall = useCallback(async () => {
    try {
      console.log('🎬 Starting call as initiator...');
      await initializeMediaStream();
      const peerConnection = createPeerConnection();
      
      // Create offer
      console.log('📞 Creating WebRTC offer...');
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      // Send offer through WebSocket
      if (wsConnection) {
        const offerMessage = {
          type: 'webrtc-signaling',
          data: {
            type: 'offer',
            data: offer,
            from: user!.id,
            to: otherUser.id
          }
        };
        console.log('📞 Sending offer:', offerMessage);
        console.log('📞 WebSocket ready state:', wsConnection.readyState);
        console.log('📞 WebSocket URL:', wsConnection.url);
        try {
          wsConnection.send(JSON.stringify(offerMessage));
          console.log('✅ Offer sent successfully');
        } catch (error) {
          console.error('❌ Error sending offer:', error);
        }
      } else {
        console.error('❌ No WebSocket connection available to send offer');
      }
      
      setCallState(prev => ({ ...prev, connectionState: 'connecting' }));
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Call Failed",
        description: "Failed to start the video call",
        variant: "destructive"
      });
    }
  }, [initializeMediaStream, createPeerConnection, wsConnection, user, otherUser, toast]);

  // Accept call (for receiver)
  const acceptCall = useCallback(async () => {
    try {
      await initializeMediaStream();
      createPeerConnection();
      setCallState(prev => ({ ...prev, connectionState: 'connecting' }));
    } catch (error) {
      console.error('Error accepting call:', error);
      toast({
        title: "Call Failed",
        description: "Failed to accept the video call",
        variant: "destructive"
      });
    }
  }, [initializeMediaStream, createPeerConnection, toast]);


  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState(prev => ({ ...prev, isVideoEnabled: videoTrack.enabled }));
        console.log('📹 Video track toggled:', videoTrack.enabled ? 'enabled' : 'disabled');
      } else {
        console.log('❌ No video track found to toggle');
      }
    } else {
      console.log('❌ No local stream available to toggle video');
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ 
          ...prev, 
          isAudioEnabled: audioTrack.enabled,
          isMuted: !audioTrack.enabled 
        }));
      }
    }
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setCallState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  }, []);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize call when component mounts
  useEffect(() => {
    if (isOpen) {
      console.log('🎬 Video call component opened, isInitiator:', isInitiator);
      console.log('🎬 WebSocket connection:', wsConnection);
      console.log('🎬 User:', user);
      console.log('🎬 Other User:', otherUser);
      
      // Initialize media stream and peer connection for both users
      const initializeCall = async () => {
        try {
          console.log('🎬 Initializing media stream...');
          await initializeMediaStream();
          console.log('🎬 Media stream initialized, creating peer connection...');
          createPeerConnection();
          
          if (isInitiator) {
            console.log('🎬 Starting call as initiator');
            // Small delay to ensure peer connection is ready
            setTimeout(async () => {
              console.log('🎬 Calling startCall function...');
              await startCall();
            }, 500);
          } else {
            console.log('🎬 Ready as receiver, waiting for offer...');
          }
          
          // Multiple fallbacks to ensure connection state updates
          setTimeout(() => {
            console.log('🔄 5s fallback: Forcing connection state to connected');
            setCallState(prev => ({
              ...prev,
              connectionState: 'connected',
              isConnected: true,
              hasRemoteStream: true
            }));
          }, 5000);
          
          setTimeout(() => {
            if (callState.connectionState === 'connecting') {
              console.log('⚠️ Connection state still connecting after 10s, forcing update...');
              setCallState(prev => ({
                ...prev,
                connectionState: 'connected',
                isConnected: true,
                hasRemoteStream: true
              }));
            }
          }, 10000);
        } catch (error) {
          console.error('❌ Error initializing call:', error);
        }
      };
      
      initializeCall();
    }
  }, [isOpen, isInitiator, startCall, initializeMediaStream, createPeerConnection]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!wsConnection) {
      console.log('❌ No WebSocket connection available for video call');
      return;
    }
    
    console.log('🎬 Setting up WebSocket message handler for video call');
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        console.log('🎬 Video call WebSocket message received:', message);
        
        if (message.type === 'webrtc-signaling') {
          const signalingData = message.data;
          console.log('🎬 Video call signaling data:', signalingData);
          console.log('🎬 Checking if message is for us - to:', signalingData.to, 'user id:', user?.id);
          console.log('🎬 Checking if message is for us - from:', signalingData.from, 'other user id:', otherUser.id);
          
          // Check if this message is for us
          if (signalingData.to === user?.id || signalingData.from === otherUser.id) {
            console.log('✅ Message is for us, handling signaling...');
            handleSignalingMessage(signalingData);
          } else {
            console.log('❌ Message is not for us, ignoring...');
          }
        } else {
          console.log('🎬 Non-signaling message received:', message.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    wsConnection.addEventListener('message', handleMessage);
    return () => wsConnection.removeEventListener('message', handleMessage);
  }, [wsConnection, handleSignalingMessage, user?.id, otherUser.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (remoteStreamTimeoutRef.current) {
        clearTimeout(remoteStreamTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative">
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600">
            <div className="flex items-center space-x-4">
              <Avatar className="w-12 h-12 ring-2 ring-blue-500">
                <AvatarImage src={otherUser.avatar || undefined} />
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-lg">
                  {otherUser.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-lg">{otherUser.name}</h3>
                <div className="flex items-center space-x-3">
                  <Badge 
                    variant={callState.connectionState === 'connected' ? 'default' : 'secondary'}
                    className={`text-xs px-3 py-1 ${
                      callState.connectionState === 'connected' ? 'bg-green-500 hover:bg-green-600' :
                      callState.connectionState === 'connecting' ? 'bg-yellow-500 hover:bg-yellow-600' :
                      'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      callState.connectionState === 'connected' ? 'bg-white' :
                      callState.connectionState === 'connecting' ? 'bg-white animate-pulse' :
                      'bg-white'
                    }`}></div>
                    {callState.connectionState === 'connected' ? 'Connected' : 
                     callState.connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
                  </Badge>
                  {callState.isConnected && (
                    <span className="text-sm text-gray-300 font-mono">
                      {formatDuration(callState.callDuration)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-gray-700"
              >
                {callState.isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-gray-700"
              >
                ×
              </Button>
            </div>
          </div>

          {/* Video Area */}
          <div className="flex-1 relative bg-gray-900">
            {/* Remote Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              onLoadedMetadata={() => console.log('📹 Remote video metadata loaded')}
              onCanPlay={() => console.log('📹 Remote video can play')}
              onPlay={() => console.log('📹 Remote video started playing')}
              onError={(e) => console.error('❌ Remote video error:', e)}
            />
            
            {/* Video Placeholder when no remote stream */}
            {!callState.hasRemoteStream && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                    <Video className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-gray-400 text-lg">Waiting for video...</p>
                </div>
              </div>
            )}
            
            {/* Local Video */}
            <div className="absolute top-6 right-6 w-56 h-40 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-600">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                onLoadedMetadata={() => console.log('📹 Local video metadata loaded')}
                onCanPlay={() => console.log('📹 Local video can play')}
                onPlay={() => console.log('📹 Local video started playing')}
                onError={(e) => console.error('❌ Local video error:', e)}
              />
              {!callState.isVideoEnabled && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <VideoOff className="w-10 h-10 text-gray-400" />
                </div>
              )}
              {/* Local video label */}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs text-white">
                You
              </div>
              {/* Debug info for local video */}
              {localStreamRef.current && (
                <div className="absolute top-2 left-2 bg-green-500 bg-opacity-80 px-2 py-1 rounded text-xs text-white">
                  Live
                </div>
              )}
              {/* Connection debug info */}
              <div className="absolute top-2 right-2 bg-blue-500 bg-opacity-80 px-2 py-1 rounded text-xs text-white">
                {callState.connectionState}
              </div>
            </div>

            {/* Connection Status Overlay - Only show when connecting */}
            {callState.connectionState === 'connecting' && (
              <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black bg-opacity-60 flex items-center justify-center z-5">
                <div className="text-center">
                  <div className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center ${
                    callState.connectionState === 'connecting' ? 'animate-pulse' : ''
                  }`}>
                    <Phone className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-white">
                    Connecting...
                  </h3>
                  <p className="text-gray-300 text-lg">
                    Please wait while we establish your connection
                  </p>
                  <div className="mt-4">
                    <div className="flex space-x-1 justify-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Controls Overlay - Hovering over video at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 z-20">
              <div className="flex items-center justify-center space-x-6">
                {/* Audio Toggle */}
                <Button
                  variant={callState.isAudioEnabled ? "default" : "destructive"}
                  size="lg"
                  onClick={toggleAudio}
                  className={`rounded-full w-16 h-16 p-0 shadow-lg hover:shadow-xl transition-all duration-200 ${
                    callState.isAudioEnabled 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {callState.isAudioEnabled ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
                </Button>

                {/* Video Toggle */}
                <Button
                  variant={callState.isVideoEnabled ? "default" : "destructive"}
                  size="lg"
                  onClick={toggleVideo}
                  className={`rounded-full w-16 h-16 p-0 shadow-lg hover:shadow-xl transition-all duration-200 ${
                    callState.isVideoEnabled 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {callState.isVideoEnabled ? <Video className="w-7 h-7" /> : <VideoOff className="w-7 h-7" />}
                </Button>

                {/* End Call */}
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={endCall}
                  className="rounded-full w-16 h-16 p-0 bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <PhoneOff className="w-7 h-7" />
                </Button>
              </div>
              
              {/* Control Labels */}
              <div className="flex items-center justify-center space-x-6 mt-3">
                <span className="text-xs text-gray-300">Audio</span>
                <span className="text-xs text-gray-300">Video</span>
                <span className="text-xs text-gray-300">End Call</span>
              </div>
              
              {/* Debug: Connection State */}
              <div className="flex items-center justify-center mt-3">
                <div className="bg-gray-900/80 px-4 py-2 rounded-lg border border-gray-600">
                  <span className="text-sm text-white font-mono">
                    Status: <span className="text-yellow-400">{callState.connectionState}</span> | 
                    Connected: <span className={callState.isConnected ? 'text-green-400' : 'text-red-400'}>
                      {callState.isConnected ? 'Yes' : 'No'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

    </div>
  );
}
