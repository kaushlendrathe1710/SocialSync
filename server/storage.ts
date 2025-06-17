import {
  users,
  otpCodes,
  posts,
  likes,
  comments,
  commentLikes,
  follows,
  stories,
  messages,
  notifications,
  type User,
  type InsertUser,
  type OtpCode,
  type InsertOtpCode,
  type Post,
  type InsertPost,
  type Like,
  type InsertLike,
  type Comment,
  type InsertComment,
  type CommentLike,
  type InsertCommentLike,
  type Follow,
  type InsertFollow,
  type Story,
  type InsertStory,
  type Message,
  type InsertMessage,
  type Notification,
  type InsertNotification,
  type PostWithUser,
  type MessageWithUser,
  type NotificationWithUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, like, or, gt, isNull, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;

  // OTP methods
  createOtpCode(otp: InsertOtpCode): Promise<OtpCode>;
  getValidOtpCode(email: string, code: string): Promise<OtpCode | undefined>;
  markOtpCodeUsed(id: number): Promise<void>;

  // Post methods
  createPost(post: InsertPost): Promise<Post>;
  getPost(id: number): Promise<PostWithUser | undefined>;
  getPosts(userId?: number, limit?: number, offset?: number): Promise<PostWithUser[]>;
  updatePost(id: number, updates: Partial<InsertPost>): Promise<Post | undefined>;
  deletePost(id: number): Promise<boolean>;

  // Like methods
  createLike(like: InsertLike): Promise<Like>;
  deleteLike(userId: number, postId: number): Promise<boolean>;
  getUserLikes(userId: number): Promise<Like[]>;

  // Comment methods
  createComment(comment: InsertComment): Promise<Comment>;
  getPostComments(postId: number): Promise<(Comment & { user: User })[]>;
  getCommentReplies(commentId: number): Promise<(Comment & { user: User })[]>;
  deleteComment(id: number): Promise<boolean>;
  updateComment(id: number, content: string): Promise<Comment | undefined>;

  // Comment like methods
  createCommentLike(commentLike: InsertCommentLike): Promise<CommentLike>;
  deleteCommentLike(userId: number, commentId: number): Promise<boolean>;
  getCommentLikes(commentId: number): Promise<CommentLike[]>;

  // Follow methods
  createFollow(follow: InsertFollow): Promise<Follow>;
  deleteFollow(followerId: number, followingId: number): Promise<boolean>;
  getFollowers(userId: number): Promise<User[]>;
  getFollowing(userId: number): Promise<User[]>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;

  // Story methods
  createStory(story: InsertStory): Promise<Story>;
  getActiveStories(userId?: number): Promise<(Story & { user: User })[]>;
  deleteStory(id: number): Promise<boolean>;

  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getConversation(userId1: number, userId2: number): Promise<MessageWithUser[]>;
  getConversations(userId: number): Promise<MessageWithUser[]>;
  markMessageRead(id: number): Promise<void>;

  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<NotificationWithUser[]>;
  markNotificationRead(id: number): Promise<void>;
  markAllNotificationsRead(userId: number): Promise<void>;

  // Search methods
  searchUsers(query: string): Promise<User[]>;
  searchPosts(query: string): Promise<PostWithUser[]>;

  // Admin methods
  getTotalUsers(): Promise<number>;
  getTotalPosts(): Promise<number>;
  getTotalComments(): Promise<number>;
  getActiveUsersToday(): Promise<number>;
  getAllUsersAdmin(page: number, limit: number, search?: string): Promise<User[]>;
  getAllPostsAdmin(page: number, limit: number): Promise<PostWithUser[]>;
  deleteUserAdmin(userId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  // OTP methods
  async createOtpCode(insertOtp: InsertOtpCode): Promise<OtpCode> {
    const [otp] = await db.insert(otpCodes).values(insertOtp).returning();
    return otp;
  }

  async getValidOtpCode(email: string, code: string): Promise<OtpCode | undefined> {
    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email),
          eq(otpCodes.code, code),
          eq(otpCodes.used, false),
          gt(otpCodes.expiresAt, new Date())
        )
      );
    return otp;
  }

  async markOtpCodeUsed(id: number): Promise<void> {
    await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, id));
  }

  // Post methods
  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values(insertPost).returning();
    return post;
  }

  async getPost(id: number): Promise<PostWithUser | undefined> {
    const result = await db
      .select({
        post: posts,
        user: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.id, id));

    if (result.length === 0) return undefined;

    const { post, user } = result[0];
    
    // Get like count
    const likesResult = await db.select({ count: sql<number>`count(*)` }).from(likes).where(eq(likes.postId, id));
    const likesCount = likesResult[0]?.count || 0;
    
    // Get comment count
    const commentsResult = await db.select({ count: sql<number>`count(*)` }).from(comments).where(eq(comments.postId, id));
    const commentsCount = commentsResult[0]?.count || 0;
    
    return { ...post, user, likesCount, commentsCount };
  }

  async getPosts(userId?: number, limit = 20, offset = 0): Promise<PostWithUser[]> {
    let query = db
      .select({
        post: posts,
        user: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    if (userId) {
      query = query.where(eq(posts.userId, userId));
    }

    const result = await query;
    
    // Get interaction counts for each post
    const enrichedPosts = await Promise.all(
      result.map(async ({ post, user }) => {
        const likesResult = await db.select({ count: sql<number>`count(*)` }).from(likes).where(eq(likes.postId, post.id));
        const commentsResult = await db.select({ count: sql<number>`count(*)` }).from(comments).where(eq(comments.postId, post.id));
        
        return {
          ...post,
          user,
          likesCount: likesResult[0]?.count || 0,
          commentsCount: commentsResult[0]?.count || 0
        };
      })
    );
    
    return enrichedPosts;
  }

  async updatePost(id: number, updates: Partial<InsertPost>): Promise<Post | undefined> {
    const [post] = await db.update(posts).set(updates).where(eq(posts.id, id)).returning();
    return post;
  }

  async deletePost(id: number): Promise<boolean> {
    const result = await db.delete(posts).where(eq(posts.id, id));
    return result.rowCount! > 0;
  }

  // Like methods
  async createLike(insertLike: InsertLike): Promise<Like> {
    const [like] = await db.insert(likes).values(insertLike).returning();
    return like;
  }

  async deleteLike(userId: number, postId: number): Promise<boolean> {
    const result = await db
      .delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    return result.rowCount! > 0;
  }

  async getUserLikes(userId: number): Promise<Like[]> {
    return await db.select().from(likes).where(eq(likes.userId, userId));
  }

  // Comment methods
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(insertComment).returning();
    return comment;
  }

  async getPostComments(postId: number): Promise<(Comment & { user: User })[]> {
    const result = await db
      .select({
        comment: comments,
        user: users,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(and(eq(comments.postId, postId), isNull(comments.parentCommentId)))
      .orderBy(asc(comments.createdAt));

    return result.map(({ comment, user }) => ({ ...comment, user }));
  }

  async getCommentReplies(commentId: number): Promise<(Comment & { user: User })[]> {
    const result = await db
      .select({
        comment: comments,
        user: users,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.parentCommentId, commentId))
      .orderBy(asc(comments.createdAt));

    return result.map(({ comment, user }) => ({ ...comment, user }));
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await db.delete(comments).where(eq(comments.id, id));
    return result.rowCount! > 0;
  }

  async updateComment(id: number, content: string): Promise<Comment | undefined> {
    const [updated] = await db
      .update(comments)
      .set({ content })
      .where(eq(comments.id, id))
      .returning();
    return updated;
  }

  async createCommentLike(insertCommentLike: InsertCommentLike): Promise<CommentLike> {
    const [commentLike] = await db
      .insert(commentLikes)
      .values(insertCommentLike)
      .returning();

    // Increment likes count
    await db
      .update(comments)
      .set({ likesCount: sql`${comments.likesCount} + 1` })
      .where(eq(comments.id, insertCommentLike.commentId));

    return commentLike;
  }

  async deleteCommentLike(userId: number, commentId: number): Promise<boolean> {
    const result = await db
      .delete(commentLikes)
      .where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)));

    if (result.rowCount! > 0) {
      // Decrement likes count
      await db
        .update(comments)
        .set({ likesCount: sql`${comments.likesCount} - 1` })
        .where(eq(comments.id, commentId));
      return true;
    }
    return false;
  }

  async getCommentLikes(commentId: number): Promise<CommentLike[]> {
    return await db
      .select()
      .from(commentLikes)
      .where(eq(commentLikes.commentId, commentId));
  }

  // Follow methods
  async createFollow(insertFollow: InsertFollow): Promise<Follow> {
    const [follow] = await db.insert(follows).values(insertFollow).returning();
    return follow;
  }

  async deleteFollow(followerId: number, followingId: number): Promise<boolean> {
    const result = await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      );
    return result.rowCount! > 0;
  }

  async getFollowers(userId: number): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));

    return result.map(({ user }) => user);
  }

  async getFollowing(userId: number): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));

    return result.map(({ user }) => user);
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const [result] = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      );
    return !!result;
  }

  // Story methods
  async createStory(insertStory: InsertStory): Promise<Story> {
    const [story] = await db.insert(stories).values(insertStory).returning();
    return story;
  }

  async getActiveStories(userId?: number): Promise<(Story & { user: User })[]> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    let query = db
      .select({
        story: stories,
        user: users,
      })
      .from(stories)
      .innerJoin(users, eq(stories.userId, users.id))
      .where(gt(stories.expiresAt, twentyFourHoursAgo))
      .orderBy(desc(stories.createdAt));

    if (userId) {
      query = query.where(eq(stories.userId, userId));
    }

    const result = await query;
    return result.map(({ story, user }) => ({ ...story, user }));
  }

  async deleteStory(id: number): Promise<boolean> {
    const result = await db.delete(stories).where(eq(stories.id, id));
    return result.rowCount! > 0;
  }

  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getConversation(userId1: number, userId2: number): Promise<MessageWithUser[]> {
    const result = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
        )
      )
      .orderBy(asc(messages.createdAt));

    // Get receiver data for each message
    const messagesWithUsers: MessageWithUser[] = [];
    for (const { message, sender } of result) {
      const [receiver] = await db
        .select()
        .from(users)
        .where(eq(users.id, message.receiverId));
      
      messagesWithUsers.push({
        ...message,
        sender,
        receiver,
      });
    }

    return messagesWithUsers;
  }

  async getConversations(userId: number): Promise<MessageWithUser[]> {
    const result = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));

    // Get receiver data and deduplicate conversations
    const conversationMap = new Map<number, MessageWithUser>();
    
    for (const { message, sender } of result) {
      const [receiver] = await db
        .select()
        .from(users)
        .where(eq(users.id, message.receiverId));
      
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          ...message,
          sender,
          receiver,
        });
      }
    }

    return Array.from(conversationMap.values());
  }

  async markMessageRead(id: number): Promise<void> {
    await db.update(messages).set({ readAt: new Date() }).where(eq(messages.id, id));
  }

  // Notification methods
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async getUserNotifications(userId: number): Promise<NotificationWithUser[]> {
    const result = await db
      .select({
        notification: notifications,
        fromUser: users,
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.fromUserId, users.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    // Get post data where applicable
    const notificationsWithData: NotificationWithUser[] = [];
    for (const { notification, fromUser } of result) {
      let post = undefined;
      if (notification.postId) {
        const [postResult] = await db
          .select()
          .from(posts)
          .where(eq(posts.id, notification.postId));
        post = postResult;
      }

      notificationsWithData.push({
        ...notification,
        fromUser,
        post,
      });
    }

    return notificationsWithData;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // Search methods
  async searchUsers(query: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        or(
          like(users.name, `%${query}%`),
          like(users.username, `%${query}%`)
        )
      )
      .limit(20);
  }

  async searchPosts(query: string): Promise<PostWithUser[]> {
    const result = await db
      .select({
        post: posts,
        user: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(like(posts.content, `%${query}%`))
      .orderBy(desc(posts.createdAt))
      .limit(20);

    return result.map(({ post, user }) => ({ ...post, user }));
  }

  // Admin methods
  async getTotalUsers(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return result[0].count;
  }

  async getTotalPosts(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(posts);
    return result[0].count;
  }

  async getTotalComments(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(comments);
    return result[0].count;
  }

  async getActiveUsersToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await db
      .select({ count: sql<number>`count(distinct ${users.id})` })
      .from(users)
      .leftJoin(posts, eq(posts.userId, users.id))
      .leftJoin(comments, eq(comments.userId, users.id))
      .where(
        or(
          gt(posts.createdAt, today),
          gt(comments.createdAt, today)
        )
      );
    
    return result[0].count || 0;
  }

  async getAllUsersAdmin(page: number, limit: number, search?: string): Promise<User[]> {
    const offset = (page - 1) * limit;
    let query = db.select().from(users);

    if (search) {
      query = query.where(
        or(
          like(users.email, `%${search}%`),
          like(users.username, `%${search}%`),
          like(users.name, `%${search}%`)
        )
      );
    }

    return await query
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getAllPostsAdmin(page: number, limit: number): Promise<PostWithUser[]> {
    const offset = (page - 1) * limit;
    
    const result = await db
      .select({
        post: posts,
        user: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    return result.map(({ post, user }) => ({ ...post, user }));
  }

  async deleteUserAdmin(userId: number): Promise<boolean> {
    // Delete user and all related data
    await db.delete(notifications).where(eq(notifications.userId, userId));
    await db.delete(notifications).where(eq(notifications.fromUserId, userId));
    await db.delete(messages).where(eq(messages.senderId, userId));
    await db.delete(messages).where(eq(messages.receiverId, userId));
    await db.delete(follows).where(eq(follows.followerId, userId));
    await db.delete(follows).where(eq(follows.followingId, userId));
    await db.delete(stories).where(eq(stories.userId, userId));
    await db.delete(commentLikes).where(eq(commentLikes.userId, userId));
    await db.delete(comments).where(eq(comments.userId, userId));
    await db.delete(likes).where(eq(likes.userId, userId));
    await db.delete(posts).where(eq(posts.userId, userId));
    
    const result = await db.delete(users).where(eq(users.id, userId));
    return result.rowCount! > 0;
  }
}

export const storage = new DatabaseStorage();