import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import type { MessageWithUser } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function SimpleMessaging() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [showNew, setShowNew] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/conversations'],
    queryFn: async () => (await api.getConversations()).json() as Promise<MessageWithUser[]>,
    refetchInterval: 3000,
    refetchOnWindowFocus: false,
  });

  const threads = useMemo(() => {
    const map = new Map<number, MessageWithUser>();
    for (const m of conversations) {
      const otherId = m.senderId === user?.id ? m.receiverId : m.senderId;
      const prev = map.get(otherId);
      if (!prev || new Date(m.createdAt!).getTime() > new Date(prev.createdAt!).getTime()) {
        map.set(otherId, m);
      }
    }
    return Array.from(map.values()).sort((a,b)=> new Date(b.createdAt!).getTime()-new Date(a.createdAt!).getTime());
  }, [conversations, user?.id]);

  const { data: messages = [] } = useQuery({
    queryKey: ['/api/conversations', activeUserId],
    queryFn: async () => {
      if (!activeUserId) return [] as MessageWithUser[];
      const res = await api.getConversation(activeUserId);
      return res.json() as Promise<MessageWithUser[]>;
    },
    enabled: !!activeUserId,
    refetchInterval: 1500,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  const { data: friends = [], isLoading: friendsLoading } = useQuery({
    queryKey: ['/api/friends'],
    queryFn: async () => {
      const res = await fetch('/api/friends', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showNew,
  });

  useEffect(() => {
    // auto-scroll
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, activeUserId]);

  const send = useMutation({
    mutationFn: async () => {
      if (!activeUserId || !text.trim()) return;
      const res = await api.sendMessage(activeUserId, text.trim());
      await res.json();
    },
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', activeUserId] });
    }
  });

  return (
    <div className="max-w-7xl mx-auto p-4">
      <Card className="h-[calc(100vh-140px)] overflow-hidden">
        <div className="h-full flex">
          {/* Sidebar */}
          <div className="w-72 border-r overflow-y-auto">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="font-semibold">Messages</div>
              <Button size="sm" onClick={() => setShowNew(true)}>Start</Button>
            </div>
            {threads.map((m) => {
              const other = m.senderId === user?.id ? m.receiver : m.sender;
              const isActive = activeUserId === other.id;
              return (
                <button
                  key={`${m.senderId}-${m.receiverId}`}
                  onClick={() => setActiveUserId(other.id)}
                  className={`w-full flex items-center gap-3 p-3 text-left hover:bg-muted ${isActive ? 'bg-muted' : ''}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={other.avatar || undefined} />
                    <AvatarFallback>{other.name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{other.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.senderId === user?.id ? 'You: ' : ''}{m.content}</div>
                  </div>
                </button>
              );
            })}
          </div>
          {/* Chat */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-3 border-b font-semibold">{activeUserId ? 'Conversation' : 'Select a conversation'}</div>
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((msg) => {
                const isMine = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xl px-3 py-2 rounded-2xl ${isMine ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                      <div className="whitespace-pre-wrap break-words break-all text-sm">{msg.content}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); send.mutate(); }}
              className="p-3 border-t flex gap-2"
            >
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" className="flex-1" />
              <Button type="submit" disabled={!activeUserId || send.isPending}>Send</Button>
            </form>
          </div>
        </div>
      </Card>

      {/* Start new conversation */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Start a new conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {friendsLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </div>
            ) : friends.length === 0 ? (
              <p className="text-sm text-muted-foreground">No friends yet.</p>
            ) : (
              <div className="max-h-80 overflow-auto divide-y">
                {friends.map((f: any) => (
                  <button
                    key={f.id}
                    onClick={() => { setActiveUserId(f.id); setShowNew(false); }}
                    className="w-full text-left p-3 hover:bg-muted flex items-center gap-3"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={f.avatar || undefined} />
                      <AvatarFallback>{f.name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{f.name}</div>
                      <div className="text-xs text-muted-foreground truncate">@{f.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


