import {
  users,
  otpCodes,
  posts,
  likes,
  comments,
  commentLikes,
  commentReactions,
  follows,
  stories,
  messages,
  notifications,
  liveStreams,
  liveStreamChatMessages,
  postViews,
  friendRequests,
  friendships,
  privacySettings,
  blockedUsers,
  communityGroups,
  groupMemberships,
  groupPosts,
  groupEvents,
  groupFiles,
  groupMessages,
  wellnessTracking,
  habitTracking,
  habitLogs,
  beautyProducts,
  productReviews,
  wishlists,
  wishlistItems,
  shoppingPosts,
  events,
  eventAttendees,
  statusUpdates,
  savedPosts,
  mentorProfiles,
  mentorshipRequests,
  reels,
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
  type LiveStream,
  type InsertLiveStream,
  type LiveStreamChatMessage,
  type InsertLiveStreamChatMessage,
  type PostView,
  type InsertPostView,
  type FriendRequest,
  type InsertFriendRequest,
  type Friendship,
  type InsertFriendship,
  type PrivacySettings,
  type InsertPrivacySettings,
  type BlockedUser,
  type InsertBlockedUser,
  type CommunityGroup,
  type InsertCommunityGroup,
  type GroupMembership,
  type InsertGroupMembership,
  type GroupPost,
  type InsertGroupPost,
  type GroupEvent,
  type InsertGroupEvent,
  type GroupEventWithDetails,
  type GroupFile,
  type GroupMessage,
  type InsertGroupMessage,
  type WellnessTracking,
  type InsertWellnessTracking,
  type HabitTracking,
  type InsertHabitTracking,
  type HabitLog,
  type InsertHabitLog,
  type BeautyProduct,
  type InsertBeautyProduct,
  type ProductReview,
  type InsertProductReview,
  type Wishlist,
  type InsertWishlist,
  type WishlistItem,
  type InsertWishlistItem,
  type ShoppingPost,
  type InsertShoppingPost,
  type Event,
  type InsertEvent,
  type EventAttendee,
  type InsertEventAttendee,
  type MentorProfile,
  type InsertMentorProfile,
  type MentorshipRequest,
  type InsertMentorshipRequest,
  type PostWithUser,
  type MessageWithUser,
  type NotificationWithUser,
  type FriendRequestWithUser,
  type GroupWithDetails,
  type EventWithDetails,
  type WishlistWithItems,
  type ProductWithReviews,
  type MentorWithProfile,
  type Reel,
  type InsertReel,
} from "@shared/schema";
import { db } from "./db";
import {
  eq,
  and,
  desc,
  asc,
  like,
  or,
  gt,
  isNull,
  sql,
  inArray,
  ne,
  notInArray,
} from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(
    id: number,
    updates: Partial<InsertUser>
  ): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // OTP methods
  createOtpCode(otp: InsertOtpCode): Promise<OtpCode>;
  getValidOtpCode(email: string, code: string): Promise<OtpCode | undefined>;
  markOtpCodeUsed(id: number): Promise<void>;

  // Post methods
  createPost(post: InsertPost): Promise<Post>;
  getPost(
    id: number,
    currentUserId?: number,
    depth?: number
  ): Promise<PostWithUser | undefined>;
  getPosts(
    userId?: number,
    limit?: number,
    offset?: number,
    currentUserId?: number
  ): Promise<PostWithUser[]>;
  updatePost(
    id: number,
    updates: Partial<InsertPost>
  ): Promise<Post | undefined>;
  deletePost(id: number): Promise<boolean>;

  // Like methods
  createLike(like: InsertLike): Promise<Like>;
  deleteLike(userId: number, postId: number): Promise<boolean>;
  updateLike(
    userId: number,
    postId: number,
    reactionType: string
  ): Promise<Like | undefined>;
  getUserLikes(userId: number): Promise<Like[]>;
  getPostReactions(postId: number): Promise<(Like & { user: User })[]>;

  // Comment methods
  createComment(comment: InsertComment): Promise<Comment>;
  getPostComments(postId: number): Promise<(Comment & { user: User })[]>;
  getCommentReplies(commentId: number): Promise<(Comment & { user: User })[]>;
  deleteComment(id: number): Promise<boolean>;
  updateComment(id: number, content: string, imageUrl?: string, gifUrl?: string, mediaType?: string): Promise<Comment | undefined>;

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

  // Status update methods
  getStatusUpdates(userId?: number): Promise<any[]>;
  createStatusUpdate(data: any): Promise<any>;
  markStatusViewed(statusId: number, userId: number): Promise<void>;
  reactToStatus(
    statusId: number,
    userId: number,
    reaction: string
  ): Promise<any>;
  updateStatusUpdate(
    statusId: number,
    userId: number,
    updates: Partial<{
      content: string | null;
      backgroundColor: string | null;
      fontStyle: string | null;
      privacy: string;
      isHighlighted: boolean;
      highlightCategory: string | null;
      pollOptions: string[] | null;
      pollVotes: number[] | null;
      question: string | null;
      mediaUrl: string | null;
    }>
  ): Promise<any>;
  deleteStatusUpdate(statusId: number, userId: number): Promise<boolean>;
  voteOnStatusPoll(
    statusId: number,
    userId: number,
    optionIndex: number
  ): Promise<any>;

  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getConversation(userId1: number, userId2: number): Promise<MessageWithUser[]>;
  getConversations(userId: number): Promise<MessageWithUser[]>;
  markMessageRead(id: number): Promise<void>;
  markMessageAsRead(messageId: number, userId: number): Promise<void>;

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
  getAllUsersAdmin(
    page: number,
    limit: number,
    search?: string
  ): Promise<User[]>;
  getAllPostsAdmin(page: number, limit: number): Promise<PostWithUser[]>;
  deleteUserAdmin(userId: number): Promise<boolean>;

  // Live stream methods
  createLiveStream(liveStream: InsertLiveStream): Promise<LiveStream>;
  getActiveLiveStreams(): Promise<(LiveStream & { user: User })[]>;
  getLiveStreamById(streamId: number): Promise<(LiveStream & { user: User }) | null>;
  endLiveStream(streamId: number, userId: number): Promise<boolean>;

  // Live stream chat methods
  createLiveStreamChatMessage(message: InsertLiveStreamChatMessage): Promise<LiveStreamChatMessage>;
  getLiveStreamChatMessages(streamId: number, limit?: number, offset?: number): Promise<LiveStreamChatMessage[]>;

  // Post view methods
  recordPostView(postView: InsertPostView): Promise<PostView>;
  getPostViews(postId: number): Promise<number>;
  incrementPostViewCount(postId: number): Promise<void>;
  incrementPostShareCount(postId: number): Promise<void>;

  // Friend request methods
  sendFriendRequest(
    senderId: number,
    receiverId: number,
    message?: string
  ): Promise<FriendRequest>;
  respondToFriendRequest(
    requestId: number,
    action: "accept" | "decline"
  ): Promise<FriendRequest | undefined>;
  getFriendRequests(
    userId: number,
    type: "sent" | "received"
  ): Promise<FriendRequestWithUser[]>;
  getFriendRequestStatus(
    senderId: number,
    receiverId: number
  ): Promise<string | null>;
  deleteFriendRequest(requestId: number): Promise<boolean>;

  // Friendship methods
  createFriendship(user1Id: number, user2Id: number): Promise<Friendship>;
  deleteFriendship(user1Id: number, user2Id: number): Promise<boolean>;
  getFriends(userId: number): Promise<User[]>;
  getFriendSuggestions(userId: number, limit?: number): Promise<User[]>;
  areFriends(user1Id: number, user2Id: number): Promise<boolean>;
  getMutualFriends(user1Id: number, user2Id: number): Promise<User[]>;
  getMutualFollowers(userId: number): Promise<User[]>;
  toggleCloseFriend(userId: number, friendId: number): Promise<boolean>;

  // Privacy & Safety methods
  getPrivacySettings(userId: number): Promise<PrivacySettings | undefined>;
  updatePrivacySettings(
    userId: number,
    settings: Partial<InsertPrivacySettings>
  ): Promise<PrivacySettings>;
  blockUser(
    blockerId: number,
    blockedId: number,
    reason?: string
  ): Promise<BlockedUser>;
  unblockUser(blockerId: number, blockedId: number): Promise<boolean>;
  getBlockedUsers(userId: number): Promise<User[]>;
  isUserBlocked(blockerId: number, blockedId: number): Promise<boolean>;

  // Community methods
  createCommunityGroup(group: InsertCommunityGroup): Promise<CommunityGroup>;
  getCommunityGroups(
    category?: string,
    userId?: number
  ): Promise<GroupWithDetails[]>;
  getGroupById(groupId: number): Promise<GroupWithDetails | null>;
  getGroupMembership(
    groupId: number,
    userId: number
  ): Promise<GroupMembership | undefined>;
  joinGroup(groupId: number, userId: number): Promise<GroupMembership>;
  leaveGroup(groupId: number, userId: number): Promise<boolean>;
  getUserGroups(userId: number): Promise<CommunityGroup[]>;
  getGroupPosts(
    groupId: number,
    userId?: number
  ): Promise<(GroupPost & { user: User })[]>;
  createGroupPost(post: InsertGroupPost): Promise<GroupPost>;
  updateCommunityGroup(
    groupId: number,
    requesterId: number,
    updates: Partial<InsertCommunityGroup>
  ): Promise<CommunityGroup>;
  deleteCommunityGroup(
    groupId: number,
    requesterId: number
  ): Promise<boolean>;
  getGroupEvents(groupId: number): Promise<GroupEventWithDetails[]>;
  getGroupMembers(groupId: number): Promise<User[]>;
  createGroupEvent(data: InsertGroupEvent): Promise<GroupEvent>;
  updateGroupEvent(eventId: number, updates: Partial<InsertGroupEvent>): Promise<GroupEvent>;
  deleteGroupEvent(eventId: number): Promise<void>;

  // Wellness methods
  recordWellnessTracking(
    tracking: InsertWellnessTracking
  ): Promise<WellnessTracking>;
  getWellnessTracking(
    userId: number,
    days?: number
  ): Promise<WellnessTracking[]>;
  updateWellnessTracking(
    id: number,
    userId: number,
    updates: Partial<InsertWellnessTracking>
  ): Promise<WellnessTracking>;
  deleteWellnessTracking(id: number, userId: number): Promise<boolean>;
  getWellnessStats(userId: number, days?: number): Promise<{
    count: number;
    startDate: string;
    endDate: string;
    averages: {
      moodRating: number | null;
      energyLevel: number | null;
      stressLevel: number | null;
      sleepHours: number | null;
      waterIntake: number | null;
      exerciseMinutes: number | null;
    };
    streaks: {
      currentStreak: number;
      bestStreak: number;
    };
  }>;
  createHabit(habit: InsertHabitTracking): Promise<HabitTracking>;
  getUserHabits(userId: number): Promise<HabitTracking[]>;
  logHabit(log: InsertHabitLog): Promise<HabitLog>;
  getHabitLogs(habitId: number, days?: number): Promise<HabitLog[]>;
  getHabitLogsForDate(userId: number, date: string): Promise<HabitLog[]>;
  getHabitLogsForUser(userId: number, days?: number): Promise<HabitLog[]>;
  updateHabitStreak(habitId: number, streak: number): Promise<void>;

  // Beauty & Shopping methods
  createBeautyProduct(product: InsertBeautyProduct): Promise<BeautyProduct>;
  getBeautyProducts(
    category?: string,
    limit?: number
  ): Promise<BeautyProduct[]>;
  createProductReview(review: InsertProductReview): Promise<ProductReview>;
  getProductReviews(
    productId: number
  ): Promise<(ProductReview & { user: User })[]>;
  createWishlist(wishlist: InsertWishlist): Promise<Wishlist>;
  getUserWishlists(userId: number): Promise<WishlistWithItems[]>;
  addToWishlist(item: InsertWishlistItem): Promise<WishlistItem>;
  createShoppingPost(post: InsertShoppingPost): Promise<ShoppingPost>;
  getShoppingPosts(userId?: number): Promise<(ShoppingPost & { user: User })[]>;

  // Event methods
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(eventId: number, updates: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(eventId: number): Promise<void>;
  getEvents(userId?: number): Promise<EventWithDetails[]>;
  getEventsWithUserRSVP(currentUserId?: number): Promise<EventWithDetails[]>;
  respondToEvent(
    eventId: number,
    userId: number,
    status: string
  ): Promise<EventAttendee>;
  getUserEvents(
    userId: number,
    type: "created" | "attending"
  ): Promise<Event[]>;

  // Mentorship methods
  createMentorProfile(profile: InsertMentorProfile): Promise<MentorProfile>;
  getMentors(expertise?: string[]): Promise<MentorWithProfile[]>;
  requestMentorship(
    request: InsertMentorshipRequest
  ): Promise<MentorshipRequest>;
  getMentorshipRequests(
    userId: number,
    type: "sent" | "received"
  ): Promise<(MentorshipRequest & { mentor: MentorProfile; mentee: User })[]>;
}

export class DatabaseStorage implements IStorage {
  private reels: any[] = [];
  private inMemoryStatuses: any[] = [];

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(
    id: number,
    updates: Partial<InsertUser>
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // Delete all user-related data in proper order (respecting foreign key constraints)

      // Delete habit logs first
      await db.delete(habitLogs).where(eq(habitLogs.userId, id));

      // Delete habits
      await db.delete(habitTracking).where(eq(habitTracking.userId, id));

      // Delete wellness tracking
      await db.delete(wellnessTracking).where(eq(wellnessTracking.userId, id));

      // Delete wishlist items and wishlists
      const userWishlists = await db
        .select({ id: wishlists.id })
        .from(wishlists)
        .where(eq(wishlists.userId, id));
      for (const wishlist of userWishlists) {
        await db
          .delete(wishlistItems)
          .where(eq(wishlistItems.wishlistId, wishlist.id));
      }
      await db.delete(wishlists).where(eq(wishlists.userId, id));

      // Delete product reviews
      await db.delete(productReviews).where(eq(productReviews.userId, id));

      // Delete event attendees
      await db.delete(eventAttendees).where(eq(eventAttendees.userId, id));

      // Delete events created by user
      await db.delete(events).where(eq(events.creatorId, id));

      // Delete shopping posts
      await db.delete(shoppingPosts).where(eq(shoppingPosts.userId, id));

      // Delete group posts and memberships
      await db.delete(groupPosts).where(eq(groupPosts.userId, id));
      await db.delete(groupMemberships).where(eq(groupMemberships.userId, id));

      // Delete community groups created by user
      await db.delete(communityGroups).where(eq(communityGroups.creatorId, id));

      // Delete blocked users relationships
      await db
        .delete(blockedUsers)
        .where(
          or(eq(blockedUsers.blockerId, id), eq(blockedUsers.blockedId, id))
        );

      // Delete privacy settings
      await db.delete(privacySettings).where(eq(privacySettings.userId, id));

      // Delete friendships and friend requests
      await db
        .delete(friendships)
        .where(or(eq(friendships.user1Id, id), eq(friendships.user2Id, id)));
      await db
        .delete(friendRequests)
        .where(
          or(eq(friendRequests.senderId, id), eq(friendRequests.receiverId, id))
        );

      // Delete mentorship data
      await db
        .delete(mentorshipRequests)
        .where(
          or(
            eq(mentorshipRequests.menteeId, id),
            eq(mentorshipRequests.mentorId, id)
          )
        );
      await db.delete(mentorProfiles).where(eq(mentorProfiles.userId, id));

      // Delete post views
      await db.delete(postViews).where(eq(postViews.viewerId, id));

      // Delete live streams
      await db.delete(liveStreams).where(eq(liveStreams.userId, id));

      // Delete notifications
      await db
        .delete(notifications)
        .where(
          or(eq(notifications.userId, id), eq(notifications.fromUserId, id))
        );

      // Delete messages
      await db
        .delete(messages)
        .where(or(eq(messages.senderId, id), eq(messages.receiverId, id)));

      // Delete stories
      await db.delete(stories).where(eq(stories.userId, id));

      // Delete follows
      await db
        .delete(follows)
        .where(or(eq(follows.followerId, id), eq(follows.followingId, id)));

      // Delete comment likes
      await db.delete(commentLikes).where(eq(commentLikes.userId, id));

      // Delete comments
      await db.delete(comments).where(eq(comments.userId, id));

      // Delete likes
      await db.delete(likes).where(eq(likes.userId, id));

      // Delete posts
      await db.delete(posts).where(eq(posts.userId, id));

      // Delete OTP codes
      await db
        .delete(otpCodes)
        .where(eq(otpCodes.email, (await this.getUser(id))?.email || ""));

      // Finally delete the user
      const result = await db.delete(users).where(eq(users.id, id));

      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  // OTP methods
  async createOtpCode(insertOtp: InsertOtpCode): Promise<OtpCode> {
    const [otp] = await db.insert(otpCodes).values(insertOtp).returning();
    return otp;
  }

  async getValidOtpCode(
    email: string,
    code: string
  ): Promise<OtpCode | undefined> {
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

  async getPost(
    id: number,
    currentUserId?: number,
    depth: number = 1
  ): Promise<PostWithUser | undefined> {
    const result = await db
      .select({
        post: posts,
        user: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(
        and(
          eq(posts.id, id),
          or(isNull(posts.expiresAt), gt(posts.expiresAt, new Date()))
        )
      );

    if (result.length === 0) return undefined;

    const { post, user } = result[0];

    // Check privacy settings if currentUserId is provided
    if (currentUserId && post.privacy === "friends") {
      // Check if current user is friends with the post author
      const friendship = await this.getFriendship(currentUserId, post.userId);
      if (!friendship) {
        // Not friends, don't show the post
        return undefined;
      }
    } else if (currentUserId && post.privacy === "private") {
      // Only the author can see private posts
      if (post.userId !== currentUserId) {
        return undefined;
      }
    } else if (!currentUserId && post.privacy !== "public") {
      // Unauthenticated users can only see public posts
      return undefined;
    }

    // Get like count
    const likesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(likes)
      .where(eq(likes.postId, id));
    const likesCount = likesResult[0]?.count || 0;

    // Get comment count
    const commentsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.postId, id));
    const commentsCount = commentsResult[0]?.count || 0;

    // If this is a shared post, fetch the original post (max 1 level deep)
    let sharedPost: PostWithUser | undefined;
    if (post.sharedPostId && depth > 0) {
      // Fetch the shared post with depth-1 to prevent infinite recursion
      sharedPost = await this.getPost(post.sharedPostId, currentUserId, depth - 1);
    }

    return { ...post, user, likesCount, commentsCount, sharedPost };
  }

  async getPosts(
    filterUserId?: number,
    limit = 20,
    offset = 0,
    currentUserId?: number
  ): Promise<PostWithUser[]> {
    const now = new Date();

    let baseConditions = [
      // Filter out expired posts
      or(isNull(posts.expiresAt), gt(posts.expiresAt, now)),
    ];

    // Add user filter if specified
    if (filterUserId) {
      baseConditions.push(eq(posts.userId, filterUserId));
      console.log(
        `[getPosts] Filtering posts for specific user: ${filterUserId}`
      );
    } else {
      // If no specific user filter, apply privacy filtering for feed
      if (currentUserId) {
        // For authenticated users, show:
        // 1. Public posts from all users
        // 2. Posts from users they follow
        // 3. Their own posts (regardless of privacy)

        console.log(
          `[getPosts] Getting posts for authenticated user: ${currentUserId}`
        );

        // Get users that the current user follows
        const followingUsers = await db
          .select({ followingId: follows.followingId })
          .from(follows)
          .where(eq(follows.followerId, currentUserId));

        const followingIds = followingUsers.map((f) => f.followingId);
        console.log(
          `[getPosts] User follows ${followingIds.length} users:`,
          followingIds
        );

        // Get users that the current user is friends with
        const friends = await this.getUserFriends(currentUserId);
        const friendIds = friends.map((f) => f.id);
        console.log(
          `[getPosts] User has ${friendIds.length} friends:`,
          friendIds
        );

        // Combine following and friends for broader visibility
        const connectedUserIds = [...new Set([...followingIds, ...friendIds])];
        console.log(
          `[getPosts] Total connected users: ${connectedUserIds.length}`,
          connectedUserIds
        );

        baseConditions.push(
          or(
            // Public posts from all users
            eq(posts.privacy, "public"),
            // Posts from connected users (follows + friends) regardless of privacy
            inArray(posts.userId, connectedUserIds),
            // Friends-only posts from friends
            and(eq(posts.privacy, "friends"), inArray(posts.userId, friendIds)),
            // User's own posts (regardless of privacy)
            eq(posts.userId, currentUserId)
          )
        );
      } else {
        // For unauthenticated users, only show public posts
        console.log(
          `[getPosts] Getting posts for unauthenticated user - showing only public posts`
        );
        baseConditions.push(eq(posts.privacy, "public"));
      }
    }

    console.log(`[getPosts] Base conditions:`, baseConditions.length);

    const result = await db
      .select({
        post: posts,
        user: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(and(...baseConditions))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    console.log(`[getPosts] Found ${result.length} posts in database`);
    if (result.length > 0) {
      console.log(`[getPosts] Sample post:`, {
        id: result[0].post.id,
        userId: result[0].post.userId,
        privacy: result[0].post.privacy,
        content: result[0].post.content?.substring(0, 50),
        user: result[0].user.username,
      });
    }

    // Get interaction counts and user reactions for each post
    const enrichedPosts = await Promise.all(
      result.map(async ({ post, user }) => {
        const likesResult = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(likes)
          .where(eq(likes.postId, post.id));
        const commentsResult = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(comments)
          .where(eq(comments.postId, post.id));

        // Get current user's reaction if provided
        let userReaction = null;
        if (currentUserId) {
          const userLike = await db
            .select()
            .from(likes)
            .where(
              and(eq(likes.postId, post.id), eq(likes.userId, currentUserId))
            )
            .limit(1);
          userReaction = userLike[0]?.reactionType || null;
        }

        return {
          ...post,
          user,
          likesCount: Number(likesResult[0]?.count || 0),
          commentsCount: Number(commentsResult[0]?.count || 0),
          userReaction,
          isLiked: userReaction === "like",
        };
      })
    );

    console.log(`[getPosts] Returning ${enrichedPosts.length} enriched posts`);
    return enrichedPosts;
  }

  async updatePost(
    id: number,
    updates: Partial<InsertPost>
  ): Promise<Post | undefined> {
    const [post] = await db
      .update(posts)
      .set(updates)
      .where(eq(posts.id, id))
      .returning();
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

  async updateLike(
    userId: number,
    postId: number,
    reactionType: string
  ): Promise<Like | undefined> {
    const [updated] = await db
      .update(likes)
      .set({ reactionType })
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)))
      .returning();
    return updated;
  }

  async getPostReactions(postId: number): Promise<(Like & { user: User })[]> {
    const result = await db
      .select({
        like: likes,
        user: users,
      })
      .from(likes)
      .innerJoin(users, eq(likes.userId, users.id))
      .where(eq(likes.postId, postId))
      .orderBy(desc(likes.createdAt));

    return result.map(({ like, user }) => ({ ...like, user }));
  }

  // Comment methods
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db
      .insert(comments)
      .values(insertComment)
      .returning();
    return comment;
  }

  async getPostComments(
    postId: number,
    currentUserId?: number
  ): Promise<(Comment & { user: User; userReaction?: string })[]> {
    if (currentUserId) {
      // Use LEFT JOIN to get user reactions in single query
      const result = await db
        .select({
          comment: comments,
          user: users,
          userReaction: commentReactions.reactionType,
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .leftJoin(
          commentReactions,
          and(
            eq(commentReactions.commentId, comments.id),
            eq(commentReactions.userId, currentUserId)
          )
        )
        .where(
          and(eq(comments.postId, postId), isNull(comments.parentCommentId))
        )
        .orderBy(asc(comments.createdAt));

      return result.map(({ comment, user, userReaction }) => ({
        ...comment,
        user,
        userReaction: userReaction || undefined,
      }));
    } else {
      // No user context, just get comments without reactions
      const result = await db
        .select({
          comment: comments,
          user: users,
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(
          and(eq(comments.postId, postId), isNull(comments.parentCommentId))
        )
        .orderBy(asc(comments.createdAt));

      return result.map(({ comment, user }) => ({
        ...comment,
        user,
        userReaction: undefined,
      }));
    }
  }

  async getCommentReplies(
    commentId: number,
    currentUserId?: number
  ): Promise<(Comment & { user: User; userReaction?: string })[]> {
    if (currentUserId) {
      // Use LEFT JOIN to get user reactions in single query
      const result = await db
        .select({
          comment: comments,
          user: users,
          userReaction: commentReactions.reactionType,
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .leftJoin(
          commentReactions,
          and(
            eq(commentReactions.commentId, comments.id),
            eq(commentReactions.userId, currentUserId)
          )
        )
        .where(eq(comments.parentCommentId, commentId))
        .orderBy(asc(comments.createdAt));

      return result.map(({ comment, user, userReaction }) => ({
        ...comment,
        user,
        userReaction: userReaction || undefined,
      }));
    } else {
      // No user context, just get comments without reactions
      const result = await db
        .select({
          comment: comments,
          user: users,
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.parentCommentId, commentId))
        .orderBy(asc(comments.createdAt));

      return result.map(({ comment, user }) => ({
        ...comment,
        user,
        userReaction: undefined,
      }));
    }
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await db.delete(comments).where(eq(comments.id, id));
    return result.rowCount! > 0;
  }

  async updateComment(
    id: number,
    content: string,
    imageUrl?: string,
    gifUrl?: string,
    mediaType?: string
  ): Promise<Comment | undefined> {
    const updateData: any = { content };
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (gifUrl !== undefined) updateData.gifUrl = gifUrl;
    if (mediaType !== undefined) updateData.mediaType = mediaType;
    
    const [updated] = await db
      .update(comments)
      .set(updateData)
      .where(eq(comments.id, id))
      .returning();
    return updated;
  }

  async createCommentLike(
    insertCommentLike: InsertCommentLike
  ): Promise<CommentLike> {
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
      .where(
        and(
          eq(commentLikes.userId, userId),
          eq(commentLikes.commentId, commentId)
        )
      );

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

  async deleteFollow(
    followerId: number,
    followingId: number
  ): Promise<boolean> {
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
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getConversation(
    userId1: number,
    userId2: number
  ): Promise<MessageWithUser[]> {
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
    const conversationMap = new Map<string, MessageWithUser>();

    for (const { message, sender } of result) {
      const [receiver] = await db
        .select()
        .from(users)
        .where(eq(users.id, message.receiverId));

      // Handle self-messaging case
      const otherUserId =
        message.senderId === userId ? message.receiverId : message.senderId;

      // For self-messages, use a special key to ensure they appear
      const conversationKey =
        message.senderId === message.receiverId
          ? `self-${userId}`
          : `${Math.min(userId, otherUserId)}-${Math.max(userId, otherUserId)}`;

      if (
        !conversationMap.has(conversationKey) ||
        new Date(message.createdAt!) >
          new Date(conversationMap.get(conversationKey)!.createdAt!)
      ) {
        conversationMap.set(conversationKey, {
          ...message,
          sender,
          receiver,
        });
      }
    }

    return Array.from(conversationMap.values());
  }

  async markMessageRead(id: number): Promise<void> {
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(eq(messages.id, id));
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<void> {
    // Only allow marking messages as read if the user is the receiver
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(and(eq(messages.id, messageId), eq(messages.receiverId, userId)));
  }

  // Notification methods
  async createNotification(
    insertNotification: InsertNotification
  ): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
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
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // Search methods
  async searchUsers(query: string): Promise<User[]> {
    const searchTerm = query.toLowerCase();
    return await db
      .select()
      .from(users)
      .where(
        or(
          sql`LOWER(name) LIKE ${"%" + searchTerm + "%"}`,
          sql`LOWER(username) LIKE ${"%" + searchTerm + "%"}`
        )
      )
      .limit(20);
  }

  async searchPosts(query: string): Promise<PostWithUser[]> {
    const searchTerm = query.toLowerCase();
    const result = await db
      .select({
        post: posts,
        user: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(
        and(
          sql`LOWER(content) LIKE ${"%" + searchTerm + "%"}`,
          or(isNull(posts.expiresAt), gt(posts.expiresAt, new Date()))
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(20);

    return result.map(({ post, user }) => ({ ...post, user }));
  }

  // Admin methods
  async getTotalUsers(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    return result[0].count;
  }

  async getTotalPosts(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts);
    return result[0].count;
  }

  async getTotalComments(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments);
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
      .where(or(gt(posts.createdAt, today), gt(comments.createdAt, today)));

    return result[0].count || 0;
  }

  async getAllUsersAdmin(
    page: number,
    limit: number,
    search?: string
  ): Promise<User[]> {
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

  // Live stream methods
  async createLiveStream(
    insertLiveStream: InsertLiveStream
  ): Promise<LiveStream> {
    const [liveStream] = await db
      .insert(liveStreams)
      .values(insertLiveStream)
      .returning();
    return liveStream;
  }

  async getActiveLiveStreams(): Promise<(LiveStream & { user: User })[]> {
    const streams = await db
      .select()
      .from(liveStreams)
      .innerJoin(users, eq(liveStreams.userId, users.id))
      .where(eq(liveStreams.isActive, true))
      .orderBy(desc(liveStreams.startedAt));

    return streams.map(({ live_streams, users }) => ({
      ...live_streams,
      user: users,
    }));
  }

  async getLiveStreamById(streamId: number): Promise<(LiveStream & { user: User }) | null> {
    const result = await db
      .select()
      .from(liveStreams)
      .innerJoin(users, eq(liveStreams.userId, users.id))
      .where(eq(liveStreams.id, streamId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const { live_streams, users: userData } = result[0];
    return {
      ...live_streams,
      user: userData,
    };
  }

  async endLiveStream(streamId: number, userId: number): Promise<boolean> {
    try {
      const result = await db
        .update(liveStreams)
        .set({
          isActive: false,
          endedAt: new Date(),
        })
        .where(
          and(eq(liveStreams.id, streamId), eq(liveStreams.userId, userId))
        );

      return result.rowCount! > 0;
    } catch (error) {
      console.error("End live stream error:", error);
      return false;
    }
  }

  // Live stream chat methods
  async createLiveStreamChatMessage(message: InsertLiveStreamChatMessage): Promise<LiveStreamChatMessage> {
    const [newMessage] = await db
      .insert(liveStreamChatMessages)
      .values(message)
      .returning();
    
    return newMessage;
  }

  async getLiveStreamChatMessages(streamId: number, limit: number = 50, offset: number = 0): Promise<LiveStreamChatMessage[]> {
    const messages = await db
      .select()
      .from(liveStreamChatMessages)
      .where(eq(liveStreamChatMessages.streamId, streamId))
      .orderBy(desc(liveStreamChatMessages.createdAt))
      .limit(limit)
      .offset(offset);
    
    return messages.reverse(); // Return in chronological order
  }

  // Post view methods
  async recordPostView(postView: InsertPostView): Promise<PostView> {
    const [view] = await db.insert(postViews).values(postView).returning();
    return view;
  }

  async getPostViews(postId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(postViews)
      .where(eq(postViews.postId, postId));

    return result[0]?.count || 0;
  }

  async incrementPostViewCount(postId: number): Promise<void> {
    await db
      .update(posts)
      .set({
        viewsCount: sql`${posts.viewsCount} + 1`,
      })
      .where(eq(posts.id, postId));
  }

  async incrementPostShareCount(postId: number): Promise<void> {
    await db
      .update(posts)
      .set({
        sharesCount: sql`${posts.sharesCount} + 1`,
      })
      .where(eq(posts.id, postId));
  }

  // Friend request methods
  async sendFriendRequest(
    senderId: number,
    receiverId: number,
    message?: string
  ): Promise<FriendRequest> {
    const [request] = await db
      .insert(friendRequests)
      .values({
        senderId,
        receiverId,
        message,
      })
      .returning();
    return request;
  }

  async respondToFriendRequest(
    requestId: number,
    action: "accept" | "decline"
  ): Promise<FriendRequest | undefined> {
    const [request] = await db
      .update(friendRequests)
      .set({
        status: action === "accept" ? "accepted" : "declined",
        respondedAt: new Date(),
      })
      .where(eq(friendRequests.id, requestId))
      .returning();

    if (request && action === "accept") {
      await this.createFriendship(request.senderId, request.receiverId);
    }

    return request;
  }

  async getFriendRequests(
    userId: number,
    type: "sent" | "received"
  ): Promise<FriendRequestWithUser[]> {
    const condition =
      type === "sent"
        ? eq(friendRequests.senderId, userId)
        : eq(friendRequests.receiverId, userId);

    const result = await db
      .select({
        request: friendRequests,
        sender: users,
        receiver: users,
      })
      .from(friendRequests)
      .innerJoin(
        users,
        type === "sent"
          ? eq(friendRequests.receiverId, users.id)
          : eq(friendRequests.senderId, users.id)
      )
      .where(and(condition, eq(friendRequests.status, "pending")))
      .orderBy(desc(friendRequests.createdAt));

    return result.map(({ request, sender, receiver }) => ({
      ...request,
      sender: type === "sent" ? ({ id: userId } as User) : sender,
      receiver: type === "sent" ? sender : ({ id: userId } as User),
    }));
  }

  async getFriendRequestStatus(
    senderId: number,
    receiverId: number
  ): Promise<string | null> {
    const [request] = await db
      .select({ status: friendRequests.status })
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.senderId, senderId),
          eq(friendRequests.receiverId, receiverId)
        )
      )
      .orderBy(desc(friendRequests.createdAt))
      .limit(1);

    return request?.status || null;
  }

  async deleteFriendRequest(requestId: number): Promise<boolean> {
    const result = await db
      .delete(friendRequests)
      .where(eq(friendRequests.id, requestId));
    return result.rowCount! > 0;
  }

  // Friendship methods
  async createFriendship(
    user1Id: number,
    user2Id: number
  ): Promise<Friendship> {
    const [friendship] = await db
      .insert(friendships)
      .values({
        user1Id: Math.min(user1Id, user2Id),
        user2Id: Math.max(user1Id, user2Id),
      })
      .returning();
    return friendship;
  }

  async deleteFriendship(user1Id: number, user2Id: number): Promise<boolean> {
    const result = await db
      .delete(friendships)
      .where(
        and(
          eq(friendships.user1Id, Math.min(user1Id, user2Id)),
          eq(friendships.user2Id, Math.max(user1Id, user2Id))
        )
      );
    return result.rowCount! > 0;
  }

  async getFriends(userId: number): Promise<User[]> {
    // Get friends from friendships table
    const friendshipRecords = await db
      .select()
      .from(friendships)
      .where(
        or(eq(friendships.user1Id, userId), eq(friendships.user2Id, userId))
      );

    // Extract friend user IDs
    const friendIds = friendshipRecords.map((friendship: Friendship) =>
      friendship.user1Id === userId ? friendship.user2Id : friendship.user1Id
    );

    if (friendIds.length === 0) {
      return [];
    }

    // Get user details for all friends
    const friends = await db
      .select()
      .from(users)
      .where(inArray(users.id, friendIds));

    return friends;
  }

  async getFriendSuggestions(userId: number, limit = 10): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        and(
          sql`${users.id} != ${userId}`,
          sql`${users.id} NOT IN (
          SELECT CASE 
            WHEN user1_id = ${userId} THEN user2_id 
            ELSE user1_id 
          END 
          FROM friendships 
          WHERE user1_id = ${userId} OR user2_id = ${userId}
        )`,
          sql`${users.id} NOT IN (
          SELECT receiver_id FROM friend_requests WHERE sender_id = ${userId}
        )`,
          sql`${users.id} NOT IN (
          SELECT sender_id FROM friend_requests WHERE receiver_id = ${userId}
        )`
        )
      )
      .limit(limit);
  }

  async areFriends(user1Id: number, user2Id: number): Promise<boolean> {
    const [friendship] = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.user1Id, Math.min(user1Id, user2Id)),
          eq(friendships.user2Id, Math.max(user1Id, user2Id))
        )
      )
      .limit(1);

    return !!friendship;
  }

  async getMutualFriends(user1Id: number, user2Id: number): Promise<User[]> {
    const result = await db.select().from(users).where(sql`
        ${users.id} IN (
          SELECT CASE 
            WHEN f1.user1_id = ${user1Id} THEN f1.user2_id 
            ELSE f1.user1_id 
          END 
          FROM friendships f1
          WHERE (f1.user1_id = ${user1Id} OR f1.user2_id = ${user1Id})
        ) AND ${users.id} IN (
          SELECT CASE 
            WHEN f2.user1_id = ${user2Id} THEN f2.user2_id 
            ELSE f2.user1_id 
          END 
          FROM friendships f2
          WHERE (f2.user1_id = ${user2Id} OR f2.user2_id = ${user2Id})
        )
      `);

    return result;
  }

  async toggleCloseFriend(userId: number, friendId: number): Promise<boolean> {
    const [friendship] = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.user1Id, Math.min(userId, friendId)),
          eq(friendships.user2Id, Math.max(userId, friendId))
        )
      );

    if (!friendship) return false;

    await db
      .update(friendships)
      .set({ closeFriend: !friendship.closeFriend })
      .where(eq(friendships.id, friendship.id));

    return true;
  }

  async getMutualFollowers(userId: number): Promise<User[]> {
    // Get users who I follow AND who follow me back (mutual follows)
    const mutualFollowsQuery = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        username: users.username,
        profilePicture: users.profilePicture,
        bio: users.bio,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(follows, eq(follows.followingId, users.id))
      .where(
        and(
          eq(follows.followerId, userId), // I follow them
          exists(
            db
              .select()
              .from(follows as any)
              .where(
                and(
                  eq(follows.followerId, users.id), // They follow me
                  eq(follows.followingId, userId)
                )
              )
          )
        )
      );

    return mutualFollowsQuery;
  }

  // Privacy & Safety methods
  async getPrivacySettings(
    userId: number
  ): Promise<PrivacySettings | undefined> {
    const [settings] = await db
      .select()
      .from(privacySettings)
      .where(eq(privacySettings.userId, userId));

    if (!settings) {
      const [newSettings] = await db
        .insert(privacySettings)
        .values({ userId })
        .returning();
      return newSettings;
    }

    return settings;
  }

  async updatePrivacySettings(
    userId: number,
    settings: Partial<InsertPrivacySettings>
  ): Promise<PrivacySettings> {
    const [updated] = await db
      .update(privacySettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(privacySettings.userId, userId))
      .returning();

    return updated;
  }

  async blockUser(
    blockerId: number,
    blockedId: number,
    reason?: string
  ): Promise<BlockedUser> {
    const [blocked] = await db
      .insert(blockedUsers)
      .values({
        blockerId,
        blockedId,
        reason,
      })
      .returning();

    await this.deleteFriendship(blockerId, blockedId);
    return blocked;
  }

  async unblockUser(blockerId: number, blockedId: number): Promise<boolean> {
    const result = await db
      .delete(blockedUsers)
      .where(
        and(
          eq(blockedUsers.blockerId, blockerId),
          eq(blockedUsers.blockedId, blockedId)
        )
      );
    return result.rowCount! > 0;
  }

  async getBlockedUsers(userId: number): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(blockedUsers)
      .innerJoin(users, eq(blockedUsers.blockedId, users.id))
      .where(eq(blockedUsers.blockerId, userId));

    return result.map(({ user }) => user);
  }

  async isUserBlocked(blockerId: number, blockedId: number): Promise<boolean> {
    const [blocked] = await db
      .select()
      .from(blockedUsers)
      .where(
        and(
          eq(blockedUsers.blockerId, blockerId),
          eq(blockedUsers.blockedId, blockedId)
        )
      )
      .limit(1);

    return !!blocked;
  }

  // Community methods
  async createCommunityGroup(
    group: InsertCommunityGroup
  ): Promise<CommunityGroup> {
    const [newGroup] = await db
      .insert(communityGroups)
      .values(group)
      .returning();
    // Ensure creator is a member/admin by default
    await db
      .insert(groupMemberships)
      .values({
        groupId: newGroup.id,
        userId: newGroup.creatorId,
        role: 'admin',
        status: 'active',
      });
    // Increment member count if needed
    await db
      .update(communityGroups)
      .set({ memberCount: sql`${communityGroups.memberCount} + 1` })
      .where(eq(communityGroups.id, newGroup.id));
    return newGroup;
  }

  async updateCommunityGroup(
    groupId: number,
    requesterId: number,
    updates: Partial<InsertCommunityGroup>
  ): Promise<CommunityGroup> {
    // Only creator can update
    const [group] = await db
      .select()
      .from(communityGroups)
      .where(eq(communityGroups.id, groupId))
      .limit(1);
    if (!group || group.creatorId !== requesterId) {
      throw new Error("Not authorized to update this group");
    }

    const allowed: Partial<InsertCommunityGroup> = {
      name: updates.name,
      description: updates.description,
      category: updates.category,
      privacy: updates.privacy,
      coverImage: (updates as any).coverImage,
      tags: updates.tags,
    } as any;

    const [updated] = await db
      .update(communityGroups)
      .set(allowed)
      .where(eq(communityGroups.id, groupId))
      .returning();
    return updated;
  }

  async deleteCommunityGroup(
    groupId: number,
    requesterId: number
  ): Promise<boolean> {
    const [group] = await db
      .select()
      .from(communityGroups)
      .where(eq(communityGroups.id, groupId))
      .limit(1);
    if (!group || group.creatorId !== requesterId) {
      throw new Error("Not authorized to delete this group");
    }

    await db.delete(groupPosts).where(eq(groupPosts.groupId, groupId));
    await db
      .delete(groupMemberships)
      .where(eq(groupMemberships.groupId, groupId));
    const result = await db
      .delete(communityGroups)
      .where(eq(communityGroups.id, groupId));
    return result.rowCount! > 0;
  }

  async getCommunityGroups(
    category?: string,
    userId?: number
  ): Promise<GroupWithDetails[]> {
    let query = db
      .select({
        group: communityGroups,
        creator: users,
        membership: groupMemberships,
      })
      .from(communityGroups)
      .innerJoin(users, eq(communityGroups.creatorId, users.id))
      .leftJoin(
        groupMemberships,
        and(
          eq(groupMemberships.groupId, communityGroups.id),
          userId ? eq(groupMemberships.userId, userId) : sql`false`
        )
      );

    if (category) {
      query = query.where(eq(communityGroups.category, category));
    }

    const result = await query.orderBy(desc(communityGroups.createdAt));

    return result.map(({ group, creator, membership }) => ({
      ...group,
      creator,
      membershipStatus: membership?.status || "none",
      isJoined: !!membership && membership.status === "active",
    }));
  }

  async getGroupById(groupId: number): Promise<GroupWithDetails | null> {
    const result = await db
      .select({
        group: communityGroups,
        creator: users,
      })
      .from(communityGroups)
      .innerJoin(users, eq(communityGroups.creatorId, users.id))
      .where(eq(communityGroups.id, groupId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const { group, creator } = result[0];
    return {
      ...group,
      creator,
      membershipStatus: "none",
      isJoined: false,
    };
  }

  async getGroupMembership(
    groupId: number,
    userId: number
  ): Promise<GroupMembership | undefined> {
    const [membership] = await db
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.userId, userId)
        )
      );

    return membership;
  }

  async getGroupMembers(groupId: number): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(groupMemberships)
      .innerJoin(users, eq(groupMemberships.userId, users.id))
      .where(eq(groupMemberships.groupId, groupId));
    return result.map(r => r.user);
  }

  async createGroupMessage(msg: InsertGroupMessage): Promise<GroupMessage> {
    const [row] = await db.insert(groupMessages).values(msg).returning();
    return row;
  }

  async getGroupMessages(groupId: number, limit = 100): Promise<(GroupMessage & { user: User })[]> {
    const rows = await db
      .select({ m: groupMessages, u: users })
      .from(groupMessages)
      .innerJoin(users, eq(groupMessages.userId, users.id))
      .where(eq(groupMessages.groupId, groupId))
      .orderBy(desc(groupMessages.createdAt))
      .limit(limit);
    return rows.reverse().map(({ m, u }) => ({ ...m, user: u }));
  }

  async joinGroup(groupId: number, userId: number): Promise<GroupMembership> {
    console.log("Storage joinGroup called:", { groupId, userId });

    const [membership] = await db
      .insert(groupMemberships)
      .values({
        groupId,
        userId,
        role: "member",
        status: "active",
      })
      .returning();

    console.log("Membership created:", membership);

    await db
      .update(communityGroups)
      .set({ memberCount: sql`${communityGroups.memberCount} + 1` })
      .where(eq(communityGroups.id, groupId));

    console.log("Member count updated for group:", groupId);
    return membership;
  }

  async leaveGroup(groupId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.userId, userId)
        )
      );

    if (result.rowCount! > 0) {
      await db
        .update(communityGroups)
        .set({ memberCount: sql`${communityGroups.memberCount} - 1` })
        .where(eq(communityGroups.id, groupId));
    }

    return result.rowCount! > 0;
  }

  async getUserGroups(userId: number): Promise<CommunityGroup[]> {
    const result = await db
      .select({ group: communityGroups })
      .from(groupMemberships)
      .innerJoin(
        communityGroups,
        eq(groupMemberships.groupId, communityGroups.id)
      )
      .where(eq(groupMemberships.userId, userId));

    return result.map(({ group }) => group);
  }

  async getGroupPosts(
    groupId: number,
    userId?: number
  ): Promise<(GroupPost & { user: User })[]> {
    const result = await db
      .select({
        post: groupPosts,
        user: users,
      })
      .from(groupPosts)
      .innerJoin(users, eq(groupPosts.userId, users.id))
      .where(eq(groupPosts.groupId, groupId))
      .orderBy(desc(groupPosts.createdAt));

    return result.map(({ post, user }) => ({ ...post, user }));
  }

  async createGroupPost(post: InsertGroupPost): Promise<GroupPost> {
    const [newPost] = await db.insert(groupPosts).values(post).returning();
    return newPost;
  }

  // Wellness methods
  async recordWellnessTracking(
    tracking: InsertWellnessTracking
  ): Promise<WellnessTracking> {
    // Check if a record already exists for this user and date
    const trackingDate =
      tracking.date instanceof Date ? tracking.date : new Date(tracking.date);
    const dateString = trackingDate.toISOString().split("T")[0]; // YYYY-MM-DD format

    const existingRecord = await db
      .select()
      .from(wellnessTracking)
      .where(
        and(
          eq(wellnessTracking.userId, tracking.userId),
          sql`DATE(${wellnessTracking.date}) = ${dateString}`
        )
      )
      .limit(1);

    if (existingRecord.length > 0) {
      // Update existing record
      const [updatedRecord] = await db
        .update(wellnessTracking)
        .set({
          moodRating: tracking.moodRating,
          energyLevel: tracking.energyLevel,
          stressLevel: tracking.stressLevel,
          sleepHours: tracking.sleepHours,
          waterIntake: tracking.waterIntake,
          exerciseMinutes: tracking.exerciseMinutes,
          notes: tracking.notes,
          isPrivate: tracking.isPrivate,
        })
        .where(eq(wellnessTracking.id, existingRecord[0].id))
        .returning();
      return updatedRecord;
    } else {
      // Create new record
      const [record] = await db
        .insert(wellnessTracking)
        .values({
          ...tracking,
          date: trackingDate,
        })
        .returning();
      return record;
    }
  }

  async getWellnessTracking(
    userId: number,
    days = 30
  ): Promise<WellnessTracking[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await db
      .select()
      .from(wellnessTracking)
      .where(
        and(
          eq(wellnessTracking.userId, userId),
          gt(wellnessTracking.date, startDate)
        )
      )
      .orderBy(desc(wellnessTracking.date));
  }

  async updateWellnessTracking(
    id: number,
    userId: number,
    updates: Partial<InsertWellnessTracking>
  ): Promise<WellnessTracking> {
    const [existing] = await db
      .select()
      .from(wellnessTracking)
      .where(and(eq(wellnessTracking.id, id), eq(wellnessTracking.userId, userId)))
      .limit(1);

    if (!existing) {
      throw new Error("Wellness record not found or not authorized");
    }

    const allowed: Partial<InsertWellnessTracking> = {
      moodRating: updates.moodRating,
      energyLevel: updates.energyLevel,
      stressLevel: updates.stressLevel,
      sleepHours: updates.sleepHours,
      waterIntake: updates.waterIntake,
      exerciseMinutes: updates.exerciseMinutes,
      notes: updates.notes,
      isPrivate: updates.isPrivate,
    };

    const [updated] = await db
      .update(wellnessTracking)
      .set(allowed)
      .where(and(eq(wellnessTracking.id, id), eq(wellnessTracking.userId, userId)))
      .returning();

    return updated;
  }

  async deleteWellnessTracking(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(wellnessTracking)
      .where(and(eq(wellnessTracking.id, id), eq(wellnessTracking.userId, userId)))
      .returning({ id: wellnessTracking.id });
    return result.length > 0;
  }

  async getWellnessStats(
    userId: number,
    days = 30
  ): Promise<{
    count: number;
    startDate: string;
    endDate: string;
    averages: {
      moodRating: number | null;
      energyLevel: number | null;
      stressLevel: number | null;
      sleepHours: number | null;
      waterIntake: number | null;
      exerciseMinutes: number | null;
    };
    streaks: { currentStreak: number; bestStreak: number };
  }> {
    const records = await this.getWellnessTracking(userId, days);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const toNum = (v: any) => (typeof v === "number" ? v : v == null ? null : Number(v));

    const sumAndCount = (key: keyof WellnessTracking) => {
      let sum = 0;
      let count = 0;
      for (const r of records) {
        const val = toNum(r[key as any]);
        if (typeof val === "number" && !Number.isNaN(val)) {
          sum += val;
          count += 1;
        }
      }
      return { sum, count };
    };

    const avg = (sum: number, count: number) => (count > 0 ? Number((sum / count).toFixed(2)) : null);

    const mood = sumAndCount("moodRating" as any);
    const energy = sumAndCount("energyLevel" as any);
    const stress = sumAndCount("stressLevel" as any);
    const sleep = sumAndCount("sleepHours" as any);
    const water = sumAndCount("waterIntake" as any);
    const exercise = sumAndCount("exerciseMinutes" as any);

    // Streaks: count consecutive days from most recent going back
    const byDate = new Set(records.map((r) => new Date(r.date as any).toISOString().split("T")[0]));
    let currentStreak = 0;
    let bestStreak = 0;
    let cursor = new Date();
    // current streak
    while (currentStreak < days) {
      const key = cursor.toISOString().split("T")[0];
      if (byDate.has(key)) {
        currentStreak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    // best streak in window
    let tempStreak = 0;
    const iter = new Date(endDate);
    for (let i = 0; i < days; i++) {
      const key = iter.toISOString().split("T")[0];
      if (byDate.has(key)) {
        tempStreak += 1;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
      iter.setDate(iter.getDate() - 1);
    }

    return {
      count: records.length,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      averages: {
        moodRating: avg(mood.sum, mood.count),
        energyLevel: avg(energy.sum, energy.count),
        stressLevel: avg(stress.sum, stress.count),
        sleepHours: avg(sleep.sum, sleep.count),
        waterIntake: avg(water.sum, water.count),
        exerciseMinutes: avg(exercise.sum, exercise.count),
      },
      streaks: { currentStreak, bestStreak },
    };
  }

  async createHabit(habit: InsertHabitTracking): Promise<HabitTracking> {
    const [newHabit] = await db.insert(habitTracking).values(habit).returning();
    return newHabit;
  }

  async getUserHabits(userId: number): Promise<HabitTracking[]> {
    return await db
      .select()
      .from(habitTracking)
      .where(
        and(eq(habitTracking.userId, userId), eq(habitTracking.isActive, true))
      )
      .orderBy(desc(habitTracking.createdAt));
  }

  async logHabit(log: InsertHabitLog): Promise<HabitLog> {
    // Check if a log already exists for this habit and date
    const logDate = log.date instanceof Date ? log.date : new Date(log.date);
    const dateString = logDate.toISOString().split("T")[0]; // YYYY-MM-DD format

    const existingLog = await db
      .select()
      .from(habitLogs)
      .where(
        and(
          eq(habitLogs.habitId, log.habitId),
          eq(habitLogs.userId, log.userId),
          sql`DATE(${habitLogs.date}) = ${dateString}`
        )
      )
      .limit(1);

    let resultLog: HabitLog;

    if (existingLog.length > 0) {
      // Update existing log
      const [updatedLog] = await db
        .update(habitLogs)
        .set({ completed: log.completed, value: log.value, notes: log.notes })
        .where(eq(habitLogs.id, existingLog[0].id))
        .returning();
      resultLog = updatedLog;
    } else {
      // Create new log
      const [newLog] = await db
        .insert(habitLogs)
        .values({
          ...log,
          date: logDate,
        })
        .returning();
      resultLog = newLog;
    }

    // Calculate and update streak count
    if (log.completed) {
      const newStreak = await this.calculateHabitStreak(
        log.habitId,
        log.userId
      );
      await this.updateHabitStreak(log.habitId, newStreak);
    } else {
      // If marking as incomplete, reset streak to 0
      await this.updateHabitStreak(log.habitId, 0);
    }

    return resultLog;
  }

  async getHabitLogs(habitId: number, days = 30): Promise<HabitLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), gt(habitLogs.date, startDate)))
      .orderBy(desc(habitLogs.date));
  }

  async getHabitLogsForDate(userId: number, date: string): Promise<HabitLog[]> {
    return await db
      .select()
      .from(habitLogs)
      .where(
        and(
          eq(habitLogs.userId, userId),
          sql`DATE(${habitLogs.date}) = ${date}`
        )
      )
      .orderBy(desc(habitLogs.date));
  }

  async getHabitLogsForUser(userId: number, days = 60): Promise<HabitLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.userId, userId), gt(habitLogs.date, startDate)))
      .orderBy(desc(habitLogs.date));
  }

  async updateHabitStreak(habitId: number, streak: number): Promise<void> {
    await db
      .update(habitTracking)
      .set({ streakCount: streak })
      .where(eq(habitTracking.id, habitId));
  }

  async calculateHabitStreak(habitId: number, userId: number): Promise<number> {
    // Get all completed logs for this habit, ordered by date descending
    const logs = await db
      .select()
      .from(habitLogs)
      .where(
        and(
          eq(habitLogs.habitId, habitId),
          eq(habitLogs.userId, userId),
          eq(habitLogs.completed, true)
        )
      )
      .orderBy(desc(habitLogs.date));

    if (logs.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from today and count backwards for consecutive days
    let currentDate = new Date(today);

    for (let i = 0; i < logs.length; i++) {
      const logDate = new Date(logs[i].date);
      logDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(currentDate);
      expectedDate.setDate(expectedDate.getDate() - streak);

      if (logDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (logDate.getTime() < expectedDate.getTime()) {
        // Found a gap in the streak
        break;
      }
    }

    return streak;
  }

  // Beauty & Shopping methods
  async createBeautyProduct(
    product: InsertBeautyProduct
  ): Promise<BeautyProduct> {
    const [newProduct] = await db
      .insert(beautyProducts)
      .values(product)
      .returning();
    return newProduct;
  }

  async getBeautyProducts(
    category?: string,
    limit = 50
  ): Promise<BeautyProduct[]> {
    let query = db.select().from(beautyProducts);

    if (category) {
      query = query.where(eq(beautyProducts.category, category));
    }

    return await query.orderBy(desc(beautyProducts.averageRating)).limit(limit);
  }

  async createProductReview(
    review: InsertProductReview
  ): Promise<ProductReview> {
    const [newReview] = await db
      .insert(productReviews)
      .values(review)
      .returning();

    const reviews = await db
      .select({ rating: productReviews.rating })
      .from(productReviews)
      .where(eq(productReviews.productId, review.productId));

    const avgRating = Math.round(
      (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 100
    );

    await db
      .update(beautyProducts)
      .set({
        averageRating: avgRating,
        reviewCount: reviews.length,
      })
      .where(eq(beautyProducts.id, review.productId));

    return newReview;
  }

  async getProductReviews(
    productId: number
  ): Promise<(ProductReview & { user: User })[]> {
    const result = await db
      .select({
        review: productReviews,
        user: users,
      })
      .from(productReviews)
      .innerJoin(users, eq(productReviews.userId, users.id))
      .where(eq(productReviews.productId, productId))
      .orderBy(desc(productReviews.createdAt));

    return result.map(({ review, user }) => ({ ...review, user }));
  }

  async createWishlist(wishlist: InsertWishlist): Promise<Wishlist> {
    const [newWishlist] = await db
      .insert(wishlists)
      .values(wishlist)
      .returning();
    return newWishlist;
  }

  async getUserWishlists(userId: number): Promise<WishlistWithItems[]> {
    const userWishlists = await db
      .select()
      .from(wishlists)
      .where(eq(wishlists.userId, userId))
      .orderBy(desc(wishlists.createdAt));

    const result: WishlistWithItems[] = [];

    for (const wishlist of userWishlists) {
      const items = await db
        .select({
          item: wishlistItems,
          product: beautyProducts,
        })
        .from(wishlistItems)
        .leftJoin(
          beautyProducts,
          eq(wishlistItems.productId, beautyProducts.id)
        )
        .where(eq(wishlistItems.wishlistId, wishlist.id));

      result.push({
        ...wishlist,
        items: items.map(({ item, product }) => ({
          ...item,
          product: product || undefined,
        })),
        user: { id: userId } as User,
      });
    }

    return result;
  }

  async addToWishlist(item: InsertWishlistItem): Promise<WishlistItem> {
    const [newItem] = await db.insert(wishlistItems).values(item).returning();
    return newItem;
  }

  async createShoppingPost(post: InsertShoppingPost): Promise<ShoppingPost> {
    const [newPost] = await db.insert(shoppingPosts).values(post).returning();
    return newPost;
  }

  async getShoppingPosts(
    userId?: number
  ): Promise<(ShoppingPost & { user: User })[]> {
    let query = db
      .select({
        post: shoppingPosts,
        user: users,
      })
      .from(shoppingPosts)
      .innerJoin(users, eq(shoppingPosts.userId, users.id));

    if (userId) {
      query = query.where(eq(shoppingPosts.userId, userId));
    }

    const result = await query.orderBy(desc(shoppingPosts.createdAt));

    return result.map(({ post, user }) => ({ ...post, user }));
  }

  // Event methods
  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async updateEvent(eventId: number, updates: Partial<InsertEvent>): Promise<Event> {
    const [updatedEvent] = await db
      .update(events)
      .set(updates)
      .where(eq(events.id, eventId))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(eventId: number): Promise<void> {
    // First delete related event attendees
    await db.delete(eventAttendees).where(eq(eventAttendees.eventId, eventId));
    // Then delete the event
    await db.delete(events).where(eq(events.id, eventId));
  }

  async getEvents(userId?: number): Promise<EventWithDetails[]> {
    let query = db
      .select({
        event: events,
        creator: users,
      })
      .from(events)
      .innerJoin(users, eq(events.creatorId, users.id));

    // Only filter by userId if specifically requested (for user's own events page)
    if (userId) {
      query = query.where(eq(events.creatorId, userId));
    }

    const result = await query.orderBy(asc(events.startDate));

    return result.map(({ event, creator }) => ({
      ...event,
      creator,
      attendeeStatus: "none",
      attendeeCount: event.currentAttendees || 0,
    }));
  }

  async getEventsWithUserRSVP(currentUserId?: number): Promise<EventWithDetails[]> {
    let query = db
      .select({
        event: events,
        creator: users,
        userRSVP: eventAttendees,
      })
      .from(events)
      .innerJoin(users, eq(events.creatorId, users.id))
      .leftJoin(
        eventAttendees,
        currentUserId 
          ? and(eq(eventAttendees.eventId, events.id), eq(eventAttendees.userId, currentUserId))
          : undefined
      );

    const result = await query.orderBy(asc(events.startDate));

    return result.map(({ event, creator, userRSVP }) => ({
      ...event,
      creator,
      attendeeStatus: userRSVP?.status || "none",
      attendeeCount: event.currentAttendees || 0,
    }));
  }

  async respondToEvent(
    eventId: number,
    userId: number,
    status: string
  ): Promise<EventAttendee> {
    // Check if user already has an RSVP for this event
    const existingRSVP = await db
      .select()
      .from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)))
      .limit(1);

    let attendee: EventAttendee;

    if (existingRSVP.length > 0) {
      // Update existing RSVP
      const oldStatus = existingRSVP[0].status;
      
      // Update the RSVP status
      [attendee] = await db
        .update(eventAttendees)
        .set({ status, responseDate: new Date() })
        .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)))
        .returning();

      // Update attendee count based on status change
      if (oldStatus === "going" && status !== "going") {
        // User was going, now not going - decrease count
        await db
          .update(events)
          .set({ currentAttendees: sql`${events.currentAttendees} - 1` })
          .where(eq(events.id, eventId));
      } else if (oldStatus !== "going" && status === "going") {
        // User wasn't going, now going - increase count
        await db
          .update(events)
          .set({ currentAttendees: sql`${events.currentAttendees} + 1` })
          .where(eq(events.id, eventId));
      }
    } else {
      // Create new RSVP
      [attendee] = await db
        .insert(eventAttendees)
        .values({
          eventId,
          userId,
          status,
        })
        .returning();

      // Update attendee count if going
      if (status === "going") {
        await db
          .update(events)
          .set({ currentAttendees: sql`${events.currentAttendees} + 1` })
          .where(eq(events.id, eventId));
      }
    }

    return attendee;
  }

  // Saved posts methods
  async savePost(userId: number, postId: number): Promise<void> {
    try {
      await db
        .insert(savedPosts)
        .values({
          userId,
          postId,
        })
        .onConflictDoNothing();
    } catch (error) {
      console.error("Save post error:", error);
      throw error;
    }
  }

  async unsavePost(userId: number, postId: number): Promise<void> {
    try {
      await db
        .delete(savedPosts)
        .where(
          and(eq(savedPosts.userId, userId), eq(savedPosts.postId, postId))
        );
    } catch (error) {
      console.error("Unsave post error:", error);
      throw error;
    }
  }

  async getSavedPosts(userId: number): Promise<PostWithUser[]> {
    try {
      const result = await db
        .select({
          post: posts,
          user: users,
          savedAt: savedPosts.createdAt,
        })
        .from(savedPosts)
        .innerJoin(posts, eq(savedPosts.postId, posts.id))
        .innerJoin(users, eq(posts.userId, users.id))
        .where(eq(savedPosts.userId, userId))
        .orderBy(desc(savedPosts.createdAt));

      return result.map(({ post, user, savedAt }) => ({
        ...post,
        user,
        text: post.content,
        imageUrl: post.imageUrl,
        videoUrl: post.videoUrl,
        savedAt: savedAt?.toISOString(),
      }));
    } catch (error) {
      console.error("Get saved posts error:", error);
      throw error;
    }
  }

  async getUserEvents(
    userId: number,
    type: "created" | "attending"
  ): Promise<Event[]> {
    if (type === "created") {
      return await db
        .select()
        .from(events)
        .where(eq(events.creatorId, userId))
        .orderBy(asc(events.startDate));
    } else {
      const result = await db
        .select({ event: events })
        .from(eventAttendees)
        .innerJoin(events, eq(eventAttendees.eventId, events.id))
        .where(
          and(
            eq(eventAttendees.userId, userId),
            eq(eventAttendees.status, "going")
          )
        )
        .orderBy(asc(events.startDate));

      return result.map(({ event }) => event);
    }
  }

  // Mentorship methods
  async createMentorProfile(
    profile: InsertMentorProfile
  ): Promise<MentorProfile> {
    const [newProfile] = await db
      .insert(mentorProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async getMentors(expertise?: string[]): Promise<MentorWithProfile[]> {
    const result = await db
      .select({
        user: users,
        mentorProfile: mentorProfiles,
      })
      .from(mentorProfiles)
      .innerJoin(users, eq(mentorProfiles.userId, users.id))
      .where(eq(mentorProfiles.isActive, true))
      .orderBy(desc(mentorProfiles.rating));

    return result.map(({ user, mentorProfile }) => ({
      ...user,
      mentorProfile,
    }));
  }

  async requestMentorship(
    request: InsertMentorshipRequest
  ): Promise<MentorshipRequest> {
    const [newRequest] = await db
      .insert(mentorshipRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async getMentorshipRequests(
    userId: number,
    type: "sent" | "received"
  ): Promise<(MentorshipRequest & { mentor: MentorProfile; mentee: User })[]> {
    if (type === "sent") {
      const result = await db
        .select({
          request: mentorshipRequests,
          mentor: mentorProfiles,
          mentee: users,
        })
        .from(mentorshipRequests)
        .innerJoin(
          mentorProfiles,
          eq(mentorshipRequests.mentorId, mentorProfiles.id)
        )
        .innerJoin(users, eq(mentorProfiles.userId, users.id))
        .where(eq(mentorshipRequests.menteeId, userId))
        .orderBy(desc(mentorshipRequests.createdAt));

      return result.map(({ request, mentor, mentee }) => ({
        ...request,
        mentor,
        mentee: { id: userId } as User,
      }));
    } else {
      const [mentorProfile] = await db
        .select()
        .from(mentorProfiles)
        .where(eq(mentorProfiles.userId, userId));

      if (!mentorProfile) return [];

      const result = await db
        .select({
          request: mentorshipRequests,
          mentor: mentorProfiles,
          mentee: users,
        })
        .from(mentorshipRequests)
        .innerJoin(
          mentorProfiles,
          eq(mentorshipRequests.mentorId, mentorProfiles.id)
        )
        .innerJoin(users, eq(mentorshipRequests.menteeId, users.id))
        .where(eq(mentorshipRequests.mentorId, mentorProfile.id))
        .orderBy(desc(mentorshipRequests.createdAt));

      return result.map(({ request, mentor, mentee }) => ({
        ...request,
        mentor,
        mentee,
      }));
    }
  }

  // ========== PUBLIC METHODS (NO AUTH REQUIRED) ==========

  async getPublicPosts(limit = 12): Promise<any[]> {
    try {
      // Get public posts with high engagement for landing page
      const result = await db
        .select({
          post: posts,
          user: users,
          likesCount: sql<number>`COALESCE(COUNT(DISTINCT ${likes.id}), 0)`,
          commentsCount: sql<number>`COALESCE(COUNT(DISTINCT ${comments.id}), 0)`,
          viewsCount: sql<number>`COALESCE(${posts.viewsCount}, 0)`,
        })
        .from(posts)
        .innerJoin(users, eq(posts.userId, users.id))
        .leftJoin(likes, eq(likes.postId, posts.id))
        .leftJoin(comments, eq(comments.postId, posts.id))
        .where(
          and(
            eq(posts.privacy, "public"),
            or(isNull(posts.expiresAt), gt(posts.expiresAt, new Date()))
          )
        )
        .groupBy(posts.id, users.id)
        .orderBy(
          desc(
            sql`COALESCE(COUNT(DISTINCT ${likes.id}), 0) + COALESCE(COUNT(DISTINCT ${comments.id}), 0) + COALESCE(${posts.viewsCount}, 0)`
          )
        )
        .limit(limit);

      return result.map(
        ({ post, user, likesCount, commentsCount, viewsCount }) => ({
          id: post.id,
          content: post.content,
          imageUrl: post.imageUrl,
          videoUrl: post.videoUrl,
          createdAt: post.createdAt,
          user: {
            id: user.id,
            name: user.name || user.email?.split("@")[0] || "User",
            username: user.username || user.email?.split("@")[0] || "user",
            avatar: user.avatar,
          },
          likesCount: Number(likesCount),
          commentsCount: Number(commentsCount),
          viewsCount: Number(viewsCount),
        })
      );
    } catch (error) {
      console.error("Get public posts error:", error);
      return [];
    }
  }

  async getPlatformStats(): Promise<any> {
    try {
      // Get platform statistics for landing page
      const [usersResult, postsResult, activeTodayResult, communitiesResult] =
        await Promise.all([
          db.select({ count: sql<number>`COUNT(*)` }).from(users),
          db.select({ count: sql<number>`COUNT(*)` }).from(posts),
          db
            .select({ count: sql<number>`COUNT(DISTINCT ${posts.userId})` })
            .from(posts)
            .where(sql`DATE(${posts.createdAt}) = CURRENT_DATE`),
          db.select({ count: sql<number>`COUNT(*)` }).from(communityGroups),
        ]);

      return {
        totalUsers: Number(usersResult[0]?.count || 0),
        totalPosts: Number(postsResult[0]?.count || 0),
        activeToday: Number(activeTodayResult[0]?.count || 0),
        totalCommunities: Number(communitiesResult[0]?.count || 0),
      };
    } catch (error) {
      console.error("Get platform stats error:", error);
      return {
        totalUsers: 0,
        totalPosts: 0,
        activeToday: 0,
        totalCommunities: 0,
      };
    }
  }

  // ========== REELS METHODS ==========

  async getReels(userId?: number): Promise<any[]> {
    try {
      console.log("Getting reels from database");

      const result = await db
        .select({
          reel: reels,
          user: users,
        })
        .from(reels)
        .innerJoin(users, eq(reels.userId, users.id))
        .orderBy(desc(reels.createdAt));

      const reelsWithUser = await Promise.all(
        result.map(async ({ reel, user }) => {
          let isLiked = false;
          if (userId) {
            const liked = await db
              .select()
              .from(likes)
              .where(
                and(
                  eq(likes.userId, userId),
                  eq(likes.postId, reel.id),
                  eq(likes.reactionType, "like")
                )
              )
              .limit(1);
            isLiked = liked.length > 0;
          }
          return {
            ...reel,
            user: {
              id: user.id,
              name: user.name || user.email?.split("@")[0] || "User",
              username: user.username || user.email?.split("@")[0] || "user",
              avatar: user.avatar || "/uploads/default-avatar.jpg",
            },
            isLiked,
          };
        })
      );

      return reelsWithUser;
    } catch (error) {
      console.error("Get reels error:", error);
      return [];
    }
  }

  async createReel(data: any): Promise<any> {
    try {
      console.log("Creating reel with data:", data);
      
      const insertData: InsertReel = {
        userId: data.userId,
        videoUrl: data.videoUrl,
        thumbnailUrl: data.videoUrl.replace(".mp4", "-thumb.jpg"),
        caption: data.caption,
        duration: data.duration || 30,
        privacy: data.privacy || "public",
        musicId: data.musicId || null,
        effects: Array.isArray(data.effects) ? data.effects : [],
      };

      console.log("Insert data for reel:", insertData);

      const [reel] = await db.insert(reels).values(insertData).returning();
      console.log("Reel inserted to database:", reel);

      const user = await this.getUser(data.userId);
      console.log("User data for reel:", user);

      const reelWithUser = {
        ...reel,
        user: {
          id: data.userId,
          name: user?.name || user?.email?.split("@")[0] || "User",
          username: user?.username || user?.email?.split("@")[0] || "user",
          avatar: user?.avatar || "/uploads/default-avatar.jpg",
        },
        music: data.musicId
          ? {
              id: data.musicId,
              title: "Selected Track",
              artist: "Music Library",
            }
          : null,
        isLiked: false,
      };

      console.log("Reel saved to database:", reel.id);
      return reelWithUser;
    } catch (error) {
      console.error("❌ Create reel error details:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      console.error("Data that caused error:", data);
      throw error;
    }
  }

  async getReelById(reelId: number): Promise<any | undefined> {
    try {
      const result = await db
        .select({ reel: reels, user: users })
        .from(reels)
        .innerJoin(users, eq(reels.userId, users.id))
        .where(eq(reels.id, reelId))
        .limit(1);
      if (result.length === 0) return undefined;
      const { reel, user } = result[0] as any;
      // Determine isLiked for current session not available here; return false by default
      return {
        ...reel,
        user: {
          id: user.id,
          name: user.name || user.email?.split("@")[0] || "User",
          username: user.username || user.email?.split("@")[0] || "user",
          avatar: user.avatar || "/uploads/default-avatar.jpg",
        },
        isLiked: false,
      };
    } catch (error) {
      console.error("Get reel by id error:", error);
      return undefined;
    }
  }

  async incrementReelView(reelId: number): Promise<void> {
    try {
      await db
        .update(reels)
        .set({ viewsCount: sql`${reels.viewsCount} + 1` })
        .where(eq(reels.id, reelId));
    } catch (error) {
      console.error("Increment reel view error:", error);
      throw error;
    }
  }

  async createReelComment(
    reelId: number,
    userId: number,
    content: string,
    imageUrl?: string | null,
    gifUrl?: string | null,
    mediaType?: string | null
  ): Promise<any> {
    try {
      const [comment] = await db
        .insert(comments)
        .values({ 
          postId: reelId, 
          userId, 
          content,
          imageUrl: imageUrl || null,
          gifUrl: gifUrl || null,
          mediaType: mediaType || null
        })
        .returning();
      await db
        .update(reels)
        .set({ commentsCount: sql`${reels.commentsCount} + 1` })
        .where(eq(reels.id, reelId));
      return comment;
    } catch (error) {
      console.error("Create reel comment error:", error);
      throw error;
    }
  }

  async getReelComments(reelId: number): Promise<(Comment & { user: User })[]> {
    try {
      const result = await db
        .select({ comment: comments, user: users })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.postId, reelId))
        .orderBy(asc(comments.createdAt));
      return result.map(({ comment, user }) => ({ ...comment, user }));
    } catch (error) {
      console.error("Get reel comments error:", error);
      return [];
    }
  }

  async updateReelComment(
    id: number, 
    content: string, 
    imageUrl?: string | null, 
    gifUrl?: string | null, 
    mediaType?: string | null
  ): Promise<Comment | undefined> {
    const [row] = await db
      .update(comments)
      .set({ 
        content,
        imageUrl: imageUrl || null,
        gifUrl: gifUrl || null,
        mediaType: mediaType || null
      })
      .where(eq(comments.id, id))
      .returning();
    return row;
  }

  async deleteReelComment(id: number): Promise<boolean> {
    const result = await db.delete(comments).where(eq(comments.id, id));
    return result.rowCount! > 0;
  }
  async saveReel(userId: number, reelId: number): Promise<void> {
    try {
      await db
        .insert(savedPosts)
        .values({ userId, postId: reelId })
        .onConflictDoNothing();
    } catch (error) {
      console.error("Save reel error:", error);
      throw error;
    }
  }

  async shareReel(reelId: number, platform?: string): Promise<void> {
    try {
      await db
        .update(reels)
        .set({ sharesCount: sql`${reels.sharesCount} + 1` })
        .where(eq(reels.id, reelId));
    } catch (error) {
      console.error("Share reel error:", error);
      throw error;
    }
  }

  async deleteReel(reelId: number, userId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(reels)
        .where(and(eq(reels.id, reelId), eq(reels.userId, userId)));
      return result.rowCount! > 0;
    } catch (error) {
      console.error("Delete reel error:", error);
      return false;
    }
  }
  async toggleReelLike(reelId: number, userId: number): Promise<boolean> {
    try {
      // Check if user already liked this reel
      const [existingLike] = await db
        .select()
        .from(likes)
        .where(
          and(
            eq(likes.userId, userId),
            eq(likes.postId, reelId), // Using postId for reels too
            eq(likes.reactionType, "like")
          )
        )
        .limit(1);

      if (existingLike) {
        // Unlike the reel
        await db
          .delete(likes)
          .where(
            and(
              eq(likes.userId, userId),
              eq(likes.postId, reelId),
              eq(likes.reactionType, "like")
            )
          );

        // Decrease likes count in reels table if it exists
        try {
          await db
            .update(reels)
            .set({ likesCount: sql`${reels.likesCount} - 1` })
            .where(eq(reels.id, reelId));
        } catch (e) {
          // Reels table might not exist yet, ignore error
        }

        return false; // Now unliked
      } else {
        // Like the reel
        await db.insert(likes).values({
          userId,
          postId: reelId,
          reactionType: "like",
          createdAt: new Date(),
        });

        // Increase likes count in reels table if it exists
        try {
          await db
            .update(reels)
            .set({ likesCount: sql`${reels.likesCount} + 1` })
            .where(eq(reels.id, reelId));
        } catch (e) {
          // Reels table might not exist yet, ignore error
        }

        return true; // Now liked
      }
    } catch (error) {
      console.error("Toggle reel like error:", error);
      throw error;
    }
  }

  async getReelMusic(): Promise<any[]> {
    try {
      return [
        {
          id: 1,
          title: "Trending Beat",
          artist: "Music Library",
          duration: 30,
          category: "trending",
        },
        {
          id: 2,
          title: "Chill Vibes",
          artist: "Music Library",
          duration: 45,
          category: "chill",
        },
        {
          id: 3,
          title: "Upbeat Energy",
          artist: "Music Library",
          duration: 60,
          category: "energetic",
        },
        {
          id: 4,
          title: "Acoustic Dreams",
          artist: "Music Library",
          duration: 90,
          category: "acoustic",
        },
        {
          id: 5,
          title: "Electronic Pulse",
          artist: "Music Library",
          duration: 30,
          category: "electronic",
        },
      ];
    } catch (error) {
      console.error("Get reel music error:", error);
      return [];
    }
  }

  // ========== STATUS METHODS ==========

  async getStatusUpdates(userId?: number): Promise<any[]> {
    try {
      const now = new Date();
      const result = await db
        .select({ status: statusUpdates, user: users })
        .from(statusUpdates)
        .innerJoin(users, eq(statusUpdates.userId, users.id))
        .where(gt(statusUpdates.expiresAt, now))
        .orderBy(desc(statusUpdates.createdAt));

      return result.map(({ status, user }) => ({
        ...status,
        user: {
          id: user.id,
          name: user.name || user.email?.split("@")[0] || "User",
          username: user.username || user.email?.split("@")[0] || "user",
          avatar: user.avatar || "/uploads/default-avatar.jpg",
        },
        hasViewed: false,
      }));
    } catch (error) {
      console.error("Get status updates error:", error);
      return [];
    }
  }

  async createStatusUpdate(data: any): Promise<any> {
    try {
      const insertData = {
        userId: data.userId,
        type: data.type,
        content: data.content,
        mediaUrl: data.mediaUrl,
        backgroundColor: data.backgroundColor,
        fontStyle: data.fontStyle,
        pollOptions: data.pollOptions || null,
        pollVotes:
          data.pollVotes ||
          (data.pollOptions
            ? new Array(data.pollOptions.length).fill(0)
            : null),
        question: data.question,
        privacy: data.privacy || "public",
        viewsCount: 0,
        reactionsCount: 0,
        expiresAt:
          data.expiresAt instanceof Date
            ? data.expiresAt
            : new Date(data.expiresAt),
        isHighlighted: false,
        highlightCategory: null,
      } as any;

      const [created] = await db
        .insert(statusUpdates)
        .values(insertData)
        .returning();

      const user = await this.getUser(data.userId);
      return {
        ...created,
        user: {
          id: data.userId,
          name: user?.name || user?.email?.split("@")[0] || "User",
          username: user?.username || user?.email?.split("@")[0] || "user",
          avatar: user?.avatar || "/uploads/default-avatar.jpg",
        },
        hasViewed: false,
      };
    } catch (error) {
      console.error("Create status update error:", error);
      throw error;
    }
  }

  async getStatusById(statusId: number): Promise<any | undefined> {
    try {
      return this.inMemoryStatuses.find((s) => s.id === statusId);
    } catch (error) {
      console.error("Get status by id error:", error);
      return undefined;
    }
  }

  async markStatusViewed(statusId: number, userId: number): Promise<void> {
    try {
      await db
        .update(statusUpdates)
        .set({ viewsCount: sql`${statusUpdates.viewsCount} + 1` })
        .where(eq(statusUpdates.id, statusId));
    } catch (error) {
      console.error("Mark status viewed error:", error);
      throw error;
    }
  }

  async reactToStatus(
    statusId: number,
    userId: number,
    reaction: string
  ): Promise<any> {
    try {
      await db
        .update(statusUpdates)
        .set({ reactionsCount: sql`${statusUpdates.reactionsCount} + 1` })
        .where(eq(statusUpdates.id, statusId));

      const [row] = await db
        .select({ count: statusUpdates.reactionsCount })
        .from(statusUpdates)
        .where(eq(statusUpdates.id, statusId));

      return { success: true, reaction, reactionCount: row?.count ?? 0 };
    } catch (error) {
      console.error("React to status error:", error);
      throw error;
    }
  }

  async updateStatusUpdate(
    statusId: number,
    userId: number,
    updates: Partial<{
      content: string | null;
      backgroundColor: string | null;
      fontStyle: string | null;
      privacy: string;
      isHighlighted: boolean;
      highlightCategory: string | null;
      pollOptions: string[] | null;
      pollVotes: number[] | null;
      question: string | null;
      mediaUrl: string | null;
    }>
  ): Promise<any> {
    try {
      const idx = this.inMemoryStatuses.findIndex((x) => x.id === statusId);
      if (idx === -1) return null;
      const s = this.inMemoryStatuses[idx];
      if (s.userId !== userId) return null;
      const updated = { ...s, ...updates, updatedAt: new Date().toISOString() };
      this.inMemoryStatuses[idx] = updated;
      return updated;
    } catch (error) {
      console.error("Update status error:", error);
      throw error;
    }
  }

  async deleteStatusUpdate(statusId: number, userId: number): Promise<boolean> {
    try {
      const before = this.inMemoryStatuses.length;
      this.inMemoryStatuses = this.inMemoryStatuses.filter(
        (s) => !(s.id === statusId && s.userId === userId)
      );
      return this.inMemoryStatuses.length < before;
    } catch (error) {
      console.error("Delete status error:", error);
      return false;
    }
  }

  async voteOnStatusPoll(
    statusId: number,
    userId: number,
    optionIndex: number
  ): Promise<any> {
    try {
      const s = this.inMemoryStatuses.find((x) => x.id === statusId);
      if (!s || !Array.isArray(s.pollVotes)) return { success: false };
      if (!s.pollVoters) s.pollVoters = new Map<number, number>();
      if (s.pollVoters.has(userId)) {
        // change vote: decrement old
        const prev = s.pollVoters.get(userId)!;
        s.pollVotes[prev] = Math.max(0, (s.pollVotes[prev] || 0) - 1);
      }
      s.pollVotes[optionIndex] = (s.pollVotes[optionIndex] || 0) + 1;
      s.pollVoters.set(userId, optionIndex);
      return { success: true, pollVotes: s.pollVotes };
    } catch (error) {
      console.error("Vote on status poll error:", error);
      throw error;
    }
  }

  async updateStatusUpdate(
    statusId: number,
    userId: number,
    updates: Partial<{
      content: string | null;
      backgroundColor: string | null;
      fontStyle: string | null;
      privacy: string;
      isHighlighted: boolean;
      highlightCategory: string | null;
      pollOptions: string[] | null;
      pollVotes: number[] | null;
      question: string | null;
      mediaUrl: string | null;
    }>
  ): Promise<any> {
    try {
      // Mock: return merged object with provided updates
      return {
        id: statusId,
        userId,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Update status error:", error);
      throw error;
    }
  }

  async deleteStatusUpdate(statusId: number, userId: number): Promise<boolean> {
    try {
      console.log(`Deleting status ${statusId} by user ${userId}`);
      return true;
    } catch (error) {
      console.error("Delete status error:", error);
      return false;
    }
  }

  async voteOnStatusPoll(
    statusId: number,
    userId: number,
    optionIndex: number
  ): Promise<any> {
    try {
      return {
        success: true,
        statusId,
        userId,
        optionIndex,
        pollVotes: [],
      };
    } catch (error) {
      console.error("Vote on status poll error:", error);
      throw error;
    }
  }

  // ========== GROUP EVENTS METHODS ==========

  async getGroupEvents(groupId: number) {
    const result = await db
      .select({ event: groupEvents, creator: users, group: communityGroups })
      .from(groupEvents)
      .innerJoin(users, eq(groupEvents.creatorId, users.id))
      .innerJoin(communityGroups, eq(groupEvents.groupId, communityGroups.id))
      .where(eq(groupEvents.groupId, groupId))
      .orderBy(desc(groupEvents.eventDate));
    return result.map(({ event, creator, group }) => ({ ...event, creator, group }));
  }

  async createGroupEvent(data: InsertGroupEvent) {
    const [ev] = await db.insert(groupEvents).values(data).returning();
    return ev;
  }

  async updateGroupEvent(eventId: number, updates: Partial<InsertGroupEvent>) {
    const [ev] = await db.update(groupEvents).set(updates).where(eq(groupEvents.id, eventId)).returning();
    return ev;
  }

  async deleteGroupEvent(eventId: number) {
    await db.delete(groupEvents).where(eq(groupEvents.id, eventId));
  }

  async rsvpGroupEvent(
    eventId: number,
    userId: number,
    status: string
  ): Promise<any> {
    try {
      return {
        success: true,
        eventId: eventId,
        userId: userId,
        status: status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("RSVP group event error:", error);
      throw error;
    }
  }

  async uploadGroupFile(data: any): Promise<GroupFile> {
    const [file] = await db
      .insert(groupFiles)
      .values({
        groupId: data.groupId,
        uploaderId: data.uploaderId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileType: data.fileType || 'document',
        fileSize: data.fileSize || 0,
        description: data.description || null,
      })
      .returning();
    return file;
  }

  async getGroupFiles(groupId: number): Promise<(GroupFile & { uploader: User })[]> {
    const rows = await db
      .select({ file: groupFiles, uploader: users })
      .from(groupFiles)
      .innerJoin(users, eq(groupFiles.uploaderId, users.id))
      .where(eq(groupFiles.groupId, groupId))
      .orderBy(desc(groupFiles.createdAt));
    return rows.map(({ file, uploader }) => ({ ...file, uploader }));
  }

  async updateGroupFile(fileId: number, updates: Partial<typeof groupFiles.$inferInsert>): Promise<GroupFile> {
    const [f] = await db
      .update(groupFiles)
      .set({
        fileName: (updates as any)?.fileName,
        fileUrl: (updates as any)?.fileUrl,
        description: (updates as any)?.description,
        fileType: (updates as any)?.fileType,
        fileSize: (updates as any)?.fileSize,
      })
      .where(eq(groupFiles.id, fileId))
      .returning();
    return f as any;
  }

  async deleteGroupFile(fileId: number): Promise<void> {
    await db.delete(groupFiles).where(eq(groupFiles.id, fileId));
  }

  // Friend Request Methods
  async createFriendRequest(data: {
    senderId: number;
    receiverId: number;
    message?: string | null;
  }): Promise<any> {
    try {
      const result = await db
        .insert(friendRequests)
        .values({
          senderId: data.senderId,
          receiverId: data.receiverId,
          message: data.message || null,
          status: "pending",
          createdAt: new Date(),
        })
        .returning();

      const request = result[0];

      // Get sender and receiver details
      const [sender, receiver] = await Promise.all([
        this.getUserById(data.senderId),
        this.getUserById(data.receiverId),
      ]);

      return {
        ...request,
        sender: {
          id: sender?.id,
          name: sender?.name,
          username: sender?.username,
          avatar: sender?.avatar,
        },
        receiver: {
          id: receiver?.id,
          name: receiver?.name,
          username: receiver?.username,
          avatar: receiver?.avatar,
        },
      };
    } catch (error) {
      console.error("Create friend request error:", error);
      throw error;
    }
  }

  async getFriendRequest(senderId: number, receiverId: number): Promise<any> {
    try {
      const result = await db
        .select()
        .from(friendRequests)
        .where(
          and(
            eq(friendRequests.senderId, senderId),
            eq(friendRequests.receiverId, receiverId),
            eq(friendRequests.status, "pending")
          )
        )
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error("Get friend request error:", error);
      return null;
    }
  }

  async getFriendRequestById(requestId: number): Promise<any> {
    try {
      const result = await db
        .select()
        .from(friendRequests)
        .where(eq(friendRequests.id, requestId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error("Get friend request by ID error:", error);
      return null;
    }
  }

  async getReceivedFriendRequests(userId: number): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: friendRequests.id,
          senderId: friendRequests.senderId,
          receiverId: friendRequests.receiverId,
          message: friendRequests.message,
          status: friendRequests.status,
          createdAt: friendRequests.createdAt,
          respondedAt: friendRequests.respondedAt,
          senderName: users.name,
          senderUsername: users.username,
          senderAvatar: users.avatar,
        })
        .from(friendRequests)
        .innerJoin(users, eq(friendRequests.senderId, users.id))
        .where(
          and(
            eq(friendRequests.receiverId, userId),
            eq(friendRequests.status, "pending")
          )
        )
        .orderBy(desc(friendRequests.createdAt));

      return result.map((row) => ({
        id: row.id,
        senderId: row.senderId,
        receiverId: row.receiverId,
        message: row.message,
        status: row.status,
        createdAt: row.createdAt,
        respondedAt: row.respondedAt,
        sender: {
          id: row.senderId,
          name: row.senderName,
          username: row.senderUsername,
          avatar: row.senderAvatar,
        },
        receiver: {
          id: row.receiverId,
          name: "Current User",
          username: "current_user",
          avatar: null,
        },
      }));
    } catch (error) {
      console.error("Get received friend requests error:", error);
      return [];
    }
  }

  async getSentFriendRequests(userId: number): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: friendRequests.id,
          senderId: friendRequests.senderId,
          receiverId: friendRequests.receiverId,
          message: friendRequests.message,
          status: friendRequests.status,
          createdAt: friendRequests.createdAt,
          respondedAt: friendRequests.respondedAt,
          receiverName: users.name,
          receiverUsername: users.username,
          receiverAvatar: users.avatar,
        })
        .from(friendRequests)
        .innerJoin(users, eq(friendRequests.receiverId, users.id))
        .where(
          and(
            eq(friendRequests.senderId, userId),
            eq(friendRequests.status, "pending")
          )
        )
        .orderBy(desc(friendRequests.createdAt));

      return result.map((row) => ({
        id: row.id,
        senderId: row.senderId,
        receiverId: row.receiverId,
        message: row.message,
        status: row.status,
        createdAt: row.createdAt,
        respondedAt: row.respondedAt,
        sender: {
          id: row.senderId,
          name: "Current User",
          username: "current_user",
          avatar: null,
        },
        receiver: {
          id: row.receiverId,
          name: row.receiverName,
          username: row.receiverUsername,
          avatar: row.receiverAvatar,
        },
      }));
    } catch (error) {
      console.error("Get sent friend requests error:", error);
      return [];
    }
  }

  async updateFriendRequestStatus(
    requestId: number,
    status: string
  ): Promise<void> {
    try {
      await db
        .update(friendRequests)
        .set({
          status,
          respondedAt: new Date(),
        })
        .where(eq(friendRequests.id, requestId));
    } catch (error) {
      console.error("Update friend request status error:", error);
      throw error;
    }
  }

  async deleteFriendRequest(requestId: number): Promise<void> {
    try {
      await db.delete(friendRequests).where(eq(friendRequests.id, requestId));
    } catch (error) {
      console.error("Delete friend request error:", error);
      throw error;
    }
  }

  // Friendship Methods
  async createFriendship(data: {
    user1Id: number;
    user2Id: number;
    closeFriend?: boolean;
  }): Promise<any> {
    try {
      // Ensure consistent ordering (smaller ID first)
      const [user1Id, user2Id] =
        data.user1Id < data.user2Id
          ? [data.user1Id, data.user2Id]
          : [data.user2Id, data.user1Id];

      const result = await db
        .insert(friendships)
        .values({
          user1Id,
          user2Id,
          closeFriend: data.closeFriend || false,
          createdAt: new Date(),
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error("Create friendship error:", error);
      throw error;
    }
  }

  async getFriendship(user1Id: number, user2Id: number): Promise<any> {
    try {
      // Check both possible orderings
      const [result1, result2] = await Promise.all([
        db
          .select()
          .from(friendships)
          .where(
            and(
              eq(friendships.user1Id, user1Id),
              eq(friendships.user2Id, user2Id)
            )
          )
          .limit(1),
        db
          .select()
          .from(friendships)
          .where(
            and(
              eq(friendships.user1Id, user2Id),
              eq(friendships.user2Id, user1Id)
            )
          )
          .limit(1),
      ]);

      return result1[0] || result2[0] || null;
    } catch (error) {
      console.error("Get friendship error:", error);
      return null;
    }
  }

  async getUserFriends(userId: number): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          avatar: users.avatar,
          bio: users.bio,
        })
        .from(friendships)
        .innerJoin(
          users,
          or(
            and(
              eq(friendships.user1Id, userId),
              eq(friendships.user2Id, users.id)
            ),
            and(
              eq(friendships.user2Id, userId),
              eq(friendships.user1Id, users.id)
            )
          )
        )
        .where(ne(users.id, userId))
        .orderBy(users.name);

      return result;
    } catch (error) {
      console.error("Get user friends error:", error);
      return [];
    }
  }

  async deleteFriendship(friendshipId: number): Promise<void> {
    try {
      await db.delete(friendships).where(eq(friendships.id, friendshipId));
    } catch (error) {
      console.error("Delete friendship error:", error);
      throw error;
    }
  }

  async getFriendSuggestions(userId: number): Promise<any[]> {
    try {
      // Get users who are not already friends and not the current user
      const friends = await this.getUserFriends(userId);
      const friendIds = friends.map((f) => f.id);
      friendIds.push(userId);

      const result = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          avatar: users.avatar,
          bio: users.bio,
        })
        .from(users)
        .where(notInArray(users.id, friendIds))
        .orderBy(desc(users.createdAt))
        .limit(20);

      return result;
    } catch (error) {
      console.error("Get friend suggestions error:", error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
