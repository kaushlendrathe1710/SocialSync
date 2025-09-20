import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Event {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startDate: string;
  maxAttendees: number | null;
  creatorId: number;
}

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
}

export default function EditEventModal({ isOpen, onClose, event }: EditEventModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    maxAttendees: ''
  });

  // Populate form when event changes
  useEffect(() => {
    if (event) {
      const eventDate = new Date(event.startDate);
      const date = eventDate.toISOString().split('T')[0];
      const time = eventDate.toTimeString().slice(0, 5);
      
      setEventData({
        title: event.title,
        description: event.description || '',
        date,
        time,
        location: event.location || '',
        maxAttendees: event.maxAttendees ? event.maxAttendees.toString() : ''
      });
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!event) return;
    
    if (!eventData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter an event title",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: eventData.title,
          description: eventData.description,
          date: eventData.date,
          time: eventData.time,
          location: eventData.location,
          maxAttendees: eventData.maxAttendees ? parseInt(eventData.maxAttendees) : null
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Event updated successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        onClose();
      } else {
        throw new Error('Failed to update event');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={eventData.title}
              onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
              placeholder="Enter event title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={eventData.description}
              onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
              placeholder="Describe your event"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={eventData.date}
                onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={eventData.time}
                onChange={(e) => setEventData({ ...eventData, time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={eventData.location}
              onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
              placeholder="Event location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxAttendees">Max Attendees</Label>
            <Input
              id="maxAttendees"
              type="number"
              value={eventData.maxAttendees}
              onChange={(e) => setEventData({ ...eventData, maxAttendees: e.target.value })}
              placeholder="Leave empty for unlimited"
              min="1"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Update Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
