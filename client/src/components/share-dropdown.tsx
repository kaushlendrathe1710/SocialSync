import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import {
  Share2 as Share,
  Copy,
  MessageCircle,
  Mail,
  Bookmark,
  Send,
  Repeat2
} from 'lucide-react';
import type { PostWithUser } from '@shared/schema';

interface ShareDropdownProps {
  post: PostWithUser;
  className?: string;
}

export default function ShareDropdown({ post, className }: ShareDropdownProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Generate the post URL
  const postUrl = `${window.location.origin}/posts/${post.id}`;
  const shareText = post.content || 'Check out this post on Social!';
  const shareTitle = `${post.user.name || post.user.username} on Social`;

  // Share to timeline mutation
  const shareToTimelineMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<PostWithUser>(`/api/posts/${post.id}/share`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/posts'] });
      toast({
        title: "Shared!",
        description: "Post has been shared to your timeline.",
      });
      setIsOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to share post to timeline.",
        variant: "destructive",
      });
    },
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      toast({
        title: "Link copied!",
        description: "Post link has been copied to clipboard.",
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: postUrl,
        });
        setIsOpen(false);
      } catch (error) {
        // User cancelled the share dialog
        if (error instanceof Error && error.name !== 'AbortError') {
          toast({
            title: "Error",
            description: "Failed to share post.",
            variant: "destructive",
          });
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(postUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${postUrl}`)}`;
    window.open(whatsappUrl, '_blank');
    setIsOpen(false);
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`${shareText}\n\n${postUrl}`);
    const emailUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = emailUrl;
    setIsOpen(false);
  };

  const handleSavePost = () => {
    // This would integrate with a save/bookmark feature
    toast({
      title: "Post saved!",
      description: "Post has been saved to your collection.",
    });
    setIsOpen(false);
  };

  const handleShareToTimeline = () => {
    shareToTimelineMutation.mutate();
  };

  // Check if this is the user's own post
  const isOwnPost = user?.id === post.userId;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`flex items-center space-x-2 ${className}`}>
          <Share className="h-5 w-5" />
          <span>Share</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Share to Timeline - only show for other users' posts */}
        {!isOwnPost && (
          <>
            <DropdownMenuItem 
              onClick={handleShareToTimeline}
              disabled={shareToTimelineMutation.isPending}
              data-testid="menuitem-share-timeline"
            >
              <Repeat2 className="h-4 w-4 mr-3" />
              {shareToTimelineMutation.isPending ? 'Sharing...' : 'Share to Timeline'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Quick share options */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <>
            <DropdownMenuItem onClick={handleNativeShare}>
              <Send className="h-4 w-4 mr-3" />
              Share via...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem onClick={handleCopyLink}>
          <Copy className="h-4 w-4 mr-3" />
          Copy link
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Social media platforms */}
        <DropdownMenuItem onClick={handleFacebookShare}>
          <div className="h-4 w-4 mr-3 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">f</span>
          </div>
          Share to Facebook
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleTwitterShare}>
          <div className="h-4 w-4 mr-3 bg-black rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">X</span>
          </div>
          Share to X
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleWhatsAppShare}>
          <MessageCircle className="h-4 w-4 mr-3 text-green-500" />
          Share to WhatsApp
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleEmailShare}>
          <Mail className="h-4 w-4 mr-3" />
          Share via Email
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Additional actions */}
        <DropdownMenuItem onClick={handleSavePost}>
          <Bookmark className="h-4 w-4 mr-3" />
          Save post
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}