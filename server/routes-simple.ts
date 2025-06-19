import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertOtpCodeSchema, 
  insertPostSchema,
  insertLikeSchema,
  insertCommentSchema,
  insertFollowSchema,
  insertStorySchema,
  insertMessageSchema,
  insertNotificationSchema,
  insertPostViewSchema 
} from "@shared/schema";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { uploadToS3, deleteFromS3, validateS3Config } from "./aws-s3";

// Extend session data interface
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    verifiedEmail?: string;
    otpId?: number;
    originalUserId?: number;
    isImpersonating?: boolean;
  }
}

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
});

// Generate 6-digit OTP
// Live stream viewer tracking
const liveStreamViewers = new Map<number, Set<string>>(); // streamId -> Set of viewer socket IDs

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Ensure uploads directory exists (fallback for local storage)
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for memory storage (for S3 uploads)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for cloud storage
  },
  fileFilter: (req, file, cb) => {
    // Accept images and videos
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

// Use single file upload with additional text fields
const uploadSingle = upload.single('media');



export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Serve uploaded files statically
  app.use('/uploads', express.static(uploadsDir));

  // Basic health check
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Test email configuration
  app.get("/api/test-email", async (req: Request, res: Response) => {
    try {
      await transporter.verify();
      res.json({ status: "Email service connected successfully" });
    } catch (error: any) {
      console.error("Email service test failed:", error);
      res.status(500).json({ 
        status: "Email service failed", 
        error: error.message,
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT 
      });
    }
  });

  // Test S3 configuration
  app.get("/api/test-s3", async (req: Request, res: Response) => {
    try {
      const isConfigured = validateS3Config();
      if (!isConfigured) {
        return res.status(500).json({ 
          status: "S3 configuration incomplete",
          message: "Missing required AWS environment variables",
          required: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "AWS_S3_BUCKET_NAME"]
        });
      }

      res.json({ 
        status: "S3 configuration valid",
        region: process.env.AWS_REGION,
        bucket: process.env.AWS_S3_BUCKET_NAME
      });
    } catch (error: any) {
      console.error("S3 configuration test failed:", error);
      res.status(500).json({ 
        status: "S3 configuration test failed", 
        error: error.message
      });
    }
  });

  // Auth endpoints (simplified for now)
  app.post("/api/auth/send-otp", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      
      await storage.createOtpCode({ email, code: otp, expiresAt });
      
      // Try to send OTP via email, fallback to console if email fails
      try {
        await transporter.sendMail({
          from: process.env.FROM_EMAIL,
          to: email,
          subject: "Your SocialConnect Login Code",
          text: `Your login code is: ${otp}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
              <h2 style="color: #333;">Your Login Code</h2>
              <p>Use this code to complete your login:</p>
              <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb;">${otp}</span>
              </div>
              <p style="color: #666;">This code will expire in 5 minutes.</p>
            </div>
          `,
        });
        console.log(`✓ Email sent successfully to ${email} - OTP: ${otp}`);
      } catch (emailError: any) {
        // Email failed, log OTP to console for development
        console.log(`\n--- EMAIL SERVICE UNAVAILABLE - Development Mode ---`);
        console.log(`Email: ${email}`);
        console.log(`OTP Code: ${otp}`);
        console.log(`Expires: ${expiresAt.toLocaleTimeString()}`);
        console.log(`Email error: ${emailError?.message || 'Unknown error'}\n`);
      }
      
      res.json({ message: "OTP sent successfully" });
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const { email, code, name, username, verificationToken } = req.body;
      
      // Handle new user registration completion with verification token
      if (name && username && verificationToken) {
        // Check if verification token is valid
        if (!global.verificationTokens) {
          global.verificationTokens = new Map();
        }
        
        const tokenData = global.verificationTokens.get(verificationToken);
        if (!tokenData || tokenData.expires < Date.now() || tokenData.email !== email) {
          return res.status(400).json({ message: "Invalid or expired verification token" });
        }
        
        // Create user with verified email
        const user = await storage.createUser({
          name,
          email,
          username,
          bio: null,
          avatar: null,
          coverPhoto: null,
          location: null,
          website: null,
          isVerified: false,
        });
        
        // Set session for persistent login
        req.session.userId = user.id;
        
        // Clean up verification token
        global.verificationTokens.delete(verificationToken);
        
        return res.json({ user, isNewUser: true });
      }
      
      // Find valid OTP code for initial verification
      const validOtp = await storage.getValidOtpCode(email, code);
      if (!validOtp) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Check if this is the super admin email
        const isAdminEmail = email === 'kaushlendra.k12@fms.edu';
        
        if (isAdminEmail) {
          // Create admin user directly without needing details
          const adminUser = await storage.createUser({
            email,
            name: 'Super Admin',
            username: 'superadmin',
            role: 'super_admin',
            isSuperAdmin: true,
            canDelete: true,
            isVerified: true,
          });
          
          await storage.markOtpCodeUsed(validOtp.id);
          req.session.userId = adminUser.id;
          
          return res.json({ 
            user: adminUser, 
            isNewUser: false,
            isAdmin: true,
            redirectTo: '/admin'
          });
        } else {
          // New user flow - initial verification
          // Generate a temporary verification token for completing registration
          const verificationToken = Math.random().toString(36).substring(2, 15);
          
          // Store verification token temporarily
          if (!global.verificationTokens) {
            global.verificationTokens = new Map();
          }
          global.verificationTokens.set(verificationToken, { 
            email, 
            verified: true,
            expires: Date.now() + 5 * 60 * 1000 // 5 minutes
          });
          
          await storage.markOtpCodeUsed(validOtp.id);
          
          return res.json({ 
            isNewUser: true, 
            needsDetails: true,
            verificationToken
          });
        }
      } else {
        // Returning user - mark OTP as used and login
        await storage.markOtpCodeUsed(validOtp.id);
        req.session.userId = user.id;
        
        const isAdmin = user.role === 'admin' || user.role === 'super_admin';
        
        return res.json({ 
          user, 
          isNewUser: false,
          isAdmin,
          redirectTo: isAdmin ? '/admin' : '/feed'
        });
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  // Authentication check endpoint
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.json({ user: null });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.userId = undefined;
        return res.json({ user: null });
      }

      // Include impersonation information
      const response: any = { user };
      
      if (req.session.isImpersonating && req.session.originalUserId) {
        const originalAdmin = await storage.getUser(req.session.originalUserId);
        response.impersonation = {
          isImpersonating: true,
          originalAdmin: originalAdmin
        };
      }

      res.json(response);
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Failed to check authentication" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ message: "Failed to logout" });
        }
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  // Posts endpoints
  app.get("/api/posts", async (req: Request, res: Response) => {
    try {
      const filterUserId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const currentUserId = req.session.userId; // Pass current user for reactions
      
      const posts = await storage.getPosts(filterUserId, limit, offset, currentUserId);
      res.json(posts);
    } catch (error) {
      console.error("Get posts error:", error);
      res.status(500).json({ error: "Failed to get posts" });
    }
  });

  app.get("/api/posts/:id", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      res.json(post);
    } catch (error) {
      console.error("Get post error:", error);
      res.status(500).json({ message: "Failed to get post" });
    }
  });

  app.post("/api/posts", uploadSingle, async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }


      let postData = {
        userId: req.session.userId,
        content: req.body.content || null,
        imageUrl: null as string | null,
        videoUrl: null as string | null,
        liveStreamId: req.body.liveStreamId ? parseInt(req.body.liveStreamId) : null,
        privacy: req.body.privacy || "public",
      };
      
      console.log('Post data before creation:', postData);

      // Handle file upload to S3
      if (req.file) {
        try {
          // Check if S3 is configured
          if (!validateS3Config()) {
            return res.status(500).json({ error: "AWS S3 not configured properly" });
          }

          const fileExtension = path.extname(req.file.originalname);
          const isVideo = /\.(mp4|mov|avi|mkv)$/i.test(fileExtension);
          const folder = isVideo ? 'videos' : 'images';
          
          // Upload to S3
          const uploadResult = await uploadToS3(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            folder
          );
          
          // Set the appropriate URL based on file type
          if (isVideo) {
            postData.videoUrl = uploadResult.url;
          } else {
            postData.imageUrl = uploadResult.url;
          }
          
          console.log('File uploaded to S3:', uploadResult.url);
        } catch (uploadError) {
          console.error("S3 upload error:", uploadError);
          return res.status(500).json({ error: "Failed to upload file to cloud storage" });
        }
      }

      const post = await storage.createPost(postData);
      const postWithUser = await storage.getPost(post.id);
      
      res.json(postWithUser);
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // React to post endpoint (supports multiple emoji reactions)
  app.post("/api/posts/:id/react", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const postId = parseInt(req.params.id);
      const userId = req.session.userId;
      const { reactionType } = req.body;

      // Validate reaction type
      const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];
      if (!validReactions.includes(reactionType)) {
        return res.status(400).json({ message: "Invalid reaction type" });
      }

      // Check if user already reacted to this post
      const userLikes = await storage.getUserLikes(userId);
      const existingReaction = userLikes.find(like => like.postId === postId);

      if (existingReaction) {
        if (existingReaction.reactionType === reactionType) {
          // Same reaction - remove it (toggle off)
          await storage.deleteLike(userId, postId);
          res.json({ reacted: false, reactionType: null });
        } else {
          // Different reaction - update it
          await storage.updateLike(userId, postId, reactionType);
          res.json({ reacted: true, reactionType });
        }
      } else {
        // New reaction
        await storage.createLike({ userId, postId, reactionType });
        res.json({ reacted: true, reactionType });
      }
    } catch (error) {
      console.error("React to post error:", error);
      res.status(500).json({ message: "Failed to react to post" });
    }
  });

  // Legacy like endpoint (for backward compatibility)
  app.post("/api/posts/:id/like", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const postId = parseInt(req.params.id);
      const userId = req.session.userId;

      // Check if already liked
      const userLikes = await storage.getUserLikes(userId);
      const alreadyLiked = userLikes.some(like => like.postId === postId);

      if (alreadyLiked) {
        await storage.deleteLike(userId, postId);
        res.json({ liked: false });
      } else {
        await storage.createLike({ userId, postId, reactionType: 'like' });
        res.json({ liked: true });
      }
    } catch (error) {
      console.error("Like post error:", error);
      res.status(500).json({ message: "Failed to like post" });
    }
  });

  // Update post endpoint
  app.put("/api/posts/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const postId = parseInt(req.params.id);
      const { content } = req.body;

      // Get the post to check ownership
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (post.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to edit this post" });
      }

      const updatedPost = await storage.updatePost(postId, { content });
      if (!updatedPost) {
        return res.status(500).json({ message: "Failed to update post" });
      }

      const postWithUser = await storage.getPost(postId);
      res.json(postWithUser);
    } catch (error) {
      console.error("Update post error:", error);
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  // Delete post endpoint
  app.delete("/api/posts/:id", async (req: Request, res: Response) => {
    try {
      console.log(`DELETE request for post ${req.params.id} from user ${req.session.userId}`);
      
      if (!req.session.userId) {
        console.log("Delete post: Not authenticated");
        return res.status(401).json({ message: "Not authenticated" });
      }

      const postId = parseInt(req.params.id);
      console.log(`Deleting post ${postId} for user ${req.session.userId}`);
      
      // Get the post to check ownership
      const post = await storage.getPost(postId);
      if (!post) {
        console.log(`Post ${postId} not found`);
        return res.status(404).json({ message: "Post not found" });
      }

      if (post.userId !== req.session.userId) {
        console.log(`User ${req.session.userId} not authorized to delete post ${postId} owned by ${post.userId}`);
        return res.status(403).json({ message: "Not authorized to delete this post" });
      }

      const success = await storage.deletePost(postId);
      console.log(`Delete post ${postId} result:`, success);
      
      if (success) {
        res.status(200).json({ message: "Post deleted successfully", success: true });
      } else {
        res.status(500).json({ message: "Failed to delete post" });
      }
    } catch (error) {
      console.error("Delete post error:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  // Comments endpoints
  app.get("/api/posts/:id/comments", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const comments = await storage.getPostComments(postId);
      res.json(comments);
    } catch (error) {
      console.error("Get comments error:", error);
      res.status(500).json({ message: "Failed to get comments" });
    }
  });

  app.post("/api/posts/:id/comments", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const postId = parseInt(req.params.id);
      const { content, parentCommentId } = req.body;

      const comment = await storage.createComment({
        userId: req.session.userId,
        postId,
        content,
        parentCommentId: parentCommentId || null,
      });

      res.json(comment);
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Get replies for a comment
  app.get("/api/comments/:id/replies", async (req: Request, res: Response) => {
    try {
      const commentId = parseInt(req.params.id);
      const replies = await storage.getCommentReplies(commentId);
      res.json(replies);
    } catch (error) {
      console.error("Get replies error:", error);
      res.status(500).json({ message: "Failed to get replies" });
    }
  });

  // Update comment
  app.put("/api/comments/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const commentId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content?.trim()) {
        return res.status(400).json({ message: "Content is required" });
      }

      const comment = await storage.updateComment(commentId, content.trim());
      
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      res.json(comment);
    } catch (error) {
      console.error("Update comment error:", error);
      res.status(500).json({ message: "Failed to update comment" });
    }
  });

  // Delete comment
  app.delete("/api/comments/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const commentId = parseInt(req.params.id);
      const success = await storage.deleteComment(commentId);
      
      if (!success) {
        return res.status(404).json({ message: "Comment not found" });
      }

      res.json({ message: "Comment deleted" });
    } catch (error) {
      console.error("Delete comment error:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Like/unlike comment
  app.post("/api/comments/:id/like", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const commentId = parseInt(req.params.id);
      const userId = req.session.userId;

      // Check if user already liked this comment
      const existingLikes = await storage.getCommentLikes(commentId);
      const userLike = existingLikes.find(like => like.userId === userId);

      if (userLike) {
        // Unlike
        await storage.deleteCommentLike(userId, commentId);
        res.json({ message: "Comment unliked" });
      } else {
        // Like
        await storage.createCommentLike({ userId, commentId });
        res.json({ message: "Comment liked" });
      }
    } catch (error) {
      console.error("Like comment error:", error);
      res.status(500).json({ message: "Failed to like comment" });
    }
  });

  // Stories endpoints
  app.get("/api/stories", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const stories = await storage.getActiveStories(userId);
      res.json(stories);
    } catch (error) {
      console.error("Get stories error:", error);
      res.status(500).json({ message: "Failed to get stories" });
    }
  });

  app.post("/api/stories", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { text, imageUrl, videoUrl } = req.body;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const story = await storage.createStory({
        userId: req.session.userId,
        text: text || null,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        expiresAt,
      });

      res.json(story);
    } catch (error) {
      console.error("Create story error:", error);
      res.status(500).json({ message: "Failed to create story" });
    }
  });

  // Post view tracking endpoint
  app.post("/api/posts/:id/view", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const viewerId = req.session.userId || null;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Record the view
      await storage.recordPostView({
        postId,
        viewerId,
        ipAddress,
        userAgent,
      });

      // Increment the view count
      await storage.incrementPostViewCount(postId);

      res.json({ success: true });
    } catch (error) {
      console.error("Record post view error:", error);
      res.status(500).json({ message: "Failed to record view" });
    }
  });

  // Get post views count
  app.get("/api/posts/:id/views", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const viewCount = await storage.getPostViews(postId);
      res.json({ views: viewCount });
    } catch (error) {
      console.error("Get post views error:", error);
      res.status(500).json({ message: "Failed to get views" });
    }
  });

  // Search endpoint
  app.get("/api/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      const type = req.query.type as string || 'all';

      if (!query?.trim()) {
        return res.json({ users: [], posts: [] });
      }

      let users: any[] = [];
      let posts: any[] = [];

      if (type === 'all' || type === 'users') {
        users = await storage.searchUsers(query);
      }

      if (type === 'all' || type === 'posts') {
        posts = await storage.searchPosts(query);
      }

      res.json({ users, posts });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Failed to search" });
    }
  });

  // Users endpoints
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (query) {
        const users = await storage.searchUsers(query);
        res.json(users);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Search users error:", error);
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  // Get specific user
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Update user profile
  app.put("/api/users/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userId = parseInt(req.params.id);
      
      // Users can only update their own profile
      if (userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const updatedUser = await storage.updateUser(userId, req.body);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Follow/unfollow user
  app.post("/api/users/:id/follow", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const followingId = parseInt(req.params.id);
      const followerId = req.session.userId;

      if (followingId === followerId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      // Check if already following
      const isFollowing = await storage.isFollowing(followerId, followingId);

      if (isFollowing) {
        // Unfollow
        await storage.deleteFollow(followerId, followingId);
        res.json({ following: false, message: "Unfollowed successfully" });
      } else {
        // Follow
        await storage.createFollow({ followerId, followingId });
        
        // Create notification
        await storage.createNotification({
          userId: followingId,
          fromUserId: followerId,
          type: 'follow'
        });
        
        res.json({ following: true, message: "Following successfully" });
      }
    } catch (error) {
      console.error("Follow user error:", error);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  // Get user followers
  app.get("/api/users/:id/followers", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const followers = await storage.getFollowers(userId);
      res.json(followers);
    } catch (error) {
      console.error("Get followers error:", error);
      res.status(500).json({ message: "Failed to get followers" });
    }
  });

  // Get user following
  app.get("/api/users/:id/following", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const following = await storage.getFollowing(userId);
      res.json(following);
    } catch (error) {
      console.error("Get following error:", error);
      res.status(500).json({ message: "Failed to get following" });
    }
  });

  // Notifications endpoints
  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const notifications = await storage.getUserNotifications(req.session.userId);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.post("/api/notifications/:id/read", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const notificationId = parseInt(req.params.id);
      await storage.markNotificationRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Messages endpoints
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const conversations = await storage.getConversations(req.session.userId);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ message: "Failed to get conversations" });
    }
  });

  app.get("/api/conversations/:userId", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const otherUserId = parseInt(req.params.userId);
      const messages = await storage.getConversation(req.session.userId, otherUserId);
      res.json(messages);
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({ message: "Failed to get conversation" });
    }
  });

  app.post("/api/messages", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { receiverId, content } = req.body;

      const message = await storage.createMessage({
        senderId: req.session.userId,
        receiverId,
        content,
      });

      res.json(message);
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Enhanced search endpoint with comprehensive results
  app.get("/api/search", async (req: Request, res: Response) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return res.json({ users: [], posts: [] });
      }

      const [users, posts] = await Promise.all([
        storage.searchUsers(q.trim()),
        storage.searchPosts(q.trim())
      ]);

      res.json({ users, posts });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      await storage.markAllNotificationsRead(req.session.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ message: "Failed to mark notifications as read" });
    }
  });

  // Cover photo upload endpoint
  app.post("/api/users/:id/cover-photo", upload.single('coverPhoto'), async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userId = parseInt(req.params.id);
      if (userId !== req.session.userId) {
        return res.status(403).json({ message: "Can only update own cover photo" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Check if S3 is configured
      if (!validateS3Config()) {
        return res.status(500).json({ error: "AWS S3 not configured properly" });
      }

      // Upload to S3
      const uploadResult = await uploadToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'cover-photos'
      );
      
      // Update user's cover photo in database
      const updatedUser = await storage.updateUser(userId, { coverPhoto: uploadResult.url });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        message: "Cover photo updated successfully",
        coverPhoto: uploadResult.url,
        user: updatedUser
      });
    } catch (error) {
      console.error("Cover photo upload error:", error);
      res.status(500).json({ message: "Failed to upload cover photo" });
    }
  });

  // Profile picture upload endpoint
  app.post("/api/users/:id/profile-picture", upload.single('profilePicture'), async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userId = parseInt(req.params.id);
      if (userId !== req.session.userId) {
        return res.status(403).json({ message: "Can only update own profile picture" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Check if S3 is configured
      if (!validateS3Config()) {
        return res.status(500).json({ error: "AWS S3 not configured properly" });
      }

      // Upload to S3
      const uploadResult = await uploadToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'profile-pictures'
      );
      
      // Update user's avatar in database
      const updatedUser = await storage.updateUser(userId, { avatar: uploadResult.url });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        message: "Profile picture updated successfully",
        avatar: uploadResult.url,
        user: updatedUser
      });
    } catch (error) {
      console.error("Profile picture upload error:", error);
      res.status(500).json({ message: "Failed to upload profile picture" });
    }
  });

  // User data export endpoint
  app.get("/api/user/export", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userId = req.session.userId;
      
      // Get user data
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's posts
      const posts = await storage.getPosts(userId);
      
      // Get user's comments
      const comments = await storage.getPostComments(0); // This needs to be updated to get user comments
      
      // Get user's likes
      const likes = await storage.getUserLikes(userId);
      
      // Get user's followers
      const followers = await storage.getFollowers(userId);
      
      // Get user's following
      const following = await storage.getFollowing(userId);

      const exportData = {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          bio: user.bio,
          website: user.website,
          location: user.location,
          createdAt: user.createdAt
        },
        posts: posts.map(post => ({
          id: post.id,
          content: post.content,
          mediaUrl: post.mediaUrl,
          createdAt: post.createdAt
        })),
        likes: likes.map(like => ({
          postId: like.postId,
          reactionType: like.reactionType,
          createdAt: like.createdAt
        })),
        followers: followers.map(f => ({ username: f.username, name: f.name })),
        following: following.map(f => ({ username: f.username, name: f.name })),
        exportDate: new Date().toISOString()
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${user.username}-data-export.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Data export error:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // User data usage endpoint
  app.get("/api/user/data-usage", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userId = req.session.userId;
      
      // Get user's posts count
      const posts = await storage.getPosts(userId);
      const postsCount = posts.length;
      
      // Get user's comments count (approximation since we don't have a direct method)
      const commentsCount = 0; // This would need proper implementation
      
      // Calculate storage usage (approximation)
      let storageUsed = 0;
      posts.forEach(post => {
        if (post.mediaUrl) {
          storageUsed += 1; // Approximate 1MB per media file
        }
      });

      res.json({
        postsCount,
        commentsCount,
        storageUsed: `${storageUsed} MB`,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Data usage error:", error);
      res.status(500).json({ message: "Failed to get data usage" });
    }
  });

  // Create event endpoint
  app.post("/api/events", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { title, description, eventDate, eventTime, location, maxAttendees } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({ message: "Event title is required" });
      }

      // For now, we'll just return a success response since we don't have event storage implemented
      // In a real implementation, you would save this to a database
      const eventData = {
        id: Date.now(),
        title,
        description,
        eventDate,
        eventTime,
        location,
        maxAttendees,
        createdBy: req.session.userId,
        createdAt: new Date().toISOString()
      };

      res.status(201).json({
        message: "Event created successfully",
        event: eventData
      });
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // Create room endpoint
  app.post("/api/rooms", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { name, description, privacy, maxMembers } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ message: "Room name is required" });
      }

      // For now, we'll just return a success response since we don't have room storage implemented
      // In a real implementation, you would save this to a database
      const roomData = {
        id: Date.now(),
        name,
        description,
        privacy,
        maxMembers,
        createdBy: req.session.userId,
        members: [req.session.userId],
        createdAt: new Date().toISOString()
      };

      res.status(201).json({
        message: "Room created successfully",
        room: roomData
      });
    } catch (error) {
      console.error("Create room error:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  // Admin endpoints
  app.get("/api/admin/stats", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get platform statistics
      const totalUsers = await storage.getTotalUsers();
      const totalPosts = await storage.getTotalPosts();
      const totalComments = await storage.getTotalComments();
      const activeUsersToday = await storage.getActiveUsersToday();

      res.json({
        totalUsers,
        totalPosts,
        totalComments,
        activeUsersToday
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Failed to get admin stats" });
    }
  });

  app.get("/api/admin/users", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;

      const users = await storage.getAllUsersAdmin(page, limit, search);
      res.json(users);
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.delete("/api/admin/users/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const adminUser = await storage.getUser(req.session.userId);
      if (!adminUser || !adminUser.canDelete) {
        return res.status(403).json({ message: "Delete permission required" });
      }

      const targetUserId = parseInt(req.params.id);
      const targetUser = await storage.getUser(targetUserId);

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Super admins cannot be deleted
      if (targetUser.isSuperAdmin) {
        return res.status(403).json({ message: "Super admin cannot be deleted" });
      }

      const success = await storage.deleteUserAdmin(targetUserId);
      if (success) {
        res.json({ message: "User deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete user" });
      }
    } catch (error) {
      console.error("Admin delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.put("/api/admin/users/:id/role", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const adminUser = await storage.getUser(req.session.userId);
      if (!adminUser || adminUser.role !== 'super_admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const targetUserId = parseInt(req.params.id);
      const { role, canDelete } = req.body;

      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Cannot modify super admin role
      if (targetUser.isSuperAdmin) {
        return res.status(403).json({ message: "Cannot modify super admin" });
      }

      const updatedUser = await storage.updateUser(targetUserId, {
        role,
        canDelete: canDelete || false
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Admin update role error:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.get("/api/admin/posts", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const posts = await storage.getAllPostsAdmin(page, limit);
      res.json(posts);
    } catch (error) {
      console.error("Admin posts error:", error);
      res.status(500).json({ message: "Failed to get posts" });
    }
  });

  app.delete("/api/admin/posts/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const adminUser = await storage.getUser(req.session.userId);
      if (!adminUser || !adminUser.canDelete) {
        return res.status(403).json({ message: "Delete permission required" });
      }

      const postId = parseInt(req.params.id);
      const success = await storage.deletePost(postId);

      if (success) {
        res.json({ message: "Post deleted successfully" });
      } else {
        res.status(404).json({ message: "Post not found" });
      }
    } catch (error) {
      console.error("Admin delete post error:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  app.delete("/api/admin/posts/bulk-delete", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const adminUser = await storage.getUser(req.session.userId);
      if (!adminUser || !adminUser.canDelete) {
        return res.status(403).json({ message: "Delete permission required" });
      }

      const { postIds } = req.body;
      if (!Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).json({ message: "Post IDs array is required" });
      }

      let deletedCount = 0;
      for (const postId of postIds) {
        const success = await storage.deletePost(parseInt(postId));
        if (success) {
          deletedCount++;
        }
      }

      res.json({ 
        message: `${deletedCount} posts deleted successfully`,
        deletedCount,
        totalRequested: postIds.length
      });
    } catch (error) {
      console.error("Admin bulk delete posts error:", error);
      res.status(500).json({ message: "Failed to delete posts" });
    }
  });

  // Impersonation endpoints
  app.post("/api/admin/impersonate/:userId", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const adminUser = await storage.getUser(req.session.userId);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'super_admin')) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const targetUserId = parseInt(req.params.userId);
      const targetUser = await storage.getUser(targetUserId);
      
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Store the original admin user ID for later restoration
      req.session.originalUserId = req.session.userId;
      req.session.userId = targetUserId;
      req.session.isImpersonating = true;

      res.json({ 
        message: "Impersonation started", 
        user: targetUser,
        originalAdmin: adminUser 
      });
    } catch (error: any) {
      console.error("Impersonation error:", error);
      res.status(500).json({ error: "Failed to start impersonation" });
    }
  });

  app.post("/api/admin/stop-impersonation", async (req: Request, res: Response) => {
    if (!req.session.originalUserId || !req.session.isImpersonating) {
      return res.status(400).json({ error: "Not currently impersonating" });
    }

    try {
      const originalUserId = req.session.originalUserId;
      const originalUser = await storage.getUser(originalUserId);
      
      if (!originalUser) {
        return res.status(404).json({ error: "Original admin user not found" });
      }

      // Restore the original admin session
      req.session.userId = originalUserId;
      delete req.session.originalUserId;
      delete req.session.isImpersonating;

      res.json({ 
        message: "Impersonation stopped", 
        user: originalUser 
      });
    } catch (error: any) {
      console.error("Stop impersonation error:", error);
      res.status(500).json({ error: "Failed to stop impersonation" });
    }
  });

  // Live streams endpoints
  app.post("/api/live-streams", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { title, description, privacy } = req.body;
      
      if (!title || title.trim().length === 0) {
        return res.status(400).json({ message: "Title is required" });
      }

      const liveStream = await storage.createLiveStream({
        userId: req.session.userId,
        title: title.trim(),
        description: description?.trim() || null,
        privacy: privacy || "public"
      });

      res.json(liveStream);
    } catch (error) {
      console.error("Create live stream error:", error);
      res.status(500).json({ message: "Failed to create live stream" });
    }
  });

  app.get("/api/live-streams", async (req: Request, res: Response) => {
    try {
      const activeStreams = await storage.getActiveLiveStreams();
      res.json(activeStreams);
    } catch (error) {
      console.error("Get live streams error:", error);
      res.status(500).json({ message: "Failed to get live streams" });
    }
  });

  app.put("/api/live-streams/:id/end", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const streamId = parseInt(req.params.id);
      const success = await storage.endLiveStream(streamId, req.session.userId);
      
      if (!success) {
        return res.status(404).json({ message: "Live stream not found or not authorized" });
      }

      // Clean up viewers when stream ends
      liveStreamViewers.delete(streamId);

      res.json({ message: "Live stream ended successfully" });
    } catch (error) {
      console.error("End live stream error:", error);
      res.status(500).json({ message: "Failed to end live stream" });
    }
  });

  // Get viewer count for a live stream
  app.get("/api/live-streams/:id/viewers", async (req: Request, res: Response) => {
    try {
      const streamId = parseInt(req.params.id);
      const viewers = liveStreamViewers.get(streamId);
      const viewerCount = viewers ? viewers.size : 0;
      
      res.json({ viewerCount });
    } catch (error) {
      console.error("Get viewer count error:", error);
      res.status(500).json({ message: "Failed to get viewer count" });
    }
  });

  // Set up WebSocket server for real-time viewer tracking
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    let currentStreamId: number | null = null;
    let socketId: string = Math.random().toString(36).substring(7);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'join_stream') {
          const streamId = parseInt(data.streamId);
          
          // Leave previous stream if any
          if (currentStreamId && liveStreamViewers.has(currentStreamId)) {
            const viewers = liveStreamViewers.get(currentStreamId)!;
            viewers.delete(socketId);
            
            // Broadcast updated viewer count to all viewers of previous stream
            broadcastViewerCount(currentStreamId);
          }
          
          // Join new stream
          currentStreamId = streamId;
          if (!liveStreamViewers.has(streamId)) {
            liveStreamViewers.set(streamId, new Set());
          }
          liveStreamViewers.get(streamId)!.add(socketId);
          
          // Broadcast updated viewer count
          broadcastViewerCount(streamId);
        }
        
        if (data.type === 'leave_stream') {
          if (currentStreamId && liveStreamViewers.has(currentStreamId)) {
            const viewers = liveStreamViewers.get(currentStreamId)!;
            viewers.delete(socketId);
            broadcastViewerCount(currentStreamId);
            currentStreamId = null;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Remove viewer when connection closes
      if (currentStreamId && liveStreamViewers.has(currentStreamId)) {
        const viewers = liveStreamViewers.get(currentStreamId)!;
        viewers.delete(socketId);
        broadcastViewerCount(currentStreamId);
      }
    });
  });

  function broadcastViewerCount(streamId: number) {
    const viewers = liveStreamViewers.get(streamId);
    const viewerCount = viewers ? viewers.size : 0;
    
    // Broadcast to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'viewer_count_update',
          streamId,
          viewerCount
        }));
      }
    });
  }

  return httpServer;
}