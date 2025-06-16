import {
  users,
  otpCodes,
  posts,
  likes,
  comments,
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
  deleteComment(id: number): Promise<boolean>;

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private otpCodes: Map<number, OtpCode> = new Map();
  private posts: Map<number, Post> = new Map();
  private likes: Map<number, Like> = new Map();
  private comments: Map<number, Comment> = new Map();
  private follows: Map<number, Follow> = new Map();
  private stories: Map<number, Story> = new Map();
  private messages: Map<number, Message> = new Map();
  private notifications: Map<number, Notification> = new Map();

  private currentId = 1;

  private getNextId(): number {
    return this.currentId++;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.getNextId();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // OTP methods
  async createOtpCode(insertOtp: InsertOtpCode): Promise<OtpCode> {
    const id = this.getNextId();
    const otp: OtpCode = {
      ...insertOtp,
      id,
      createdAt: new Date(),
    };
    this.otpCodes.set(id, otp);
    return otp;
  }

  async getValidOtpCode(email: string, code: string): Promise<OtpCode | undefined> {
    const now = new Date();
    return Array.from(this.otpCodes.values()).find(
      otp => otp.email === email && 
             otp.code === code && 
             !otp.used && 
             otp.expiresAt > now
    );
  }

  async markOtpCodeUsed(id: number): Promise<void> {
    const otp = this.otpCodes.get(id);
    if (otp) {
      this.otpCodes.set(id, { ...otp, used: true });
    }
  }

  // Post methods
  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = this.getNextId();
    const post: Post = {
      ...insertPost,
      id,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      createdAt: new Date(),
    };
    this.posts.set(id, post);
    return post;
  }

  async getPost(id: number): Promise<PostWithUser | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;

    const user = this.users.get(post.userId);
    if (!user) return undefined;

    return { ...post, user };
  }

  async getPosts(userId?: number, limit = 20, offset = 0): Promise<PostWithUser[]> {
    let postsArray = Array.from(this.posts.values());
    
    if (userId) {
      postsArray = postsArray.filter(post => post.userId === userId);
    }

    postsArray.sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
    
    const paginatedPosts = postsArray.slice(offset, offset + limit);
    
    return paginatedPosts.map(post => {
      const user = this.users.get(post.userId)!;
      return { ...post, user };
    });
  }

  async updatePost(id: number, updates: Partial<InsertPost>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;

    const updatedPost = { ...post, ...updates };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async deletePost(id: number): Promise<boolean> {
    return this.posts.delete(id);
  }

  // Like methods
  async createLike(insertLike: InsertLike): Promise<Like> {
    const id = this.getNextId();
    const like: Like = {
      ...insertLike,
      id,
      createdAt: new Date(),
    };
    this.likes.set(id, like);

    // Update post likes count
    const post = this.posts.get(insertLike.postId);
    if (post) {
      this.posts.set(insertLike.postId, {
        ...post,
        likesCount: (post.likesCount || 0) + 1,
      });
    }

    return like;
  }

  async deleteLike(userId: number, postId: number): Promise<boolean> {
    const like = Array.from(this.likes.values()).find(
      l => l.userId === userId && l.postId === postId
    );
    
    if (!like) return false;

    this.likes.delete(like.id);

    // Update post likes count
    const post = this.posts.get(postId);
    if (post) {
      this.posts.set(postId, {
        ...post,
        likesCount: Math.max((post.likesCount || 0) - 1, 0),
      });
    }

    return true;
  }

  async getUserLikes(userId: number): Promise<Like[]> {
    return Array.from(this.likes.values()).filter(like => like.userId === userId);
  }

  // Comment methods
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.getNextId();
    const comment: Comment = {
      ...insertComment,
      id,
      createdAt: new Date(),
    };
    this.comments.set(id, comment);

    // Update post comments count
    const post = this.posts.get(insertComment.postId);
    if (post) {
      this.posts.set(insertComment.postId, {
        ...post,
        commentsCount: (post.commentsCount || 0) + 1,
      });
    }

    return comment;
  }

  async getPostComments(postId: number): Promise<(Comment & { user: User })[]> {
    const postComments = Array.from(this.comments.values())
      .filter(comment => comment.postId === postId)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());

    return postComments.map(comment => {
      const user = this.users.get(comment.userId)!;
      return { ...comment, user };
    });
  }

  async deleteComment(id: number): Promise<boolean> {
    const comment = this.comments.get(id);
    if (!comment) return false;

    this.comments.delete(id);

    // Update post comments count
    const post = this.posts.get(comment.postId);
    if (post) {
      this.posts.set(comment.postId, {
        ...post,
        commentsCount: Math.max((post.commentsCount || 0) - 1, 0),
      });
    }

    return true;
  }

  // Follow methods
  async createFollow(insertFollow: InsertFollow): Promise<Follow> {
    const id = this.getNextId();
    const follow: Follow = {
      ...insertFollow,
      id,
      createdAt: new Date(),
    };
    this.follows.set(id, follow);
    return follow;
  }

  async deleteFollow(followerId: number, followingId: number): Promise<boolean> {
    const follow = Array.from(this.follows.values()).find(
      f => f.followerId === followerId && f.followingId === followingId
    );
    
    if (!follow) return false;
    return this.follows.delete(follow.id);
  }

  async getFollowers(userId: number): Promise<User[]> {
    const followerIds = Array.from(this.follows.values())
      .filter(follow => follow.followingId === userId)
      .map(follow => follow.followerId);

    return followerIds.map(id => this.users.get(id)!).filter(Boolean);
  }

  async getFollowing(userId: number): Promise<User[]> {
    const followingIds = Array.from(this.follows.values())
      .filter(follow => follow.followerId === userId)
      .map(follow => follow.followingId);

    return followingIds.map(id => this.users.get(id)!).filter(Boolean);
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    return Array.from(this.follows.values()).some(
      follow => follow.followerId === followerId && follow.followingId === followingId
    );
  }

  // Story methods
  async createStory(insertStory: InsertStory): Promise<Story> {
    const id = this.getNextId();
    const story: Story = {
      ...insertStory,
      id,
      createdAt: new Date(),
    };
    this.stories.set(id, story);
    return story;
  }

  async getActiveStories(userId?: number): Promise<(Story & { user: User })[]> {
    const now = new Date();
    let activeStories = Array.from(this.stories.values())
      .filter(story => story.expiresAt > now);

    if (userId) {
      activeStories = activeStories.filter(story => story.userId === userId);
    }

    return activeStories.map(story => {
      const user = this.users.get(story.userId)!;
      return { ...story, user };
    });
  }

  async deleteStory(id: number): Promise<boolean> {
    return this.stories.delete(id);
  }

  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.getNextId();
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getConversation(userId1: number, userId2: number): Promise<MessageWithUser[]> {
    const conversationMessages = Array.from(this.messages.values())
      .filter(message => 
        (message.senderId === userId1 && message.receiverId === userId2) ||
        (message.senderId === userId2 && message.receiverId === userId1)
      )
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());

    return conversationMessages.map(message => {
      const sender = this.users.get(message.senderId)!;
      const receiver = this.users.get(message.receiverId)!;
      return { ...message, sender, receiver };
    });
  }

  async getConversations(userId: number): Promise<MessageWithUser[]> {
    const userMessages = Array.from(this.messages.values())
      .filter(message => message.senderId === userId || message.receiverId === userId);

    // Get the latest message for each conversation
    const conversations = new Map<number, Message>();
    
    userMessages.forEach(message => {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      const existing = conversations.get(otherUserId);
      
      if (!existing || message.createdAt! > existing.createdAt!) {
        conversations.set(otherUserId, message);
      }
    });

    return Array.from(conversations.values())
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
      .map(message => {
        const sender = this.users.get(message.senderId)!;
        const receiver = this.users.get(message.receiverId)!;
        return { ...message, sender, receiver };
      });
  }

  async markMessageRead(id: number): Promise<void> {
    const message = this.messages.get(id);
    if (message) {
      this.messages.set(id, { ...message, readAt: new Date() });
    }
  }

  // Notification methods
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.getNextId();
    const notification: Notification = {
      ...insertNotification,
      id,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async getUserNotifications(userId: number): Promise<NotificationWithUser[]> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());

    return userNotifications.map(notification => {
      const fromUser = this.users.get(notification.fromUserId)!;
      const post = notification.postId ? this.posts.get(notification.postId) : undefined;
      return { ...notification, fromUser, post };
    });
  }

  async markNotificationRead(id: number): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      this.notifications.set(id, { ...notification, isRead: true });
    }
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    Array.from(this.notifications.entries()).forEach(([id, notification]) => {
      if (notification.userId === userId) {
        this.notifications.set(id, { ...notification, isRead: true });
      }
    });
  }

  // Search methods
  async searchUsers(query: string): Promise<User[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.users.values())
      .filter(user => 
        user.name.toLowerCase().includes(lowerQuery) ||
        user.username.toLowerCase().includes(lowerQuery) ||
        (user.bio && user.bio.toLowerCase().includes(lowerQuery))
      )
      .slice(0, 20);
  }

  async searchPosts(query: string): Promise<PostWithUser[]> {
    const lowerQuery = query.toLowerCase();
    const matchingPosts = Array.from(this.posts.values())
      .filter(post => 
        post.content && post.content.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
      .slice(0, 20);

    return matchingPosts.map(post => {
      const user = this.users.get(post.userId)!;
      return { ...post, user };
    });
  }
}

export const storage = new MemStorage();
