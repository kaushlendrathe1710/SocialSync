import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff } from 'lucide-react';
import { User } from '@shared/schema';

interface IncomingCallNotificationProps {
  from: User;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallNotification({ 
  from, 
  onAccept, 
  onReject 
}: IncomingCallNotificationProps) {
  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <Card className="w-80 p-4 bg-white dark:bg-gray-900 shadow-lg border-2 border-blue-500">
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={from.avatar || undefined} />
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              {from.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{from.name}</h3>
            <p className="text-sm text-muted-foreground">Incoming video call</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={onAccept}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Phone className="w-4 h-4 mr-2" />
            Accept
          </Button>
          <Button
            onClick={onReject}
            variant="destructive"
            className="flex-1"
          >
            <PhoneOff className="w-4 h-4 mr-2" />
            Reject
          </Button>
        </div>
      </Card>
    </div>
  );
}
