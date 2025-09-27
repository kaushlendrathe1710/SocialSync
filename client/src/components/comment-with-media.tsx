import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Heart, Reply, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CommentReactionPicker from './comment-reaction-picker';

interface CommentWithMediaProps {
  comment: {
    id: number;
    content: string;
    imageUrl?: string | null;
    gifUrl?: string | null;
    mediaType?: string | null;
    user: {
      id: number;
      name: string;
      avatar?: string;
    };
    likesCount: number | null;
    repliesCount: number | null;
    createdAt: string | Date | null;
  };
  canEdit?: boolean;
  canDelete?: boolean;
  onUpdate?: (content: string) => void;
  onDelete?: () => void;
  onReact?: (reactionType: string) => void;
  onReply?: () => void;
  currentReaction?: string | null;
}

export default function CommentWithMedia({
  comment,
  canEdit = false,
  canDelete = false,
  onUpdate,
  onDelete,
  onReact,
  onReply,
  currentReaction
}: CommentWithMediaProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const handleUpdate = () => {
    if (onUpdate && editContent.trim()) {
      onUpdate(editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const formatTimeAgo = (dateString: string | Date | null) => {
    if (!dateString) return 'now';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex space-x-3 group">
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={comment.user.avatar || undefined} />
        <AvatarFallback>
          {comment.user.name?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-3 py-2 max-w-fit">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-sm">{comment.user.name}</span>
            <span className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</span>
          </div>

          {/* Comment Content */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 border rounded-lg resize-none"
                rows={3}
                autoFocus
                aria-label="Edit comment"
              />
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleUpdate}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {comment.content && (
                <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
              )}
              
              {/* Media Display */}
              {(comment.imageUrl || comment.gifUrl) && (
                <div className="mt-2">
                  <img
                    src={comment.imageUrl || comment.gifUrl}
                    alt="Comment media"
                    className="max-w-48 max-h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(comment.imageUrl || comment.gifUrl, '_blank')}
                  />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center space-x-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {onReact && (
                <CommentReactionPicker
                  onReaction={onReact}
                  currentReaction={currentReaction}
                >
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    <Heart className="w-3 h-3 mr-1" />
                    {(comment.likesCount || 0) > 0 && comment.likesCount}
                  </Button>
                </CommentReactionPicker>
              )}

              {onReply && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onReply}>
                  <Reply className="w-3 h-3 mr-1" />
                  Reply
                </Button>
              )}

              {(canEdit || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && onUpdate && (
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {canDelete && onDelete && (
                      <DropdownMenuItem onClick={onDelete} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
