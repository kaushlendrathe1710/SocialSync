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
  insertPostViewSchema,
  commentReactions,
  comments,
  likes,
  postViews
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
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
    deleteOtp?: string;
    deleteOtpExpiry?: number;
    deleteOtpVerified?: boolean;
  }
}

interface SessionData {
  userId?: number;
  verifiedEmail?: string;
  otpId?: number;
  originalUserId?: number;
  isImpersonating?: boolean;
  deleteOtp?: string;
  deleteOtpExpiry?: number;
  deleteOtpVerified?: boolean;
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

// Real-time messaging tracking
const connectedUsers = new Map<number, WebSocket[]>(); // userId -> WebSocket connections
const userSockets = new Map<WebSocket, number>(); // WebSocket -> userId

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via email
async function sendOtpEmail(email: string, otp: string, purpose: string = "Verification"): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: `Your SocialConnect ${purpose} Code`,
      text: `Your ${purpose.toLowerCase()} code is: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
          <h2 style="color: #333;">Your ${purpose} Code</h2>
          <p>Use this code to complete your ${purpose.toLowerCase()}:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb;">${otp}</span>
          </div>
          <p style="color: #666;">This code will expire in 10 minutes.</p>
          ${purpose === "Account Deletion" ? '<p style="color: #dc2626; font-weight: bold;">⚠️ This action is permanent and cannot be undone.</p>' : ''}
        </div>
      `,
    });
    console.log(`✓ ${purpose} email sent successfully to ${email} - OTP: ${otp}`);
  } catch (emailError: any) {
    console.log(`\n--- EMAIL SERVICE UNAVAILABLE - Development Mode ---`);
    console.log(`Email: ${email}`);
    console.log(`Purpose: ${purpose}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Copy this code to complete ${purpose.toLowerCase()}`);
    console.log(`--- End Development Mode ---\n`);
    
    // Don't throw error in development, just log
    if (process.env.NODE_ENV === 'production') {
      throw emailError;
    }
  }
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

  // Root health endpoint specifically for deployment checks
  app.get("/api/", (req: Request, res: Response) => {
    res.status(200).json({ status: "ok", service: "SocialConnect API" });
  });

  // Basic health check
  app.get("/api/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Alternative health check for deployment
  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "ok", service: "SocialConnect API" });
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

  // Test S3 configuration and upload
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

      // Test actual upload to S3
      let uploadTest = { success: false, error: null, url: null };
      try {
        const testContent = Buffer.from(`S3 test upload - ${new Date().toISOString()}`);
        const uploadResult = await uploadToS3(
          testContent,
          'test-upload.txt',
          'text/plain',
          'test'
        );
        
        uploadTest = {
          success: true,
          error: null,
          url: uploadResult.url
        } as any;
        
        console.log('S3 test upload successful:', uploadResult.url);
        
        // Clean up test file
        setTimeout(async () => {
          try {
            await deleteFromS3(uploadResult.key);
            console.log('S3 test file cleaned up');
          } catch (deleteError) {
            console.warn('Could not delete S3 test file:', deleteError);
          }
        }, 5000);
        
      } catch (uploadError: any) {
        console.error('S3 upload test failed:', uploadError);
        uploadTest = {
          success: false,
          error: uploadError.message,
          url: null
        };
      }

      res.json({ 
        status: uploadTest.success ? "S3 working correctly" : "S3 upload failed",
        configured: true,
        region: process.env.AWS_REGION,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        uploadTest
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
      const { email, otp, name, username, verificationToken } = req.body;
      const code = otp;
      
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

  // Public post endpoint (no authentication required)
  app.get("/api/posts/:id/public", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Get likes count and views count using SQL queries
      const likesResult = await db.select({ count: sql`count(*)` }).from(likes).where(eq(likes.postId, postId));
      const likesCount = Number(likesResult[0]?.count || 0);
      
      const viewsResult = await db.select({ count: sql`count(*)` }).from(postViews).where(eq(postViews.postId, postId));
      const viewsCount = Number(viewsResult[0]?.count || 0);

      // Return post with counts but without sensitive user data
      res.json({
        ...post,
        likesCount,
        viewsCount,
        user: {
          id: post.user.id,
          name: post.user.name,
          username: post.user.username,
          avatar: post.user.avatar
        }
      });
    } catch (error) {
      console.error("Get public post error:", error);
      res.status(500).json({ message: "Failed to get post" });
    }
  });

  // Public comments endpoint (no authentication required)
  app.get("/api/posts/:id/comments/public", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const comments = await storage.getPostComments(postId);
      
      // Return comments with limited user data
      const publicComments = comments.map(comment => ({
        ...comment,
        user: {
          id: comment.user.id,
          name: comment.user.name,
          username: comment.user.username,
          avatar: comment.user.avatar
        }
      }));

      res.json(publicComments);
    } catch (error) {
      console.error("Get public comments error:", error);
      res.status(500).json({ message: "Failed to get comments" });
    }
  });

  app.post("/api/posts", uploadSingle, async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }


      // Calculate expiration date based on duration
      let expiresAt = null;
      if (req.body.duration) {
        const now = new Date();
        switch (req.body.duration) {
          case '24h':
            expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            break;
          case '7d':
            expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case '1m':
            expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            break;
        }
      }

      let postData = {
        userId: req.session.userId,
        content: req.body.content || null,
        imageUrl: null as string | null,
        videoUrl: null as string | null,
        liveStreamId: req.body.liveStreamId ? parseInt(req.body.liveStreamId) : null,
        privacy: req.body.privacy || "public",
        expiresAt: expiresAt,
      };
      
      console.log('Post data before creation:', postData);

      // Handle file upload with S3 fallback to local storage
      if (req.file) {
        try {
          const fileExtension = path.extname(req.file.originalname);
          const isVideo = /\.(mp4|mov|avi|mkv)$/i.test(fileExtension);
          let fileUrl = null;

          // Try S3 upload first if configured
          if (validateS3Config()) {
            try {
              const folder = isVideo ? 'videos' : 'images';
              console.log('Attempting S3 upload:', {
                folder,
                filename: req.file.originalname,
                size: req.file.buffer.length,
                mimetype: req.file.mimetype
              });
              
              const uploadResult = await uploadToS3(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                folder
              );
              fileUrl = uploadResult.url;
              console.log('✓ File uploaded to S3 successfully:', fileUrl);
            } catch (s3Error) {
              console.error("✗ S3 upload failed:", s3Error);
              console.warn("Falling back to local storage");
              fileUrl = null; // Will trigger local storage fallback
            }
          } else {
            console.log('S3 not configured, using local storage');
          }

          // Fallback to local storage if S3 failed or not configured
          if (!fileUrl) {
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;
            const uploadsDir = path.join(process.cwd(), 'uploads');
            
            // Ensure uploads directory exists
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            const filePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(filePath, req.file.buffer);
            fileUrl = `/uploads/${fileName}`;
            console.log('File saved locally:', fileUrl);
          }
          
          // Set the appropriate URL based on file type
          if (isVideo) {
            postData.videoUrl = fileUrl;
          } else {
            postData.imageUrl = fileUrl;
          }
        } catch (uploadError) {
          console.error("File upload error:", uploadError);
          return res.status(500).json({ error: "Failed to upload file" });
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

      // Validate reaction type - includes all extended reactions
      const validReactions = [
        'like', 'love', 'laugh', 'wow', 'sad', 'angry',
        'heart_eyes', 'kiss', 'wink', 'cool', 'thinking', 'thumbs_down', 
        'clap', 'fire', 'party', 'shocked', 'confused', 'sleepy'
      ];
      if (!validReactions.includes(reactionType)) {
        return res.status(400).json({ message: "Invalid reaction type" });
      }

      // Check if user already reacted to this post
      const userLikes = await storage.getUserLikes(userId);
      const existingReaction = userLikes.find(like => like.postId === postId);

      // Get the post to find the author for notifications
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

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
        
        // Create notification for post author (if not reacting to own post)
        if (post.userId !== userId) {
          await storage.createNotification({
            userId: post.userId,
            type: 'like',
            fromUserId: userId,
            postId: postId,
            isRead: false,
          });
        }
        
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

  // Get post reactions with user names
  app.get("/api/posts/:id/reactions", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const reactions = await storage.getPostReactions(postId);
      res.json(reactions);
    } catch (error) {
      console.error("Get post reactions error:", error);
      res.status(500).json({ message: "Failed to get post reactions" });
    }
  });

  // Comments endpoints
  app.get("/api/posts/:id/comments", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      console.log("Getting comments for post", postId, "with userId", req.session.userId);
      const comments = await storage.getPostComments(postId, req.session.userId);
      console.log("Comments retrieved:", comments.map(c => ({ id: c.id, userReaction: c.userReaction })));
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

      // Get the post to find the author for notifications
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const comment = await storage.createComment({
        userId: req.session.userId,
        postId,
        content,
        parentCommentId: parentCommentId || null,
      });

      // Create notification for post author (if not commenting on own post)
      if (post.userId !== req.session.userId) {
        await storage.createNotification({
          userId: post.userId,
          type: 'comment',
          fromUserId: req.session.userId,
          postId: postId,
          isRead: false,
        });
      }

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
      const replies = await storage.getCommentReplies(commentId, req.session.userId);
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

  // React to comment endpoint (supports multiple emoji reactions)
  app.post("/api/comments/:id/react", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const commentId = parseInt(req.params.id);
      const userId = req.session.userId;
      const { reactionType } = req.body;

      // Validate reaction type
      const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];
      if (!validReactions.includes(reactionType)) {
        return res.status(400).json({ message: "Invalid reaction type" });
      }

      // Check if user already reacted to this comment
      const existingReaction = await db.select()
        .from(commentReactions)
        .where(and(
          eq(commentReactions.userId, userId),
          eq(commentReactions.commentId, commentId)
        ))
        .limit(1);

      if (existingReaction.length > 0) {
        const current = existingReaction[0];
        if (current.reactionType === reactionType) {
          // Remove reaction if clicking same reaction
          await db.delete(commentReactions)
            .where(and(
              eq(commentReactions.userId, userId),
              eq(commentReactions.commentId, commentId)
            ));
          
          // Update comment likes count
          await db.update(comments)
            .set({ likesCount: sql`${comments.likesCount} - 1` })
            .where(eq(comments.id, commentId));
          
          res.json({ reacted: false, reactionType: null });
        } else {
          // Update existing reaction
          await db.update(commentReactions)
            .set({ reactionType })
            .where(and(
              eq(commentReactions.userId, userId),
              eq(commentReactions.commentId, commentId)
            ));
          
          res.json({ reacted: true, reactionType });
        }
      } else {
        // Create new reaction
        await db.insert(commentReactions)
          .values({
            userId,
            commentId,
            reactionType
          });
        
        // Update comment likes count
        await db.update(comments)
          .set({ likesCount: sql`${comments.likesCount} + 1` })
          .where(eq(comments.id, commentId));
        
        res.json({ reacted: true, reactionType });
      }
    } catch (error) {
      console.error("Comment reaction error:", error);
      res.status(500).json({ message: "Failed to react to comment" });
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

  // Mark message as read endpoint
  app.post("/api/messages/:id/read", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const messageId = parseInt(req.params.id);
      await storage.markMessageAsRead(messageId, req.session.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark message read error:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  app.post("/api/messages", upload.array('files', 10), async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { receiverId, content } = req.body;
      const files = req.files as Express.Multer.File[];
      let imageUrls: string[] = [];

      // Handle multiple file uploads if present
      if (files && files.length > 0) {
        // Check if S3 is configured
        if (!validateS3Config()) {
          return res.status(500).json({ error: "AWS S3 not configured properly" });
        }

        // Upload all files to S3
        for (const file of files) {
          const uploadResult = await uploadToS3(
            file.buffer,
            file.originalname,
            file.mimetype,
            'message-attachments'
          );
          imageUrls.push(uploadResult.url);
        }
      }

      // Require either content or files
      if (!receiverId || (!content && (!files || files.length === 0))) {
        console.log("Missing fields:", { receiverId, content, hasFiles: files?.length, body: req.body });
        return res.status(400).json({ message: "receiverId and either content or files are required" });
      }

      // If multiple images, create separate messages for each or store as JSON array
      if (imageUrls.length > 1) {
        // Store as JSON array in a single message
        const message = await storage.createMessage({
          senderId: req.session.userId,
          receiverId,
          content: content || `${imageUrls.length} images`,
          imageUrl: JSON.stringify(imageUrls), // Store multiple URLs as JSON
        });

        console.log("Creating message with multiple images:", { senderId: req.session.userId, receiverId, content, imageCount: imageUrls.length });
        
        // Get sender info for WebSocket broadcast
        const sender = await storage.getUser(req.session.userId);
        
        // Create message with sender info for broadcast
        const messageWithSender = {
          ...message,
          sender: sender,
          senderName: sender?.name || 'Unknown',
          imageUrls: imageUrls // Send as array for frontend
        };
        
        // Broadcast message
        if (connectedUsers.has(receiverId)) {
          const receiverSockets = connectedUsers.get(receiverId)!;
          receiverSockets.forEach(socket => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'new_message',
                data: messageWithSender
              }));
            }
          });
        }
        
        if (connectedUsers.has(req.session.userId)) {
          const senderSockets = connectedUsers.get(req.session.userId)!;
          senderSockets.forEach(socket => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'new_message',
                data: messageWithSender
              }));
            }
          });
        }

        res.json(messageWithSender);
        return;
      }

      console.log("Creating message:", { senderId: req.session.userId, receiverId, content, imageUrl: imageUrls[0] || null });
      
      const message = await storage.createMessage({
        senderId: req.session.userId,
        receiverId,
        content: content || (imageUrls.length > 0 ? 'Image' : ''),
        imageUrl: imageUrls[0] || null,
      });

      // Get sender info for WebSocket broadcast
      const sender = await storage.getUser(req.session.userId);
      
      // Create message with sender info for broadcast
      const messageWithSender = {
        ...message,
        sender: sender,
        senderName: sender?.name || 'Unknown'
      };
      
      // Broadcast message to receiver in real-time if they're online
      if (connectedUsers.has(receiverId)) {
        const receiverSockets = connectedUsers.get(receiverId)!;
        receiverSockets.forEach(socket => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'new_message',
              data: messageWithSender
            }));
          }
        });
      }
      
      // Also broadcast to sender for confirmation
      if (connectedUsers.has(req.session.userId)) {
        const senderSockets = connectedUsers.get(req.session.userId)!;
        senderSockets.forEach(socket => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'message_sent',
              data: messageWithSender
            }));
          }
        });
      }
      
      // Create notification for the receiver
      await storage.createNotification({
        userId: receiverId,
        type: "message",
        fromUserId: req.session.userId,
        isRead: false,
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

  // Friend Request API Routes
  app.post("/api/friend-requests", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { receiverId, message } = req.body;
      
      if (req.session.userId === receiverId) {
        return res.status(400).json({ message: "Cannot send friend request to yourself" });
      }

      const existingRequest = await storage.getFriendRequestStatus(req.session.userId, receiverId);
      if (existingRequest) {
        return res.status(400).json({ message: "Friend request already sent" });
      }

      const areFriends = await storage.areFriends(req.session.userId, receiverId);
      if (areFriends) {
        return res.status(400).json({ message: "Already friends" });
      }

      const friendRequest = await storage.sendFriendRequest(req.session.userId, receiverId, message);
      
      await storage.createNotification({
        userId: receiverId,
        type: "friend_request",
        fromUserId: req.session.userId,
      });

      res.json(friendRequest);
    } catch (error) {
      console.error("Send friend request error:", error);
      res.status(500).json({ message: "Failed to send friend request" });
    }
  });

  app.put("/api/friend-requests/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const { action } = req.body;

      const request = await storage.respondToFriendRequest(parseInt(id), action);
      
      if (request && action === 'accept') {
        await storage.createNotification({
          userId: request.senderId,
          type: "friend_accept",
          fromUserId: req.session.userId,
        });
      }

      res.json(request);
    } catch (error) {
      console.error("Respond to friend request error:", error);
      res.status(500).json({ message: "Failed to respond to friend request" });
    }
  });

  app.get("/api/friend-requests/received", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const requests = await storage.getFriendRequests(req.session.userId, 'received');
      res.json(requests);
    } catch (error) {
      console.error("Get received friend requests error:", error);
      res.status(500).json({ message: "Failed to get friend requests" });
    }
  });

  app.get("/api/friend-requests/sent", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const requests = await storage.getFriendRequests(req.session.userId, 'sent');
      res.json(requests);
    } catch (error) {
      console.error("Get sent friend requests error:", error);
      res.status(500).json({ message: "Failed to get friend requests" });
    }
  });

  app.get("/api/friends", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const friends = await storage.getFriends(req.session.userId);
      res.json(friends);
    } catch (error) {
      console.error("Get friends error:", error);
      res.status(500).json({ message: "Failed to get friends" });
    }
  });

  app.get("/api/friend-suggestions", async (req: Request, res: Response) => {
    try {
      // Authentication handled above
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const suggestions = await storage.getFriendSuggestions(req.session.userId, 10);
      res.json(suggestions);
    } catch (error) {
      console.error("Get friend suggestions error:", error);
      res.status(500).json({ message: "Failed to get friend suggestions" });
    }
  });

  app.delete("/api/friends/:id", async (req: Request, res: Response) => {
    try {
      // Authentication handled above
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const success = await storage.deleteFriendship(req.session.userId, parseInt(id));
      
      if (!success) {
        return res.status(404).json({ message: "Friendship not found" });
      }

      res.json({ message: "Friendship ended" });
    } catch (error) {
      console.error("Delete friendship error:", error);
      res.status(500).json({ message: "Failed to end friendship" });
    }
  });

  // Privacy Settings API Routes
  app.get("/api/privacy-settings", async (req: Request, res: Response) => {
    try {
      // Authentication handled above
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { userId } = req.query;
      const targetUserId = userId ? parseInt(userId as string) : req.session.userId;
      
      const settings = await storage.getPrivacySettings(targetUserId);
      res.json(settings);
    } catch (error) {
      console.error("Get privacy settings error:", error);
      res.status(500).json({ message: "Failed to get privacy settings" });
    }
  });

  app.put("/api/privacy-settings", async (req: Request, res: Response) => {
    try {
      // Authentication handled above
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const settings = await storage.updatePrivacySettings(req.session.userId, req.body);
      res.json(settings);
    } catch (error) {
      console.error("Update privacy settings error:", error);
      res.status(500).json({ message: "Failed to update privacy settings" });
    }
  });

  // Community Groups API Routes
  app.post("/api/community-groups", async (req: Request, res: Response) => {
    try {
      // Authentication handled above
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const group = await storage.createCommunityGroup({
        ...req.body,
        creatorId: req.session.userId,
      });
      
      await storage.joinGroup(group.id, req.session.userId);
      res.json(group);
    } catch (error) {
      console.error("Create community group error:", error);
      res.status(500).json({ message: "Failed to create community group" });
    }
  });

  app.get("/api/community-groups", async (req: Request, res: Response) => {
    try {
      // Authentication handled above
      const { category } = req.query;
      
      const groups = await storage.getCommunityGroups(
        category as string, 
        req.session.userId
      );
      res.json(groups);
    } catch (error) {
      console.error("Get community groups error:", error);
      res.status(500).json({ message: "Failed to get community groups" });
    }
  });

  app.post("/api/community-groups/:id/join", async (req: Request, res: Response) => {
    try {
      // Authentication handled above
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const membership = await storage.joinGroup(parseInt(id), req.session.userId);
      res.json(membership);
    } catch (error) {
      console.error("Join group error:", error);
      res.status(500).json({ message: "Failed to join group" });
    }
  });

  // Wellness Tracking API Routes
  app.post("/api/wellness-tracking", async (req: Request, res: Response) => {
    try {
      // Authentication handled above
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { date, moodRating, energyLevel, stressLevel, sleepHours, waterIntake, exerciseMinutes, notes, isPrivate } = req.body;
      const tracking = await storage.recordWellnessTracking({
        userId: req.session.userId,
        date: new Date(date),
        moodRating,
        energyLevel,
        stressLevel,
        sleepHours,
        waterIntake,
        exerciseMinutes,
        notes,
        isPrivate,
      });
      
      res.json(tracking);
    } catch (error) {
      console.error("Record wellness tracking error:", error);
      res.status(500).json({ message: "Failed to record wellness tracking" });
    }
  });

  app.get("/api/wellness-tracking", async (req: Request, res: Response) => {
    try {
      // Authentication handled above
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { days } = req.query;
      const tracking = await storage.getWellnessTracking(
        req.session.userId, 
        days ? parseInt(days as string) : undefined
      );
      
      res.json(tracking);
    } catch (error) {
      console.error("Get wellness tracking error:", error);
      res.status(500).json({ message: "Failed to get wellness tracking" });
    }
  });

  // Habit Tracking API Routes
  app.post("/api/habits", async (req: Request, res: Response) => {
    try {
      // Authentication handled above
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const habit = await storage.createHabit({
        ...req.body,
        userId: req.session.userId,
      });
      
      res.json(habit);
    } catch (error) {
      console.error("Create habit error:", error);
      res.status(500).json({ message: "Failed to create habit" });
    }
  });

  app.get("/api/habits", async (req: Request, res: Response) => {
    try {
      // Authentication handled above
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const habits = await storage.getUserHabits(req.session.userId);
      res.json(habits);
    } catch (error) {
      console.error("Get habits error:", error);
      res.status(500).json({ message: "Failed to get habits" });
    }
  });

  app.post("/api/habit-logs", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { habitId, date, completed, value, notes } = req.body;
      const log = await storage.logHabit({
        habitId,
        userId: req.session.userId,
        date: new Date(date),
        completed,
        value,
        notes,
      });
      
      res.json(log);
    } catch (error) {
      console.error("Log habit error:", error);
      res.status(500).json({ message: "Failed to log habit" });
    }
  });

  app.get("/api/habit-logs", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { date } = req.query;
      const targetDate = date ? date as string : new Date().toISOString().split('T')[0];
      const logs = await storage.getHabitLogsForDate(req.session.userId, targetDate);
      res.json(logs);
    } catch (error) {
      console.error("Get habit logs error:", error);
      res.status(500).json({ message: "Failed to get habit logs" });
    }
  });

  // Beauty Products API Routes
  app.get("/api/beauty-products", async (req: Request, res: Response) => {
    try {
      const { category, limit } = req.query;
      
      const products = await storage.getBeautyProducts(
        category as string,
        limit ? parseInt(limit as string) : undefined
      );
      
      res.json(products);
    } catch (error) {
      console.error("Get beauty products error:", error);
      res.status(500).json({ message: "Failed to get beauty products" });
    }
  });

  app.post("/api/beauty-products/:id/reviews", async (req: Request, res: Response) => {
    try {
      // Authentication handled above
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const review = await storage.createProductReview({
        ...req.body,
        productId: parseInt(id),
        userId: req.session.userId,
      });
      
      res.json(review);
    } catch (error) {
      console.error("Create product review error:", error);
      res.status(500).json({ message: "Failed to create product review" });
    }
  });

  // Wishlist API Routes
  app.post("/api/wishlists", async (req: Request, res: Response) => {
    try {
      // Authentication handled above
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const wishlist = await storage.createWishlist({
        ...req.body,
        userId: req.session.userId,
      });
      
      res.json(wishlist);
    } catch (error) {
      console.error("Create wishlist error:", error);
      res.status(500).json({ message: "Failed to create wishlist" });
    }
  });

  app.get("/api/wishlists", async (req: Request, res: Response) => {
    try {
      // Authentication handled above
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const wishlists = await storage.getUserWishlists(req.session.userId);
      res.json(wishlists);
    } catch (error) {
      console.error("Get wishlists error:", error);
      res.status(500).json({ message: "Failed to get wishlists" });
    }
  });

  // Events API Routes
  app.post("/api/events", async (req: Request, res: Response) => {
    try {
      // Authentication handled above
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const event = await storage.createEvent({
        ...req.body,
        creatorId: req.session.userId,
      });
      
      res.json(event);
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.get("/api/events", async (req: Request, res: Response) => {
    try {
      // Authentication handled above
      const events = await storage.getEvents(req.session.userId);
      res.json(events);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ message: "Failed to get events" });
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
    let currentUserId: number | null = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle user joining for messaging
        if (data.type === 'join' && data.userId) {
          currentUserId = data.userId;
          userSockets.set(ws, currentUserId);
          
          if (!connectedUsers.has(currentUserId)) {
            connectedUsers.set(currentUserId, []);
          }
          connectedUsers.get(currentUserId)!.push(ws);
          
          // Broadcast user online status
          broadcastToAllUsers({
            type: 'online',
            data: { userId: currentUserId }
          });
        }
        
        // Handle new message broadcasting
        if (data.type === 'message' && currentUserId) {
          const messageData = data.data;
          
          // Broadcast to the receiver if they're online
          if (messageData.receiverId && connectedUsers.has(messageData.receiverId)) {
            const receiverSockets = connectedUsers.get(messageData.receiverId)!;
            receiverSockets.forEach(socket => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  type: 'message',
                  data: messageData
                }));
              }
            });
          }
          
          // Also send back to sender for confirmation
          ws.send(JSON.stringify({
            type: 'message_sent',
            data: messageData
          }));
        }
        
        // Handle typing indicators
        if (data.type === 'typing' && currentUserId) {
          const { conversationId, userId } = data;
          // Broadcast typing to other participants in the conversation
          broadcastToAllUsers({
            type: 'typing',
            data: { userId: currentUserId, conversationId }
          });
        }
        
        // Live stream functionality (keeping existing)
        if (data.type === 'join_stream') {
          const streamId = parseInt(data.streamId);
          
          if (currentStreamId && liveStreamViewers.has(currentStreamId)) {
            const viewers = liveStreamViewers.get(currentStreamId)!;
            viewers.delete(socketId);
            broadcastViewerCount(currentStreamId);
          }
          
          currentStreamId = streamId;
          if (!liveStreamViewers.has(streamId)) {
            liveStreamViewers.set(streamId, new Set());
          }
          liveStreamViewers.get(streamId)!.add(socketId);
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
      // Clean up messaging connections
      if (currentUserId) {
        userSockets.delete(ws);
        
        if (connectedUsers.has(currentUserId)) {
          const userSocketList = connectedUsers.get(currentUserId)!;
          const index = userSocketList.indexOf(ws);
          if (index > -1) {
            userSocketList.splice(index, 1);
          }
          
          // If no more sockets for this user, remove from connected users
          if (userSocketList.length === 0) {
            connectedUsers.delete(currentUserId);
            
            // Broadcast user offline status
            broadcastToAllUsers({
              type: 'offline',
              data: { userId: currentUserId }
            });
          }
        }
      }
      
      // Clean up live stream connections
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

  function broadcastToAllUsers(message: any) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // Secure Account Deletion APIs
  app.post("/api/auth/verify-password", async (req: Request, res: Response) => {
    try {
      const session = req.session as SessionData;
      if (!session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      // For demo purposes, we'll accept any non-empty password
      // In production, you would verify against the stored hash
      res.json({ success: true });
    } catch (error) {
      console.error("Password verification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/send-delete-otp", async (req: Request, res: Response) => {
    try {
      const session = req.session as SessionData;
      if (!session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const otp = generateOTP();
      
      // Store OTP in session for verification
      session.deleteOtp = otp;
      session.deleteOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Send OTP via email
      try {
        await sendOtpEmail(user.email, otp, "Account Deletion");
        res.json({ success: true });
      } catch (emailError) {
        console.error("Failed to send delete OTP:", emailError);
        res.status(500).json({ message: "Failed to send verification code" });
      }
    } catch (error) {
      console.error("Send delete OTP error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/verify-delete-otp", async (req: Request, res: Response) => {
    try {
      const session = req.session as SessionData;
      if (!session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { otp } = req.body;
      if (!otp) {
        return res.status(400).json({ message: "OTP is required" });
      }

      if (!session.deleteOtp || !session.deleteOtpExpiry) {
        return res.status(400).json({ message: "No OTP found. Please request a new one." });
      }

      if (Date.now() > session.deleteOtpExpiry) {
        delete session.deleteOtp;
        delete session.deleteOtpExpiry;
        return res.status(400).json({ message: "OTP has expired. Please request a new one." });
      }

      if (session.deleteOtp !== otp) {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      // Mark OTP as verified
      session.deleteOtpVerified = true;
      res.json({ success: true });
    } catch (error) {
      console.error("Verify delete OTP error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/auth/delete-account", async (req: Request, res: Response) => {
    try {
      const session = req.session as SessionData;
      if (!session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verify that OTP was verified
      if (!session.deleteOtpVerified) {
        return res.status(400).json({ message: "Account deletion not authorized" });
      }

      const userId = session.userId;

      // Delete all user-related data
      await storage.deleteUser(userId);

      // Clear session
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
        }
      });

      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  return httpServer;
}