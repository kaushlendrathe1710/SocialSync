import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Eye,
  Calendar,
  User,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function PublicPostPage() {
  const [, params] = useRoute('/posts/:id');
  const postId = params?.id;

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['/api/posts/public', postId],
    queryFn: async () => {
      if (!postId) throw new Error('Post ID required');
      const response = await fetch(`/api/posts/${postId}/public`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Post not found');
        }
        throw new Error('Failed to load post');
      }
      return response.json();
    },
    enabled: !!postId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['/api/posts/public', postId, 'comments'],
    queryFn: async () => {
      if (!postId) return [];
      const response = await fetch(`/api/posts/${postId}/comments/public`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!postId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-64 w-full rounded-lg" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Post Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error?.message || 'The post you are looking for does not exist or has been removed.'}
          </p>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to SocialConnect
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                SocialConnect
              </Button>
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/auth">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth">
              <Button size="sm">
                Join SocialConnect
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            {/* User Info */}
            <div className="flex items-start space-x-4 mb-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={post.user?.avatar || ""} />
                <AvatarFallback>
                  <User className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900">
                    {post.user?.name || 'Anonymous User'}
                  </h3>
                  {post.user?.username && (
                    <span className="text-gray-500">@{post.user.username}</span>
                  )}
                </div>
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>

            {/* Post Content */}
            <div className="mb-4">
              <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                {post.content}
              </p>
            </div>

            {/* Post Image */}
            {post.imageUrl && (
              <div className="mb-4">
                <img 
                  src={post.imageUrl} 
                  alt="Post content"
                  className="w-full rounded-lg border border-gray-200"
                />
              </div>
            )}

            {/* Post Stats */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Heart className="w-4 h-4" />
                  <span>{post.likesCount || 0} likes</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{comments.length} comments</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>{post.viewsCount || 0} views</span>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        {comments.length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Comments ({comments.length})
              </h3>
              <div className="space-y-4">
                {comments.map((comment: any) => (
                  <div key={comment.id} className="flex space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={comment.user?.avatar || ""} />
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm">
                            {comment.user?.name || 'Anonymous User'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Call to Action */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-blue-900 mb-2">
              Join the conversation on SocialConnect
            </h3>
            <p className="text-blue-700 mb-4">
              Connect with friends, share your thoughts, and discover amazing content.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <Link href="/auth">
                <Button>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Sign Up Now
                </Button>
              </Link>
              <Link href="/auth">
                <Button variant="outline">
                  Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}