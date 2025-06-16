import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Share, MoreHorizontal, Edit3, Trash2, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import type { PostWithUser, CommentWithUser } from "@shared/schema";

interface EnhancedPostCardProps {
  post: PostWithUser;
}

interface CommentItemProps {
  comment: CommentWithUser;
  postId: number;
  level?: number;
  onReply?: (commentId: number) => void;
}

function CommentItem({ comment, postId, level = 0, onReply }: CommentItemProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(false);

  const { data: replies } = useQuery({
    queryKey: ['/api/comments', comment.id, 'replies'],
    enabled: showReplies && level < 2, // Limit nesting to 2 levels
  });

  const likeMutation = useMutation({
    mutationFn: () => apiRequest(`/api/comments/${comment.id}/like`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', postId, 'comments'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (content: string) => apiRequest(`/api/comments/${comment.id}`, {
      method: 'PUT',
      body: { content },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', postId, 'comments'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/comments/${comment.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', postId, 'comments'] });
    },
  });

  const handleUpdate = () => {
    if (editContent.trim()) {
      updateMutation.mutate(editContent.trim());
    }
  };

  return (
    <div className={`${level > 0 ? 'ml-8 mt-2' : 'mt-4'}`}>
      <div className="flex space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.user.avatar || undefined} />
          <AvatarFallback>
            {comment.user.username?.charAt(0).toUpperCase() || comment.user.email.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">
                  {comment.user.username || comment.user.email}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(comment.createdAt!), { addSuffix: true })}
                </span>
              </div>
              
              {user?.id === comment.userId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit3 className="h-3 w-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => deleteMutation.mutate()}
                      className="text-red-600"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px] text-sm"
                />
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleUpdate} disabled={updateMutation.isPending}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-1">{comment.content}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-4 mt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => likeMutation.mutate()}
              disabled={likeMutation.isPending}
            >
              <Heart className={`h-3 w-3 mr-1 ${comment.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              {comment.likesCount || 0}
            </Button>
            
            {level < 2 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => onReply?.(comment.id)}
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}
            
            {comment.repliesCount > 0 && level < 2 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? 'Hide' : 'Show'} {comment.repliesCount} replies
              </Button>
            )}
          </div>
          
          {showReplies && replies && (
            <div className="mt-2">
              {replies.map((reply: CommentWithUser) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  level={level + 1}
                  onReply={onReply}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EnhancedPostCard({ post }: EnhancedPostCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyToComment, setReplyToComment] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");

  const { data: comments } = useQuery({
    queryKey: ['/api/posts', post.id, 'comments'],
    enabled: showComments,
  });

  const likeMutation = useMutation({
    mutationFn: () => apiRequest(`/api/posts/${post.id}/like`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (data: { content: string; parentCommentId?: number }) =>
      apiRequest(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', post.id, 'comments'] });
      setNewComment("");
      setReplyToComment(null);
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: (content: string) => apiRequest(`/api/posts/${post.id}`, {
      method: 'PUT',
      body: { content },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      setIsEditing(false);
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: () => apiRequest(`/api/posts/${post.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    },
  });

  const handleComment = () => {
    if (newComment.trim()) {
      commentMutation.mutate({
        content: newComment.trim(),
        parentCommentId: replyToComment || undefined,
      });
    }
  };

  const handleReply = (commentId: number) => {
    setReplyToComment(commentId);
    setShowComments(true);
  };

  const handleUpdatePost = () => {
    if (editContent.trim()) {
      updatePostMutation.mutate(editContent.trim());
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={post.user.profilePicture || undefined} />
              <AvatarFallback>
                {post.user.username?.charAt(0).toUpperCase() || post.user.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">
                {post.user.username || post.user.email}
              </h3>
              <p className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(post.createdAt!), { addSuffix: true })}
              </p>
            </div>
          </div>
          
          {user?.id === post.userId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Post
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => deletePostMutation.mutate()}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[100px]"
              placeholder="What's on your mind?"
            />
            <div className="flex space-x-2">
              <Button onClick={handleUpdatePost} disabled={updatePostMutation.isPending}>
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {post.content && (
              <p className="text-gray-900 dark:text-gray-100 leading-relaxed">
                {post.content}
              </p>
            )}

            {post.imageUrl && (
              <div className="rounded-lg overflow-hidden">
                <img
                  src={post.imageUrl}
                  alt="Post content"
                  className="w-full h-auto object-cover"
                />
              </div>
            )}

            {post.videoUrl && (
              <div className="rounded-lg overflow-hidden">
                <video
                  src={post.videoUrl}
                  controls
                  className="w-full h-auto"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
          </>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => likeMutation.mutate()}
              disabled={likeMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Heart className={`h-5 w-5 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              <span>{post.likesCount || 0}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-2"
            >
              <MessageCircle className="h-5 w-5" />
              <span>{post.commentsCount || 0}</span>
            </Button>

            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
              <Share className="h-5 w-5" />
              <span>Share</span>
            </Button>
          </div>
        </div>

        {showComments && (
          <div className="space-y-4">
            <Separator />
            
            <div className="flex space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profilePicture || undefined} />
                <AvatarFallback>
                  {user?.username?.charAt(0).toUpperCase() || user?.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                {replyToComment && (
                  <Badge variant="secondary" className="text-xs">
                    Replying to comment
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-2"
                      onClick={() => setReplyToComment(null)}
                    >
                      ×
                    </Button>
                  </Badge>
                )}
                <Textarea
                  placeholder={replyToComment ? "Write a reply..." : "Write a comment..."}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[60px]"
                />
                <Button
                  onClick={handleComment}
                  disabled={!newComment.trim() || commentMutation.isPending}
                  size="sm"
                >
                  {replyToComment ? 'Reply' : 'Comment'}
                </Button>
              </div>
            </div>

            {comments && comments.length > 0 && (
              <div className="space-y-2">
                {comments.map((comment: CommentWithUser) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    postId={post.id}
                    onReply={handleReply}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}