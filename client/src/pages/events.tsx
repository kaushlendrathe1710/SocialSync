import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Plus,
  User,
  CalendarDays,
  Edit,
  Trash2
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import CreateEventModal from "@/components/create-event-modal";
import EditEventModal from "@/components/edit-event-modal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface Event {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startDate: string;
  maxAttendees: number | null;
  currentAttendees: number;
  creatorId: number;
  createdAt: string;
  creator: {
    id: number;
    name: string;
    username: string;
    avatar: string | null;
  };
  attendeeStatus: string;
  attendeeCount: number;
}

export default function EventsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Event deleted successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      } else {
        throw new Error('Failed to delete event');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRSVP = async (eventId: number, status: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const statusText = status === 'going' ? 'joined' : status === 'interested' ? 'marked as interested' : 'marked as not going';
        toast({
          title: "Success",
          description: `You have ${statusText} this event`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      } else {
        throw new Error('Failed to RSVP');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to RSVP. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    if (isToday) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy \'at\' h:mm a');
    }
  };

  const getEventStatus = (startDate: string) => {
    const eventDate = new Date(startDate);
    const now = new Date();
    
    if (eventDate < now) {
      return { status: 'past', color: 'bg-gray-100 text-gray-800' };
    } else if (eventDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      return { status: 'upcoming', color: 'bg-orange-100 text-orange-800' };
    } else {
      return { status: 'future', color: 'bg-blue-100 text-blue-800' };
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-purple-500" />
          <div>
            <h1 className="text-3xl font-bold">Events</h1>
            <p className="text-gray-600">Discover and create events in your community</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <Card className="p-8 text-center">
          <CalendarDays className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">No Events Yet</h3>
          <p className="text-gray-600 mb-4">
            Be the first to create an event and bring your community together.
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Event
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6">
          {events.map((event: Event) => {
            const eventStatus = getEventStatus(event.startDate);
            
            return (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{event.title}</CardTitle>
                        <Badge className={eventStatus.color}>
                          {eventStatus.status}
                        </Badge>
                        {user && event.creatorId !== user.id && event.attendeeStatus !== 'none' && (
                          <Badge variant="secondary">
                            {event.attendeeStatus === 'going' ? 'Going' : 
                             event.attendeeStatus === 'interested' ? 'Interested' : 
                             event.attendeeStatus === 'not_going' ? 'Not Going' : ''}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatEventDate(event.startDate)}
                        </div>
                        
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {event.currentAttendees} attending
                          {event.maxAttendees && ` / ${event.maxAttendees} max`}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {event.description && (
                    <p className="text-gray-700">{event.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={event.creator.avatar || undefined} />
                        <AvatarFallback>
                          {event.creator.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <span className="text-gray-500">Created by </span>
                        <span className="font-medium">{event.creator.name}</span>
                        <span className="text-gray-500">
                          {' · ' + formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {user && event.creatorId === user.id && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingEvent(event)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                      {user && event.creatorId !== user.id && eventStatus.status !== 'past' && (
                        <>
                          {event.attendeeStatus === 'going' ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleRSVP(event.id, 'not_going')}
                            >
                              <User className="w-4 h-4 mr-1" />
                              Leave Event
                            </Button>
                          ) : event.attendeeStatus === 'interested' ? (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleRSVP(event.id, 'going')}
                              >
                                <User className="w-4 h-4 mr-1" />
                                Join Event
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleRSVP(event.id, 'not_going')}
                              >
                                Not Going
                              </Button>
                            </>
                          ) : event.attendeeStatus === 'not_going' ? (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleRSVP(event.id, 'going')}
                              >
                                <User className="w-4 h-4 mr-1" />
                                Join Event
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleRSVP(event.id, 'interested')}
                              >
                                Interested
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleRSVP(event.id, 'going')}
                              >
                                <User className="w-4 h-4 mr-1" />
                                Join Event
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleRSVP(event.id, 'interested')}
                              >
                                Interested
                              </Button>
                            </>
                          )}
                        </>
                      )}
                      {!user && eventStatus.status !== 'past' && (
                        <Button size="sm" disabled>
                          <User className="w-4 h-4 mr-1" />
                          Login to Join
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateEventModal 
        isOpen={showCreateModal} 
        onClose={() => {
          setShowCreateModal(false);
          queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        }} 
      />

      <EditEventModal 
        isOpen={!!editingEvent} 
        onClose={() => {
          setEditingEvent(null);
          queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        }}
        event={editingEvent}
      />
    </div>
  );
}