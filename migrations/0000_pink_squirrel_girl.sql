CREATE TABLE "beauty_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"category" text NOT NULL,
	"price" integer,
	"description" text,
	"image_url" text,
	"average_rating" integer DEFAULT 0,
	"review_count" integer DEFAULT 0,
	"ingredients" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blocked_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"blocker_id" integer NOT NULL,
	"blocked_id" integer NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comment_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"comment_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comment_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"comment_id" integer NOT NULL,
	"reaction_type" text DEFAULT 'like',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"post_id" integer NOT NULL,
	"parent_comment_id" integer,
	"content" text NOT NULL,
	"image_url" text,
	"gif_url" text,
	"media_type" text,
	"likes_count" integer DEFAULT 0,
	"replies_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"privacy" text DEFAULT 'public',
	"cover_image" text,
	"creator_id" integer NOT NULL,
	"member_count" integer DEFAULT 0,
	"is_verified" boolean DEFAULT false,
	"tags" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_attendees" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'going',
	"response_date" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"event_type" text NOT NULL,
	"location" text,
	"virtual_link" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"max_attendees" integer,
	"current_attendees" integer DEFAULT 0,
	"is_private" boolean DEFAULT false,
	"requires_approval" boolean DEFAULT false,
	"cover_image" text,
	"tags" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"follower_id" integer NOT NULL,
	"following_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "friend_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" integer NOT NULL,
	"receiver_id" integer NOT NULL,
	"status" text DEFAULT 'pending',
	"message" text,
	"created_at" timestamp DEFAULT now(),
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" serial PRIMARY KEY NOT NULL,
	"user1_id" integer NOT NULL,
	"user2_id" integer NOT NULL,
	"close_friend" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"priority" text DEFAULT 'normal',
	"is_pinned" boolean DEFAULT true,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"color" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_event_attendees" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'going',
	"response_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"creator_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"event_date" timestamp NOT NULL,
	"end_date" timestamp,
	"location" text,
	"is_virtual" boolean DEFAULT false,
	"meeting_link" text,
	"max_attendees" integer,
	"current_attendees" integer DEFAULT 0,
	"cover_image" text,
	"is_recurring" boolean DEFAULT false,
	"recurring_pattern" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"uploader_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer,
	"description" text,
	"download_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member',
	"status" text DEFAULT 'active',
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text,
	"image_url" text,
	"video_url" text,
	"is_pinned" boolean DEFAULT false,
	"likes_count" integer DEFAULT 0,
	"comments_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "habit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"habit_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"completed" boolean DEFAULT false,
	"value" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "habit_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"frequency" text DEFAULT 'daily',
	"category" text,
	"target_value" integer,
	"unit" text,
	"is_active" boolean DEFAULT true,
	"streak_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"post_id" integer NOT NULL,
	"reaction_type" text DEFAULT 'like',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "live_stream_chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"stream_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"username" text NOT NULL,
	"user_avatar" text,
	"message" text NOT NULL,
	"message_type" text DEFAULT 'text',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "live_streams" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"privacy" text DEFAULT 'public',
	"is_active" boolean DEFAULT true,
	"viewer_count" integer DEFAULT 0,
	"stream_url" text,
	"thumbnail_url" text,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mentor_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expertise" text[],
	"industry" text,
	"years_experience" integer,
	"bio" text,
	"hourly_rate" integer,
	"availability" text,
	"is_active" boolean DEFAULT true,
	"rating" integer DEFAULT 0,
	"session_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mentorship_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"mentor_id" integer NOT NULL,
	"mentee_id" integer NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending',
	"preferred_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" integer NOT NULL,
	"receiver_id" integer NOT NULL,
	"content" text DEFAULT '',
	"image_url" text,
	"video_url" text,
	"audio_url" text,
	"file_type" text,
	"file_name" text,
	"file_size" integer,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"from_user_id" integer NOT NULL,
	"post_id" integer,
	"reaction_type" text,
	"metadata" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"viewer_id" integer,
	"ip_address" text,
	"user_agent" text,
	"viewed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"content" text,
	"image_url" text,
	"video_url" text,
	"live_stream_id" integer,
	"shared_post_id" integer,
	"privacy" text DEFAULT 'public',
	"likes_count" integer DEFAULT 0,
	"comments_count" integer DEFAULT 0,
	"shares_count" integer DEFAULT 0,
	"views_count" integer DEFAULT 0,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "privacy_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"profile_visibility" text DEFAULT 'public',
	"message_permission" text DEFAULT 'everyone',
	"story_visibility" text DEFAULT 'friends',
	"phone_discovery" boolean DEFAULT true,
	"email_discovery" boolean DEFAULT true,
	"location_sharing" boolean DEFAULT false,
	"online_status" boolean DEFAULT true,
	"read_receipts" boolean DEFAULT true,
	"screenshot_notifications" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"content" text,
	"image_urls" text[],
	"skin_type" text,
	"age_range" text,
	"is_verified_purchase" boolean DEFAULT false,
	"helpful_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reel_music" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"audio_url" text NOT NULL,
	"duration" integer NOT NULL,
	"category" text,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reels" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"caption" text,
	"music_id" integer,
	"effects" text[],
	"duration" integer NOT NULL,
	"privacy" text DEFAULT 'public',
	"likes_count" integer DEFAULT 0,
	"comments_count" integer DEFAULT 0,
	"shares_count" integer DEFAULT 0,
	"views_count" integer DEFAULT 0,
	"trending" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"post_id" integer NOT NULL,
	"collection_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shopping_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"content" text,
	"image_url" text,
	"product_ids" integer[],
	"outfit_tags" text[],
	"occasion" text,
	"season" text,
	"budget" text,
	"likes_count" integer DEFAULT 0,
	"saves_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "status_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"status_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reaction_type" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "status_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"content" text,
	"media_url" text,
	"background_color" text,
	"font_style" text,
	"poll_options" text[],
	"poll_votes" text[],
	"question" text,
	"privacy" text DEFAULT 'public',
	"viewers_ids" text[],
	"views_count" integer DEFAULT 0,
	"reactions_count" integer DEFAULT 0,
	"expires_at" timestamp NOT NULL,
	"is_highlighted" boolean DEFAULT false,
	"highlight_category" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "status_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"status_id" integer NOT NULL,
	"viewer_id" integer NOT NULL,
	"viewed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"image_url" text,
	"video_url" text,
	"text" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"bio" text,
	"avatar" text,
	"cover_photo" text,
	"location" text,
	"website" text,
	"is_verified" boolean DEFAULT false,
	"role" text DEFAULT 'user',
	"is_super_admin" boolean DEFAULT false,
	"can_delete" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "wellness_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"mood_rating" integer,
	"energy_level" integer,
	"stress_level" integer,
	"sleep_hours" integer,
	"water_intake" integer,
	"exercise_minutes" integer,
	"notes" text,
	"is_private" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"wishlist_id" integer NOT NULL,
	"product_id" integer,
	"custom_name" text,
	"custom_price" integer,
	"custom_url" text,
	"priority" text DEFAULT 'medium',
	"notes" text,
	"is_purchased" boolean DEFAULT false,
	"purchased_at" timestamp,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false,
	"is_shared" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
