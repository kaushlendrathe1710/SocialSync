import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  bio: text("bio"),
  avatar: text("avatar"),
  coverPhoto: text("cover_photo"),
  location: text("location"),
  website: text("website"),
  isVerified: boolean("is_verified").default(false),
  role: text("role").default("user"), // user, admin, super_admin
  isSuperAdmin: boolean("is_super_admin").default(false),
  canDelete: boolean("can_delete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  liveStreamId: integer("live_stream_id"), // Reference to live stream
  privacy: text("privacy").default("public"), // public, friends, private
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  sharesCount: integer("shares_count").default(0),
  viewsCount: integer("views_count").default(0),
  expiresAt: timestamp("expires_at"), // For time-limited posts
  createdAt: timestamp("created_at").defaultNow(),
});

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  postId: integer("post_id").notNull(),
  reactionType: text("reaction_type").default("like"), // like, love, laugh, wow, sad, angry
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  postId: integer("post_id").notNull(),
  parentCommentId: integer("parent_comment_id"), // For nested comments
  content: text("content").notNull(),
  likesCount: integer("likes_count").default(0),
  repliesCount: integer("replies_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const savedPosts = pgTable("saved_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  postId: integer("post_id").notNull(),
  collectionId: integer("collection_id"), // optional collection grouping
  createdAt: timestamp("created_at").defaultNow(),
});

export const commentReactions = pgTable("comment_reactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  commentId: integer("comment_id").notNull(),
  reactionType: text("reaction_type").default("like"), // like, love, laugh, wow, sad, angry
  createdAt: timestamp("created_at").defaultNow(),
});

export const commentLikes = pgTable("comment_likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  commentId: integer("comment_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull(),
  followingId: integer("following_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  text: text("text"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // like, comment, follow, message
  fromUserId: integer("from_user_id").notNull(),
  postId: integer("post_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const liveStreams = pgTable("live_streams", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  privacy: text("privacy").default("public"), // public, friends, private
  isActive: boolean("is_active").default(true),
  viewerCount: integer("viewer_count").default(0),
  streamUrl: text("stream_url"),
  thumbnailUrl: text("thumbnail_url"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postViews = pgTable("post_views", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  viewerId: integer("viewer_id"), // nullable for anonymous views
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// Friend Request System
export const friendRequests = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  status: text("status").default("pending"), // pending, accepted, declined
  message: text("message"), // optional message with request
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").notNull(),
  user2Id: integer("user2_id").notNull(),
  closeFriend: boolean("close_friend").default(false), // for story privacy
  createdAt: timestamp("created_at").defaultNow(),
});

// Privacy & Safety Features
export const privacySettings = pgTable("privacy_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  profileVisibility: text("profile_visibility").default("public"), // public, friends, private
  messagePermission: text("message_permission").default("everyone"), // everyone, friends, none
  storyVisibility: text("story_visibility").default("friends"), // public, friends, close_friends
  phoneDiscovery: boolean("phone_discovery").default(true),
  emailDiscovery: boolean("email_discovery").default(true),
  locationSharing: boolean("location_sharing").default(false),
  onlineStatus: boolean("online_status").default(true),
  readReceipts: boolean("read_receipts").default(true),
  screenshotNotifications: boolean("screenshot_notifications").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const blockedUsers = pgTable("blocked_users", {
  id: serial("id").primaryKey(),
  blockerId: integer("blocker_id").notNull(),
  blockedId: integer("blocked_id").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Community Features
export const communityGroups = pgTable("community_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // beauty, wellness, career, motherhood, etc.
  privacy: text("privacy").default("public"), // public, private, request_to_join
  coverImage: text("cover_image"),
  creatorId: integer("creator_id").notNull(),
  memberCount: integer("member_count").default(0),
  isVerified: boolean("is_verified").default(false),
  tags: text("tags").array(), // for searchability
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupMemberships = pgTable("group_memberships", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").default("member"), // member, admin, moderator
  status: text("status").default("active"), // active, pending, banned
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const groupPosts = pgTable("group_posts", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  isPinned: boolean("is_pinned").default(false),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wellness Features
export const wellnessTracking = pgTable("wellness_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  moodRating: integer("mood_rating"), // 1-5 scale
  energyLevel: integer("energy_level"), // 1-5 scale
  stressLevel: integer("stress_level"), // 1-5 scale
  sleepHours: integer("sleep_hours"),
  waterIntake: integer("water_intake"), // glasses
  exerciseMinutes: integer("exercise_minutes"),
  notes: text("notes"),
  isPrivate: boolean("is_private").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const habitTracking = pgTable("habit_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  frequency: text("frequency").default("daily"), // daily, weekly, monthly
  category: text("category"), // fitness, wellness, beauty, career
  targetValue: integer("target_value"), // for quantifiable habits
  unit: text("unit"), // minutes, glasses, pages, etc.
  isActive: boolean("is_active").default(true),
  streakCount: integer("streak_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const habitLogs = pgTable("habit_logs", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  completed: boolean("completed").default(false),
  value: integer("value"), // for quantifiable habits
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Beauty & Lifestyle Features
export const beautyProducts = pgTable("beauty_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  category: text("category").notNull(), // skincare, makeup, hair, fragrance
  price: integer("price"), // in cents
  description: text("description"),
  imageUrl: text("image_url"),
  averageRating: integer("average_rating").default(0), // 1-5 scale * 100
  reviewCount: integer("review_count").default(0),
  ingredients: text("ingredients").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productReviews = pgTable("product_reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  userId: integer("user_id").notNull(),
  rating: integer("rating").notNull(), // 1-5 scale
  title: text("title"),
  content: text("content"),
  imageUrls: text("image_urls").array(),
  skinType: text("skin_type"), // oily, dry, combination, sensitive
  ageRange: text("age_range"), // 18-25, 26-35, etc.
  isVerifiedPurchase: boolean("is_verified_purchase").default(false),
  helpfulCount: integer("helpful_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wishlists = pgTable("wishlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  isShared: boolean("is_shared").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  wishlistId: integer("wishlist_id").notNull(),
  productId: integer("product_id"),
  customName: text("custom_name"), // for items not in product database
  customPrice: integer("custom_price"),
  customUrl: text("custom_url"),
  priority: text("priority").default("medium"), // high, medium, low
  notes: text("notes"),
  isPurchased: boolean("is_purchased").default(false),
  purchasedAt: timestamp("purchased_at"),
  addedAt: timestamp("added_at").defaultNow(),
});

// Social Shopping Features
export const shoppingPosts = pgTable("shopping_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content"),
  imageUrl: text("image_url"),
  productIds: integer("product_ids").array(),
  outfitTags: text("outfit_tags").array(),
  occasion: text("occasion"), // casual, work, party, date
  season: text("season"), // spring, summer, fall, winter
  budget: text("budget"), // budget, mid-range, luxury
  likesCount: integer("likes_count").default(0),
  savesCount: integer("saves_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Event Planning Features
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull(), // party, meetup, workshop, etc.
  location: text("location"),
  virtualLink: text("virtual_link"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  maxAttendees: integer("max_attendees"),
  currentAttendees: integer("current_attendees").default(0),
  isPrivate: boolean("is_private").default(false),
  requiresApproval: boolean("requires_approval").default(false),
  coverImage: text("cover_image"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventAttendees = pgTable("event_attendees", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").default("going"), // going, interested, not_going, pending
  responseDate: timestamp("response_date").defaultNow(),
  notes: text("notes"),
});

// Mentorship Features
export const mentorProfiles = pgTable("mentor_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  expertise: text("expertise").array(), // areas of expertise
  industry: text("industry"),
  yearsExperience: integer("years_experience"),
  bio: text("bio"),
  hourlyRate: integer("hourly_rate"), // in cents, optional
  availability: text("availability"), // JSON string of available times
  isActive: boolean("is_active").default(true),
  rating: integer("rating").default(0), // average rating * 100
  sessionCount: integer("session_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mentorshipRequests = pgTable("mentorship_requests", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull(),
  menteeId: integer("mentee_id").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").default("pending"), // pending, accepted, declined
  preferredDate: timestamp("preferred_date"),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes).omit({
  id: true,
  createdAt: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  likesCount: true,
  commentsCount: true,
  sharesCount: true,
  viewsCount: true,
});

export const insertLikeSchema = createInsertSchema(likes).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  likesCount: true,
  repliesCount: true,
});

export const insertCommentReactionSchema = createInsertSchema(commentReactions).omit({
  id: true,
  createdAt: true,
});

export const insertCommentLikeSchema = createInsertSchema(commentLikes).omit({
  id: true,
  createdAt: true,
});

export const insertFollowSchema = createInsertSchema(follows).omit({
  id: true,
  createdAt: true,
});

export const insertStorySchema = createInsertSchema(stories).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertLiveStreamSchema = createInsertSchema(liveStreams).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  isActive: true,
  viewerCount: true,
});

export const insertPostViewSchema = createInsertSchema(postViews).omit({
  id: true,
  viewedAt: true,
});

// Insert schemas for new tables
export const insertFriendRequestSchema = createInsertSchema(friendRequests).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
});

export const insertFriendshipSchema = createInsertSchema(friendships).omit({
  id: true,
  createdAt: true,
});

export const insertPrivacySettingsSchema = createInsertSchema(privacySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBlockedUserSchema = createInsertSchema(blockedUsers).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityGroupSchema = createInsertSchema(communityGroups).omit({
  id: true,
  createdAt: true,
  memberCount: true,
});

export const insertGroupMembershipSchema = createInsertSchema(groupMemberships).omit({
  id: true,
  joinedAt: true,
});

export const insertGroupPostSchema = createInsertSchema(groupPosts).omit({
  id: true,
  createdAt: true,
  likesCount: true,
  commentsCount: true,
});

export const insertWellnessTrackingSchema = createInsertSchema(wellnessTracking).omit({
  id: true,
  createdAt: true,
});

export const insertHabitTrackingSchema = createInsertSchema(habitTracking).omit({
  id: true,
  createdAt: true,
});

export const insertHabitLogSchema = createInsertSchema(habitLogs).omit({
  id: true,
  createdAt: true,
});

export const insertBeautyProductSchema = createInsertSchema(beautyProducts).omit({
  id: true,
  createdAt: true,
  averageRating: true,
  reviewCount: true,
});

export const insertProductReviewSchema = createInsertSchema(productReviews).omit({
  id: true,
  createdAt: true,
  helpfulCount: true,
});

export const insertWishlistSchema = createInsertSchema(wishlists).omit({
  id: true,
  createdAt: true,
});

export const insertWishlistItemSchema = createInsertSchema(wishlistItems).omit({
  id: true,
  addedAt: true,
  purchasedAt: true,
});

export const insertShoppingPostSchema = createInsertSchema(shoppingPosts).omit({
  id: true,
  createdAt: true,
  likesCount: true,
  savesCount: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  currentAttendees: true,
});

export const insertEventAttendeeSchema = createInsertSchema(eventAttendees).omit({
  id: true,
  responseDate: true,
});

export const insertMentorProfileSchema = createInsertSchema(mentorProfiles).omit({
  id: true,
  createdAt: true,
  rating: true,
  sessionCount: true,
});

export const insertMentorshipRequestSchema = createInsertSchema(mentorshipRequests).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type Like = typeof likes.$inferSelect;
export type InsertLike = z.infer<typeof insertLikeSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type CommentReaction = typeof commentReactions.$inferSelect;
export type InsertCommentReaction = z.infer<typeof insertCommentReactionSchema>;

export type CommentLike = typeof commentLikes.$inferSelect;
export type InsertCommentLike = z.infer<typeof insertCommentLikeSchema>;

export type Follow = typeof follows.$inferSelect;
export type InsertFollow = z.infer<typeof insertFollowSchema>;

export type Story = typeof stories.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type LiveStream = typeof liveStreams.$inferSelect;
export type InsertLiveStream = z.infer<typeof insertLiveStreamSchema>;

export type PostView = typeof postViews.$inferSelect;
export type InsertPostView = z.infer<typeof insertPostViewSchema>;

// New table types
export type FriendRequest = typeof friendRequests.$inferSelect;
export type InsertFriendRequest = z.infer<typeof insertFriendRequestSchema>;

export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;

export type PrivacySettings = typeof privacySettings.$inferSelect;
export type InsertPrivacySettings = z.infer<typeof insertPrivacySettingsSchema>;

export type BlockedUser = typeof blockedUsers.$inferSelect;
export type InsertBlockedUser = z.infer<typeof insertBlockedUserSchema>;

export type CommunityGroup = typeof communityGroups.$inferSelect;
export type InsertCommunityGroup = z.infer<typeof insertCommunityGroupSchema>;

export type GroupMembership = typeof groupMemberships.$inferSelect;
export type InsertGroupMembership = z.infer<typeof insertGroupMembershipSchema>;

export type GroupPost = typeof groupPosts.$inferSelect;
export type InsertGroupPost = z.infer<typeof insertGroupPostSchema>;

export type WellnessTracking = typeof wellnessTracking.$inferSelect;
export type InsertWellnessTracking = z.infer<typeof insertWellnessTrackingSchema>;

export type HabitTracking = typeof habitTracking.$inferSelect;
export type InsertHabitTracking = z.infer<typeof insertHabitTrackingSchema>;

export type HabitLog = typeof habitLogs.$inferSelect;
export type InsertHabitLog = z.infer<typeof insertHabitLogSchema>;

export type BeautyProduct = typeof beautyProducts.$inferSelect;
export type InsertBeautyProduct = z.infer<typeof insertBeautyProductSchema>;

export type ProductReview = typeof productReviews.$inferSelect;
export type InsertProductReview = z.infer<typeof insertProductReviewSchema>;

export type Wishlist = typeof wishlists.$inferSelect;
export type InsertWishlist = z.infer<typeof insertWishlistSchema>;

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;

export type ShoppingPost = typeof shoppingPosts.$inferSelect;
export type InsertShoppingPost = z.infer<typeof insertShoppingPostSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type EventAttendee = typeof eventAttendees.$inferSelect;
export type InsertEventAttendee = z.infer<typeof insertEventAttendeeSchema>;

export type MentorProfile = typeof mentorProfiles.$inferSelect;
export type InsertMentorProfile = z.infer<typeof insertMentorProfileSchema>;

export type MentorshipRequest = typeof mentorshipRequests.$inferSelect;
export type InsertMentorshipRequest = z.infer<typeof insertMentorshipRequestSchema>;

// Extended types for API responses
export type CommentWithUser = Comment & {
  user: User;
  isLiked?: boolean;
  replies?: CommentWithUser[];
};

export type PostWithUser = Post & {
  user: User;
  isLiked?: boolean;
  userReaction?: string | null;
  comments?: CommentWithUser[];
};

export type MessageWithUser = Message & {
  sender: User;
  receiver: User;
};

export type NotificationWithUser = Notification & {
  fromUser: User;
  post?: Post;
};

export type FriendRequestWithUser = FriendRequest & {
  sender: User;
  receiver: User;
};

export type GroupWithDetails = CommunityGroup & {
  creator: User;
  membershipStatus?: string;
  isJoined?: boolean;
};

export type EventWithDetails = Event & {
  creator: User;
  attendeeStatus?: string;
  attendeeCount?: number;
};

export type WishlistWithItems = Wishlist & {
  items: (WishlistItem & { product?: BeautyProduct })[];
  user: User;
};

export type ProductWithReviews = BeautyProduct & {
  reviews?: (ProductReview & { user: User })[];
  userReview?: ProductReview;
};

export type MentorWithProfile = User & {
  mentorProfile: MentorProfile;
};

// Database relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  likes: many(likes),
  comments: many(comments),
  followers: many(follows, { relationName: "follower" }),
  following: many(follows, { relationName: "following" }),
  stories: many(stories),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  notifications: many(notifications),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  likes: many(likes),
  comments: many(comments),
  views: many(postViews),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  reactions: many(commentReactions),
}));

export const commentReactionsRelations = relations(commentReactions, ({ one }) => ({
  user: one(users, {
    fields: [commentReactions.userId],
    references: [users.id],
  }),
  comment: one(comments, {
    fields: [commentReactions.commentId],
    references: [comments.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

export const storiesRelations = relations(stories, ({ one }) => ({
  user: one(users, {
    fields: [stories.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  fromUser: one(users, {
    fields: [notifications.fromUserId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [notifications.postId],
    references: [posts.id],
  }),
}));

export const postViewsRelations = relations(postViews, ({ one }) => ({
  post: one(posts, {
    fields: [postViews.postId],
    references: [posts.id],
  }),
  viewer: one(users, {
    fields: [postViews.viewerId],
    references: [users.id],
  }),
}));

// New table relations
export const friendRequestsRelations = relations(friendRequests, ({ one }) => ({
  sender: one(users, {
    fields: [friendRequests.senderId],
    references: [users.id],
    relationName: "friendRequestSender",
  }),
  receiver: one(users, {
    fields: [friendRequests.receiverId],
    references: [users.id],
    relationName: "friendRequestReceiver",
  }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user1: one(users, {
    fields: [friendships.user1Id],
    references: [users.id],
    relationName: "friendshipUser1",
  }),
  user2: one(users, {
    fields: [friendships.user2Id],
    references: [users.id],
    relationName: "friendshipUser2",
  }),
}));

export const privacySettingsRelations = relations(privacySettings, ({ one }) => ({
  user: one(users, {
    fields: [privacySettings.userId],
    references: [users.id],
  }),
}));

export const blockedUsersRelations = relations(blockedUsers, ({ one }) => ({
  blocker: one(users, {
    fields: [blockedUsers.blockerId],
    references: [users.id],
    relationName: "blocker",
  }),
  blocked: one(users, {
    fields: [blockedUsers.blockedId],
    references: [users.id],
    relationName: "blocked",
  }),
}));

export const communityGroupsRelations = relations(communityGroups, ({ one, many }) => ({
  creator: one(users, {
    fields: [communityGroups.creatorId],
    references: [users.id],
  }),
  memberships: many(groupMemberships),
  posts: many(groupPosts),
}));

export const groupMembershipsRelations = relations(groupMemberships, ({ one }) => ({
  group: one(communityGroups, {
    fields: [groupMemberships.groupId],
    references: [communityGroups.id],
  }),
  user: one(users, {
    fields: [groupMemberships.userId],
    references: [users.id],
  }),
}));

export const groupPostsRelations = relations(groupPosts, ({ one }) => ({
  group: one(communityGroups, {
    fields: [groupPosts.groupId],
    references: [communityGroups.id],
  }),
  user: one(users, {
    fields: [groupPosts.userId],
    references: [users.id],
  }),
}));

export const wellnessTrackingRelations = relations(wellnessTracking, ({ one }) => ({
  user: one(users, {
    fields: [wellnessTracking.userId],
    references: [users.id],
  }),
}));

export const habitTrackingRelations = relations(habitTracking, ({ one, many }) => ({
  user: one(users, {
    fields: [habitTracking.userId],
    references: [users.id],
  }),
  logs: many(habitLogs),
}));

export const habitLogsRelations = relations(habitLogs, ({ one }) => ({
  habit: one(habitTracking, {
    fields: [habitLogs.habitId],
    references: [habitTracking.id],
  }),
  user: one(users, {
    fields: [habitLogs.userId],
    references: [users.id],
  }),
}));

export const beautyProductsRelations = relations(beautyProducts, ({ many }) => ({
  reviews: many(productReviews),
  wishlistItems: many(wishlistItems),
}));

export const productReviewsRelations = relations(productReviews, ({ one }) => ({
  product: one(beautyProducts, {
    fields: [productReviews.productId],
    references: [beautyProducts.id],
  }),
  user: one(users, {
    fields: [productReviews.userId],
    references: [users.id],
  }),
}));

export const wishlistsRelations = relations(wishlists, ({ one, many }) => ({
  user: one(users, {
    fields: [wishlists.userId],
    references: [users.id],
  }),
  items: many(wishlistItems),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  wishlist: one(wishlists, {
    fields: [wishlistItems.wishlistId],
    references: [wishlists.id],
  }),
  product: one(beautyProducts, {
    fields: [wishlistItems.productId],
    references: [beautyProducts.id],
  }),
}));

export const shoppingPostsRelations = relations(shoppingPosts, ({ one }) => ({
  user: one(users, {
    fields: [shoppingPosts.userId],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, {
    fields: [events.creatorId],
    references: [users.id],
  }),
  attendees: many(eventAttendees),
}));

export const eventAttendeesRelations = relations(eventAttendees, ({ one }) => ({
  event: one(events, {
    fields: [eventAttendees.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventAttendees.userId],
    references: [users.id],
  }),
}));

export const mentorProfilesRelations = relations(mentorProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [mentorProfiles.userId],
    references: [users.id],
  }),
  mentorshipRequests: many(mentorshipRequests, { relationName: "mentorRequests" }),
}));

export const mentorshipRequestsRelations = relations(mentorshipRequests, ({ one }) => ({
  mentor: one(mentorProfiles, {
    fields: [mentorshipRequests.mentorId],
    references: [mentorProfiles.id],
    relationName: "mentorRequests",
  }),
  mentee: one(users, {
    fields: [mentorshipRequests.menteeId],
    references: [users.id],
  }),
}));
