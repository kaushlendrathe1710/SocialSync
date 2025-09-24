import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

interface DebugWebRTCProps {
  wsConnection: WebSocket | null;
}

export default function DebugWebRTC({ wsConnection }: DebugWebRTCProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('Unknown');

  useEffect(() => {
    if (!wsConnection) return;

    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      const timestamp = new Date().toLocaleTimeString();
      const messageWithTime = `[${timestamp}] ${JSON.stringify(message, null, 2)}`;
      setMessages(prev => [...prev.slice(-9), messageWithTime]);
      
      // Special handling for WebRTC signaling
      if (message.type === 'webrtc-signaling') {
        console.log('🔍 DEBUG: WebRTC signaling received:', message);
      }
    };

    const handleOpen = () => {
      setIsConnected(true);
      setConnectionState('Connected');
      setMessages(prev => [...prev.slice(-9), 'WebSocket Connected']);
    };

    const handleClose = () => {
      setIsConnected(false);
      setConnectionState('Disconnected');
      setMessages(prev => [...prev.slice(-9), 'WebSocket Disconnected']);
    };

    const handleError = (error: Event) => {
      setIsConnected(false);
      setConnectionState('Error');
      setMessages(prev => [...prev.slice(-9), `WebSocket Error: ${error}`]);
    };

    wsConnection.addEventListener('message', handleMessage);
    wsConnection.addEventListener('open', handleOpen);
    wsConnection.addEventListener('close', handleClose);
    wsConnection.addEventListener('error', handleError);

    // Check initial state
    setConnectionState(wsConnection.readyState === WebSocket.OPEN ? 'Connected' : 
                      wsConnection.readyState === WebSocket.CONNECTING ? 'Connecting' :
                      wsConnection.readyState === WebSocket.CLOSING ? 'Closing' :
                      wsConnection.readyState === WebSocket.CLOSED ? 'Disconnected' : 'Unknown');

    return () => {
      wsConnection.removeEventListener('message', handleMessage);
      wsConnection.removeEventListener('open', handleOpen);
      wsConnection.removeEventListener('close', handleClose);
      wsConnection.removeEventListener('error', handleError);
    };
  }, [wsConnection]);

  const sendTestMessage = () => {
    if (wsConnection && user) {
      const testMessage = {
        type: 'webrtc-signaling',
        data: {
          type: 'call-request',
          data: {
            callId: `test-call-${Date.now()}`,
            from: user.id,
            to: 999 // Test user ID
          }
        }
      };
      
      console.log('🧪 DEBUG: Sending test call request:', testMessage);
      wsConnection.send(JSON.stringify(testMessage));
      setMessages(prev => [...prev.slice(-9), `[${new Date().toLocaleTimeString()}] Sent test call request to user 999`]);
    }
  };

  const sendTestToSelf = () => {
    if (wsConnection && user) {
      const testMessage = {
        type: 'webrtc-signaling',
        data: {
          type: 'call-request',
          data: {
            callId: `self-test-${Date.now()}`,
            from: user.id,
            to: user.id // Send to self for testing
          }
        }
      };
      
      console.log('🧪 DEBUG: Sending test call request to self:', testMessage);
      wsConnection.send(JSON.stringify(testMessage));
      setMessages(prev => [...prev.slice(-9), `[${new Date().toLocaleTimeString()}] Sent test call request to self`]);
    }
  };

  return (
    <Card className="p-4 m-4 max-w-md">
      <h3 className="font-bold mb-2">WebRTC Debug</h3>
      <div className="mb-2">
        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
          connectionState === 'Connected' ? 'bg-green-500' : 
          connectionState === 'Connecting' ? 'bg-yellow-500' :
          connectionState === 'Error' ? 'bg-red-500' : 'bg-gray-500'
        }`}></span>
        {connectionState} ({wsConnection?.readyState})
      </div>
      <div className="space-y-2 mb-2">
        <Button onClick={sendTestMessage} className="w-full" disabled={!isConnected}>
          Send Test Call Request (to user 999)
        </Button>
        <Button onClick={sendTestToSelf} className="w-full" disabled={!isConnected}>
          Send Test Call Request (to self)
        </Button>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {messages.map((msg, index) => (
          <pre key={index} className="text-xs bg-gray-100 p-2 mb-1 rounded">
            {msg}
          </pre>
        ))}
      </div>
    </Card>
  );
}
