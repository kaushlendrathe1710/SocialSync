import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
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
  insertFriendRequestSchema,
  insertFriendshipSchema,
  insertEventSchema,
  type InsertEvent,
} from "@shared/schema";
import nodemailer from "nodemailer";
import multer from "multer";
import { uploadToS3, deleteFromS3, validateS3Config } from "./aws-s3";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

// Extend Express Session interface
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

// Local file storage function (fallback when S3 is not configured)
async function saveFileLocally(file: Express.Multer.File, fileType: string): Promise<string> {
  try {
    // Create directory structure
    const uploadDir = path.join(process.cwd(), 'uploads', 'messages', fileType);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `${randomUUID()}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Copy file to permanent location
    fs.copyFileSync(file.path, filePath);

    // Return URL path (relative to server)
    return `/uploads/messages/${fileType}/${fileName}`;
  } catch (error) {
    console.error('Error saving file locally:', error);
    throw new Error('Failed to save file locally');
  }
}

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|mp3|wav|ogg|m4a|aac|webm/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images, videos, and audio files are allowed"));
    }
  },
});

// Memory upload for S3-backed routes
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|mp3|wav|ogg|m4a|aac|webm/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Only images, videos, and audio files are allowed"));
  },
});

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || "587"),
  secure: (process.env.EMAIL_PORT || process.env.SMTP_PORT) === "465", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 30000,  // 30 seconds
  greetingTimeout: 30000,    // 30 seconds  
  socketTimeout: 60000,      // 60 seconds
});

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Live stream viewer tracking
const liveStreamViewers = new Map<number, Set<string>>(); // streamId -> Set of viewer socket IDs
const liveStreamHosts = new Map<number, WebSocket>(); // streamId -> host WebSocket
const streamSockets = new Map<
  WebSocket,
  { streamId: number; userId: number; isHost: boolean }
>(); // WebSocket -> stream info

// Send OTP via email
async function sendOtpEmail(
  email: string,
  otp: string,
  purpose: string = "Verification"
): Promise<void> {
  // Check if email configuration is properly set up
  const isEmailConfigured =
    (process.env.EMAIL_HOST || process.env.SMTP_HOST) &&
    (process.env.EMAIL_USER || process.env.SMTP_USER) &&
    (process.env.EMAIL_PASS || process.env.SMTP_PASS) &&
    (process.env.FROM_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_FROM);

  if (!isEmailConfigured) {
    throw new Error(
      "Email configuration incomplete. Please configure EMAIL_HOST, EMAIL_USER, EMAIL_PASS, and FROM_EMAIL environment variables."
    );
  }

  await transporter.sendMail({
    from:
      process.env.FROM_EMAIL ||
      process.env.SMTP_FROM ||
      process.env.EMAIL_FROM ||
      "noreply@socialconnect.com",
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
      </div>
    `,
  });

  console.log(`✓ ${purpose} email sent successfully to ${email}`);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);

      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await storage.createOtpCode({ email, code, expiresAt, used: false });

      // Send OTP via email using the dedicated function
      await sendOtpEmail(email, code, "Login");

      res.json({ message: "OTP sent successfully" });
    } catch (error: any) {
      console.error("Send OTP error:", error);

      // Provide specific error messages for email configuration issues
      if (error.message.includes("Email configuration incomplete")) {
        res.status(500).json({
          message:
            "Email service not configured. Please contact administrator.",
          error: "EMAIL_CONFIG_MISSING",
        });
      } else if (error.code === "EAUTH" || error.code === "ECONNECTION") {
        res.status(500).json({
          message: "Email service unavailable. Please try again later.",
          error: "EMAIL_SERVICE_ERROR",
        });
      } else {
        res.status(500).json({ message: "Failed to send OTP" });
      }
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      // Log the request body for debugging
      console.log("Verify OTP request body:", req.body);

      const { email, code, name, username } = z
        .object({
          email: z.string().email(),
          code: z.string().length(6),
          name: z.string().optional(),
          username: z.string().optional(),
        })
        .parse(req.body);

      const validOtp = await storage.getValidOtpCode(email, code);
      if (!validOtp) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      let user = await storage.getUserByEmail(email);

      if (!user) {
        // New user - check if name and username are provided
        if (name && username) {
          // Create new user with provided details
          user = await storage.createUser({
            email,
            name,
            username,
            bio: null,
            avatar: null,
            coverPhoto: null,
            location: null,
            website: null,
            isVerified: false,
          });

          // Mark OTP as used only after successful account creation
          await storage.markOtpCodeUsed(validOtp.id);

          // Set session
          req.session.userId = user.id;

          // Save session explicitly
          req.session.save((err) => {
            if (err) {
              console.error("Session save error:", err);
              return res.status(500).json({ message: "Session error" });
            }

            console.log("Session saved successfully for new user:", user.id);
            res.json({
              user,
              isNewUser: true,
              message: "Account created successfully",
              redirectTo: "/",
            });
          });
        } else {
          // New user but missing details - return needsDetails flag
          // Don't mark OTP as used yet, keep it valid for the signup form
          res.json({
            needsDetails: true,
            message:
              "Please provide your name and username to complete registration",
          });
        }
        return;
      }

      // Existing user - log them in
      // Mark OTP as used for existing users
      await storage.markOtpCodeUsed(validOtp.id);

      req.session.userId = user.id;

      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session error" });
        }

        console.log("Session saved successfully for user:", user.id);
        res.json({
          user,
          isNewUser: false,
          message: "Login successful",
          redirectTo: "/",
        });
      });
    } catch (error: any) {
      console.error("Verify OTP error:", error);

      // Provide specific error messages for validation issues
      if (error.name === "ZodError") {
        const missingFields = error.issues
          .filter(
            (issue: any) =>
              issue.code === "invalid_type" && issue.received === "undefined"
          )
          .map((issue: any) => issue.path[0]);

        if (missingFields.length > 0) {
          return res.status(400).json({
            message: `Missing required fields: ${missingFields.join(", ")}`,
            error: "VALIDATION_ERROR",
            missingFields,
          });
        }
      }

      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.status(500).json({ message: "Logout error" });
      }
      console.log("Session destroyed successfully");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    // Log session info for debugging
    console.log("Session ID:", req.sessionID);
    console.log("Session data:", req.session);
    console.log("User ID in session:", req.session.userId);

    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  });

  // Middleware to check authentication
  const requireAuth = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    req.user = await storage.getUser(req.session.userId);
    next();
  };

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.put("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (id !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updates = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, updates);

      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.get("/api/users/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }

      const users = await storage.searchUsers(query);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Post routes
  app.get("/api/posts", async (req, res) => {
    try {
      const userId = req.query.userId
        ? parseInt(req.query.userId as string)
        : undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      // Include currentUserId so storage can compute userReaction
      const posts = await storage.getPosts(
        userId,
        limit,
        offset,
        req.session.userId
      );

      // Add isLiked flag for authenticated user
      if (req.session.userId) {
        const userLikes = await storage.getUserLikes(req.session.userId);
        const likedPostIds = new Set(userLikes.map((like) => like.postId));

        posts.forEach((post) => {
          post.isLiked = likedPostIds.has(post.id);
        });
      }

      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get posts" });
    }
  });

  // React to post endpoint (supports multiple emoji reactions)
  app.post("/api/posts/:id/react", requireAuth, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.session.userId;
      const { reactionType } = req.body as { reactionType?: string };

      const validReactions = [
        "like",
        "love",
        "laugh",
        "wow",
        "sad",
        "angry",
        "heart_eyes",
        "kiss",
        "wink",
        "cool",
        "thinking",
        "thumbs_down",
        "clap",
        "fire",
        "party",
        "shocked",
        "confused",
        "sleepy",
      ];

      if (!reactionType || !validReactions.includes(reactionType)) {
        return res.status(400).json({ message: "Invalid reaction type" });
      }

      const userLikes = await storage.getUserLikes(userId);
      const existingReaction = userLikes.find((like) => like.postId === postId);

      const post = await storage.getPost(postId, req.session.userId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (existingReaction) {
        if (existingReaction.reactionType === reactionType) {
          // Toggle off
          await storage.deleteLike(userId, postId);
          return res.json({ reacted: false, reactionType: null });
        } else {
          // Change reaction
          await storage.updateLike(userId, postId, reactionType);
          return res.json({ reacted: true, reactionType });
        }
      } else {
        // New reaction
        await storage.createLike({ userId, postId, reactionType });
        return res.json({ reacted: true, reactionType });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to react to post" });
    }
  });

  // Get post reactions endpoint
  app.get("/api/posts/:id/reactions", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const reactions = await storage.getPostReactions(postId);
      res.json(reactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get post reactions" });
    }
  });

  // ========== REELS API ROUTES ==========

  app.get("/api/reels", async (req, res) => {
    try {
      const all = await storage.getReels(req.session.userId);
      res.json(all);
    } catch (error) {
      console.error("Get reels error:", error);
      res.status(500).json({ message: "Failed to get reels" });
    }
  });

  app.post(
    "/api/reels",
    requireAuth,
    memoryUpload.single("video"),
    async (req, res) => {
      try {
        if (!req.file)
          return res.status(400).json({ message: "Video file is required" });
        // Transcode to Instagram-like 9:16 (720x1280), H.264/AAC, ~3Mbps
        // Write temp input
        const tmpIn = path.join("uploads", `tmp-in-${Date.now()}.mp4`);
        const tmpOut = path.join("uploads", `tmp-out-${Date.now()}.mp4`);
        fs.writeFileSync(tmpIn, req.file.buffer);

        const ffmpegArgs = [
          "-y",
          "-i",
          tmpIn,
          "-vf",
          "scale=iw:ih,setsar=1:1,scale=720:-2:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black",
          "-c:v",
          "libx264",
          "-profile:v",
          "high",
          "-level:v",
          "4.1",
          "-preset",
          "veryfast",
          "-b:v",
          "3000k",
          "-maxrate",
          "3200k",
          "-bufsize",
          "6000k",
          "-pix_fmt",
          "yuv420p",
          "-r",
          "30",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          tmpOut,
        ];

        await new Promise<void>((resolve, reject) => {
          const proc = spawn("ffmpeg", ffmpegArgs);
          proc.on("error", reject);
          proc.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg exited with code ${code}`));
          });
        });

        // Upload transcoded output
        const outBuffer = fs.readFileSync(tmpOut);
        let videoUrl: string;
        if (validateS3Config()) {
          const uploaded = await uploadToS3(
            outBuffer,
            req.file.originalname.replace(/\.[^/.]+$/, "-reel.mp4"),
            "video/mp4",
            "reels"
          );
          videoUrl = uploaded.url;
        } else {
          const finalName = `${Date.now()}-${Math.random()
            .toString(36)
            .substring(7)}-reel.mp4`;
          const finalPath = path.join("uploads", finalName);
          fs.renameSync(tmpOut, finalPath);
          videoUrl = `/uploads/${finalName}`;
        }
        // Cleanup temp input if still present
        try {
          fs.unlinkSync(tmpIn);
        } catch {}
        try {
          if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
        } catch {}
        const duration = 30;
        const {
          caption,
          privacy = "public",
          musicId,
          effects,
        } = req.body as any;

        const reel = await storage.createReel({
          userId: req.session.userId,
          videoUrl,
          caption: caption || null,
          musicId: musicId ? parseInt(musicId) : null,
          effects: effects ? JSON.parse(effects) : [],
          duration,
          privacy,
        });

        res.json(reel);
      } catch (error) {
        console.error("Create reel error:", error);
        res.status(500).json({ message: "Failed to create reel" });
      }
    }
  );

  app.get("/api/reels/:id", async (req, res) => {
    try {
      const reelId = parseInt(req.params.id);
      const reel = await storage.getReelById(reelId);
      if (!reel) return res.status(404).json({ message: "Reel not found" });
      res.json(reel);
    } catch (error) {
      console.error("Get reel error:", error);
      res.status(500).json({ message: "Failed to get reel" });
    }
  });

  // Record reel view
  app.post("/api/reels/:id/view", async (req, res) => {
    try {
      const reelId = parseInt(req.params.id);
      await storage.incrementReelView(reelId);
      res.json({ success: true });
    } catch (error) {
      console.error("Record reel view error:", error);
      res.status(500).json({ message: "Failed to record view" });
    }
  });

  app.post("/api/reels/:id/like", requireAuth, async (req, res) => {
    try {
      const reelId = parseInt(req.params.id);
      const isLiked = await storage.toggleReelLike(reelId, req.session.userId!);
      res.json({ isLiked });
    } catch (error) {
      console.error("Toggle reel like error:", error);
      res.status(500).json({ message: "Failed to toggle reel like" });
    }
  });

  app.post("/api/reels/:id/save", requireAuth, async (req, res) => {
    try {
      const reelId = parseInt(req.params.id);
      await storage.saveReel(req.session.userId!, reelId);
      res.json({ success: true });
    } catch (error) {
      console.error("Save reel error:", error);
      res.status(500).json({ message: "Failed to save reel" });
    }
  });

  app.post("/api/reels/:id/share", requireAuth, async (req, res) => {
    try {
      const reelId = parseInt(req.params.id);
      const { platform } = req.body as any;
      await storage.shareReel(reelId, platform);
      res.json({ success: true });
    } catch (error) {
      console.error("Share reel error:", error);
      res.status(500).json({ message: "Failed to share reel" });
    }
  });

  app.delete("/api/reels/:id", requireAuth, async (req, res) => {
    try {
      const reelId = parseInt(req.params.id);
      const ok = await storage.deleteReel(reelId, req.session.userId!);
      if (!ok) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete reel error:", error);
      res.status(500).json({ message: "Failed to delete reel" });
    }
  });

  // Reel comments
  app.get("/api/reels/:id/comments", async (req, res) => {
    try {
      const reelId = parseInt(req.params.id);
      const list = await storage.getReelComments(reelId);
      res.json(list);
    } catch (error) {
      console.error("Get reel comments error:", error);
      res.status(500).json({ message: "Failed to get comments" });
    }
  });

  app.post("/api/reels/:id/comments", requireAuth, async (req, res) => {
    try {
      const reelId = parseInt(req.params.id);
      const { content } = z
        .object({ content: z.string().min(1) })
        .parse(req.body);
      const comment = await storage.createReelComment(
        reelId,
        req.session.userId!,
        content
      );
      res.json(comment);
    } catch (error) {
      console.error("Create reel comment error:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Edit reel comment
  app.put("/api/reel-comments/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
      const updated = await storage.updateReelComment(id, content);
      if (!updated) return res.status(404).json({ message: "Comment not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update comment" });
    }
  });

  // Delete reel comment
  app.delete("/api/reel-comments/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ok = await storage.deleteReelComment(id);
      if (!ok) return res.status(404).json({ message: "Comment not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  app.post(
    "/api/posts",
    requireAuth,
    upload.single("media"),
    async (req, res) => {
      try {
        let postData = {
          userId: req.session.userId,
          content: req.body.content || null,
          imageUrl: null as string | null,
          videoUrl: null as string | null,
          privacy: req.body.privacy || "public",
        };

        // Handle file upload
        if (req.file) {
          const fileExtension = path.extname(req.file.originalname);
          const fileName = `${Date.now()}-${Math.random()
            .toString(36)
            .substring(7)}${fileExtension}`;
          const filePath = path.join("uploads", fileName);

          // Move file to permanent location
          fs.renameSync(req.file.path, filePath);

          // Determine if it's an image or video
          const isVideo = /\.(mp4|mov|avi)$/i.test(fileExtension);
          if (isVideo) {
            postData.videoUrl = `/uploads/${fileName}`;
          } else {
            postData.imageUrl = `/uploads/${fileName}`;
          }
        }

        const post = await storage.createPost(postData);
        const postWithUser = await storage.getPost(post.id, req.session.userId);

        res.json(postWithUser);
      } catch (error) {
        console.error("Create post error:", error);
        res.status(500).json({ message: "Failed to create post" });
      }
    }
  );

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getPost(id, req.session.userId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Add isLiked flag for authenticated user
      if (req.session.userId) {
        const userLikes = await storage.getUserLikes(req.session.userId);
        post.isLiked = userLikes.some((like) => like.postId === id);
      }

      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to get post" });
    }
  });

  app.delete("/api/posts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getPost(id, req.session.userId);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (post.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deletePost(id);
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  // Post view tracking endpoint
  app.post("/api/posts/:id/view", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const viewerId = req.session.userId || null;
      const ipAddress = req.ip || (req.connection as any).remoteAddress;
      const userAgent = req.get("User-Agent");

      await storage.recordPostView({
        postId,
        viewerId,
        ipAddress,
        userAgent,
      });

      await storage.incrementPostViewCount(postId);

      res.json({ success: true });
    } catch (error) {
      console.error("Record post view error:", error);
      res.status(500).json({ message: "Failed to record view" });
    }
  });

  // Get post views count
  app.get("/api/posts/:id/views", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const viewCount = await storage.getPostViews(postId);
      res.json({ views: viewCount });
    } catch (error) {
      console.error("Get post views error:", error);
      res.status(500).json({ message: "Failed to get views" });
    }
  });

  // Like routes
  app.post("/api/posts/:id/like", requireAuth, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.session.userId;

      // Check if already liked
      const userLikes = await storage.getUserLikes(userId);
      const existingLike = userLikes.find((like) => like.postId === postId);

      if (existingLike) {
        await storage.deleteLike(userId, postId);

        // Create notification for unlike (remove notification)
        // In a real app, you might want to remove the notification

        res.json({ liked: false });
      } else {
        await storage.createLike({ userId, postId });

        // Create notification for like
        const post = await storage.getPost(postId, userId);
        if (post && post.userId !== userId) {
          await storage.createNotification({
            userId: post.userId,
            type: "like",
            fromUserId: userId,
            postId,
            isRead: false,
          });
        }

        res.json({ liked: true });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle like" });
    }
  });

  // Comment routes
  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const comments = await storage.getPostComments(postId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get comments" });
    }
  });

  // ========== STATUS API ROUTES ==========
  app.get("/api/status", async (req, res) => {
    try {
      const statusUpdates = await storage.getStatusUpdates(req.session.userId);
      res.json(statusUpdates);
    } catch (error) {
      console.error("Get status updates error:", error);
      res.status(500).json({ message: "Failed to get status updates" });
    }
  });

  app.post("/api/status", requireAuth, memoryUpload.any(), async (req, res) => {
    try {
      const {
        type,
        content,
        backgroundColor,
        fontStyle,
        pollOptions,
        question,
        privacy = "public",
      } = req.body as any;

      if (type === "text" && !content) {
        return res
          .status(400)
          .json({ message: "Content is required for text status" });
      }
      if (type === "poll" && (!pollOptions || !content)) {
        return res.status(400).json({
          message: "Poll options and content are required for poll status",
        });
      }
      if (type === "question" && !question) {
        return res
          .status(400)
          .json({ message: "Question is required for question status" });
      }

      let mediaUrl: string | null = null;
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length > 0) {
        if (validateS3Config()) {
          if (files.length === 1) {
            const f = files[0];
            const uploaded = await uploadToS3(
              f.buffer,
              f.originalname,
              f.mimetype,
              "status"
            );
            mediaUrl = uploaded.url;
          } else {
            const urls: string[] = [];
            for (const f of files) {
              const uploaded = await uploadToS3(
                f.buffer,
                f.originalname,
                f.mimetype,
                "status"
              );
              urls.push(uploaded.url);
            }
            mediaUrl = urls.join(",");
          }
        } else {
          if (files.length === 1) {
            const f = files[0];
            const ext = path.extname(f.originalname);
            const fileName = `${Date.now()}-${Math.random()
              .toString(36)
              .substring(7)}${ext}`;
            const filePath = path.join("uploads", fileName);
            fs.writeFileSync(filePath, f.buffer);
            mediaUrl = `/uploads/${fileName}`;
          } else {
            const urls: string[] = [];
            for (const f of files) {
              const ext = path.extname(f.originalname);
              const fileName = `${Date.now()}-${Math.random()
                .toString(36)
                .substring(7)}${ext}`;
              const filePath = path.join("uploads", fileName);
              fs.writeFileSync(filePath, f.buffer);
              urls.push(`/uploads/${fileName}`);
            }
            mediaUrl = urls.join(",");
          }
        }
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const statusData: any = {
        userId: req.session.userId,
        type,
        content: content || null,
        mediaUrl,
        backgroundColor: backgroundColor || null,
        fontStyle: fontStyle || null,
        question: question || null,
        privacy,
        expiresAt,
      };

      if (type === "poll" && pollOptions) {
        try {
          const parsed = Array.isArray(pollOptions)
            ? pollOptions
            : JSON.parse(pollOptions as string);
          statusData.pollOptions = parsed;
          statusData.pollVotes = new Array(parsed.length).fill(0);
        } catch (e) {
          return res
            .status(400)
            .json({ message: "Invalid poll options format" });
        }
      }

      const status = await storage.createStatusUpdate(statusData);
      // Broadcast via WebSocket if available
      try {
        if (wss) {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({ type: "status_created", data: status })
              );
            }
          });
        }
      } catch {}
      res.json(status);
    } catch (error: any) {
      console.error("Create status error:", error);
      res
        .status(500)
        .json({ message: "Failed to create status", error: error.message });
    }
  });

  app.post("/api/status/:id/view", requireAuth, async (req, res) => {
    try {
      const statusId = parseInt(req.params.id);
      await storage.markStatusViewed(statusId, req.session.userId!);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark status viewed error:", error);
      res.status(500).json({ message: "Failed to mark status as viewed" });
    }
  });

  app.post("/api/status/:id/react", requireAuth, async (req, res) => {
    try {
      const statusId = parseInt(req.params.id);
      const { reaction } = req.body as any;
      const result = await storage.reactToStatus(
        statusId,
        req.session.userId!,
        reaction
      );
      // Notify creator via WebSocket and create notification
      try {
        const status = await storage.getStatusById(statusId);
        if (status && status.userId && status.userId !== req.session.userId) {
          // Create notification record
          await storage.createNotification({
            userId: status.userId,
            type: "status_reaction",
            fromUserId: req.session.userId!,
            postId: undefined,
            isRead: false,
          });

          if (wss) {
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({
                    type: "new_notification",
                    data: {
                      message: "Someone reacted to your status",
                      statusId,
                    },
                  })
                );
              }
            });
          }
        }
      } catch {}
      res.json(result);
    } catch (error) {
      console.error("React to status error:", error);
      res.status(500).json({ message: "Failed to react to status" });
    }
  });

  app.post("/api/status/:id/vote", requireAuth, async (req, res) => {
    try {
      const statusId = parseInt(req.params.id);
      const { optionIndex } = req.body as any;
      if (typeof optionIndex !== "number" || optionIndex < 0) {
        return res
          .status(400)
          .json({ message: "Valid option index is required" });
      }
      const result = await storage.voteOnStatusPoll(
        statusId,
        req.session.userId!,
        optionIndex
      );
      res.json(result);
    } catch (error) {
      console.error("Vote on status poll error:", error);
      res.status(500).json({ message: "Failed to vote on poll" });
    }
  });

  app.put("/api/status/:id", requireAuth, async (req, res) => {
    try {
      const statusId = parseInt(req.params.id);
      const updated = await storage.updateStatusUpdate(
        statusId,
        req.session.userId!,
        req.body || {}
      );
      res.json(updated);
    } catch (error) {
      console.error("Update status error:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.delete("/api/status/:id", requireAuth, async (req, res) => {
    try {
      const statusId = parseInt(req.params.id);
      const ok = await storage.deleteStatusUpdate(
        statusId,
        req.session.userId!
      );
      if (!ok) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete status error:", error);
      res.status(500).json({ message: "Failed to delete status" });
    }
  });

  app.post("/api/posts/:id/comments", requireAuth, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { content } = z
        .object({ content: z.string().min(1) })
        .parse(req.body);

      const comment = await storage.createComment({
        userId: req.session.userId,
        postId,
        content,
      });

      // Create notification for comment
      const post = await storage.getPost(postId, req.session.userId);
      if (post && post.userId !== req.session.userId) {
        await storage.createNotification({
          userId: post.userId,
          type: "comment",
          fromUserId: req.session.userId,
          postId,
          isRead: false,
        });
      }

      const commentWithUser = {
        ...comment,
        user: req.user,
      };

      res.json(commentWithUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Edit a post comment
  app.put("/api/comments/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
      const updated = await storage.updateComment(id, content);
      if (!updated) return res.status(404).json({ message: "Comment not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update comment" });
    }
  });

  // Delete a post comment
  app.delete("/api/comments/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ok = await storage.deleteComment(id);
      if (!ok) return res.status(404).json({ message: "Comment not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Follow routes
  app.post("/api/users/:id/follow", requireAuth, async (req, res) => {
    try {
      const followingId = parseInt(req.params.id);
      const followerId = req.session.userId;

      if (followerId === followingId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      const isAlreadyFollowing = await storage.isFollowing(
        followerId,
        followingId
      );

      if (isAlreadyFollowing) {
        await storage.deleteFollow(followerId, followingId);
        res.json({ following: false });
      } else {
        await storage.createFollow({ followerId, followingId });

        // Create notification for follow
        await storage.createNotification({
          userId: followingId,
          type: "follow",
          fromUserId: followerId,
          isRead: false,
        });

        res.json({ following: true });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle follow" });
    }
  });

  app.get("/api/users/:id/followers", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const followers = await storage.getFollowers(userId);
      res.json(followers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get followers" });
    }
  });

  app.get("/api/users/:id/following", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const following = await storage.getFollowing(userId);
      res.json(following);
    } catch (error) {
      res.status(500).json({ message: "Failed to get following" });
    }
  });

  // Story routes
  app.get("/api/stories", async (req, res) => {
    try {
      const userId = req.query.userId
        ? parseInt(req.query.userId as string)
        : undefined;
      const stories = await storage.getActiveStories(userId);
      res.json(stories);
    } catch (error) {
      res.status(500).json({ message: "Failed to get stories" });
    }
  });

  app.post(
    "/api/stories",
    requireAuth,
    upload.single("media"),
    async (req, res) => {
      try {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        let storyData = {
          userId: req.session.userId,
          text: req.body.text || null,
          imageUrl: null as string | null,
          videoUrl: null as string | null,
          expiresAt,
        };

        // Handle file upload
        if (req.file) {
          const fileExtension = path.extname(req.file.originalname);
          const fileName = `${Date.now()}-${Math.random()
            .toString(36)
            .substring(7)}${fileExtension}`;
          const filePath = path.join("uploads", fileName);

          fs.renameSync(req.file.path, filePath);

          const isVideo = /\.(mp4|mov|avi)$/i.test(fileExtension);
          if (isVideo) {
            storyData.videoUrl = `/uploads/${fileName}`;
          } else {
            storyData.imageUrl = `/uploads/${fileName}`;
          }
        }

        const story = await storage.createStory(storyData);
        res.json(story);
      } catch (error) {
        res.status(500).json({ message: "Failed to create story" });
      }
    }
  );

  // Message routes
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getConversations(req.session.userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get conversations" });
    }
  });

  app.get("/api/conversations/:userId", requireAuth, async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      const messages = await storage.getConversation(
        req.session.userId,
        otherUserId
      );
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get conversation" });
    }
  });

  // Upload media files for messages
  app.post("/api/messages/upload", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log("File upload request:", {
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });

      // Determine file type and folder
      const fileType = req.file.mimetype.startsWith('image/') ? 'image' :
                     req.file.mimetype.startsWith('video/') ? 'video' :
                     req.file.mimetype.startsWith('audio/') ? 'audio' : 'document';
      
      let fileUrl: string;
      
      // Try S3 first, fallback to local storage
      if (validateS3Config()) {
        try {
          console.log("Attempting S3 upload...");
          // Read file buffer
          const fileBuffer = fs.readFileSync(req.file.path);
          const folder = `messages/${fileType}`;
          
          // Upload to S3
          const uploadResult = await uploadToS3(
            fileBuffer,
            req.file.originalname,
            req.file.mimetype,
            folder
          );
          
          fileUrl = uploadResult.url;
          console.log("S3 upload successful:", uploadResult.url);
        } catch (s3Error) {
          console.error("S3 upload failed, falling back to local storage:", s3Error);
          // Fallback to local storage
          fileUrl = await saveFileLocally(req.file, fileType);
          console.log("Local storage fallback successful:", fileUrl);
        }
      } else {
        console.log("S3 not configured, using local storage");
        // Use local storage
        fileUrl = await saveFileLocally(req.file, fileType);
        console.log("Local storage upload successful:", fileUrl);
      }

      // Clean up temporary file
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn("Failed to clean up temporary file:", cleanupError);
      }

      const result = {
        url: fileUrl,
        fileName: req.file.originalname,
        fileType,
        fileSize: req.file.size,
      };

      console.log("Upload completed successfully:", result);
      res.json(result);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Serve local uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      console.log("Message request body:", req.body);
      console.log("Session userId:", req.session.userId);
      
      const { receiverId, content, imageUrl, videoUrl, audioUrl, fileType, fileName, fileSize } = z
        .object({
          receiverId: z.number(),
          content: z.string().optional().default(""),
          imageUrl: z.string().optional(),
          videoUrl: z.string().optional(),
          audioUrl: z.string().optional(),
          fileType: z.string().optional(),
          fileName: z.string().optional(),
          fileSize: z.number().optional(),
        })
        .parse(req.body);

      if (!req.session.userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      console.log("Creating message with data:", {
        senderId: req.session.userId,
        receiverId,
        content,
        imageUrl,
        videoUrl,
        audioUrl,
        fileType,
        fileName,
        fileSize,
      });

      const message = await storage.createMessage({
        senderId: req.session.userId,
        receiverId,
        content,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        audioUrl: audioUrl || null,
        fileType: fileType || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
      });

      console.log("Message created successfully:", message);

      // Create notification for message
      await storage.createNotification({
        userId: receiverId,
        type: "message",
        fromUserId: req.session.userId,
        isRead: false,
      });

      res.json(message);
    } catch (error) {
      console.error("Message creation error:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Failed to send message", error: error.message });
    }
  });

  // Notification routes
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(
        req.session.userId
      );
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  // ========== WELLNESS TRACKING API ROUTES ==========
  app.get("/api/wellness-tracking", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const days = req.query.days ? parseInt(String(req.query.days)) : undefined;
      const records = await storage.getWellnessTracking(userId, days);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Failed to get wellness tracking" });
    }
  });

  // ========== GROUPS / COMMUNITIES API ROUTES ==========
  app.get("/api/groups", async (req, res) => {
    try {
      const category = (req.query.category as string) || undefined;
      const userId = req.session.userId as number | undefined;
      const groups = await storage.getCommunityGroups(category, userId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Failed to get groups" });
    }
  });

  app.post("/api/groups", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const { name, description, category, privacy, tags, coverImage } = req.body || {};
      if (!name || !description || !category) {
        return res.status(400).json({ message: "name, description, category required" });
      }
      const group = await storage.createCommunityGroup({
        name,
        description,
        category,
        privacy: privacy ?? "public",
        coverImage: coverImage ?? null,
        creatorId: userId,
        memberCount: 0,
        isVerified: false,
        tags: Array.isArray(tags) ? tags : [],
      } as any);
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  app.get("/api/groups/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const group = await storage.getGroupById(id);
      if (!group) return res.status(404).json({ message: "Group not found" });
      const userId = req.session.userId as number | undefined;
      if (userId) {
        const membership = await storage.getGroupMembership(id, userId);
        (group as any).isJoined = !!membership && membership.status === "active";
        (group as any).membershipStatus = membership?.status || (group as any).membershipStatus || "none";
      }
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to get group" });
    }
  });

  app.put("/api/groups/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;
      const updates = req.body || {};
      const updated = await storage.updateCommunityGroup(id, userId, updates);
      res.json(updated);
    } catch (error: any) {
      if (String(error.message || "").includes("Not authorized")) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.status(500).json({ message: "Failed to update group" });
    }
  });

  app.delete("/api/groups/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;
      const ok = await storage.deleteCommunityGroup(id, userId);
      if (!ok) return res.status(404).json({ message: "Group not found" });
      res.json({ success: true });
    } catch (error: any) {
      if (String(error.message || "").includes("Not authorized")) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.status(500).json({ message: "Failed to delete group" });
    }
  });

  app.post("/api/groups/:id/join", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;
      const membership = await storage.joinGroup(id, userId);
      res.json(membership);
    } catch (error) {
      res.status(500).json({ message: "Failed to join group" });
    }
  });

  app.post("/api/groups/:id/leave", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;
      const ok = await storage.leaveGroup(id, userId);
      res.json({ success: ok });
    } catch (error) {
      res.status(500).json({ message: "Failed to leave group" });
    }
  });

  app.get("/api/groups/:id/members", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const members = await storage.getGroupMembers(id);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to get members" });
    }
  });

  // Group messages persistence
  app.get("/api/groups/:id/messages", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rows = await (storage as any).getGroupMessages(id, 200);
      res.json(rows);
    } catch (error) {
      console.error("Get group messages error:", error);
      // Fallback to empty list so UI doesn't break even if table doesn't exist yet
      res.json([]);
    }
  });

  app.post("/api/groups/:id/messages", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;
      const { content } = z.object({ content: z.string().min(1) }).parse(req.body || {});
      const row = await (storage as any).createGroupMessage({ groupId: id, userId, content } as any);
      res.json(row);
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.post("/api/groups/:id/posts", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;
      const { content, imageUrl, videoUrl } = req.body || {};
      // Only owner can create posts for now
      const group = await storage.getGroupById(id);
      if (!group || group.creator.id !== userId) {
        return res.status(403).json({ message: "Only owner can post" });
      }
      const post = await storage.createGroupPost({
        groupId: id,
        userId,
        content: content ?? null,
        imageUrl: imageUrl ?? null,
        videoUrl: videoUrl ?? null,
        isPinned: false,
        likesCount: 0,
        commentsCount: 0,
      } as any);
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to create group post" });
    }
  });

  app.get("/api/groups/:id/posts", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const posts = await storage.getGroupPosts(id);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get group posts" });
    }
  });

  app.get("/api/groups/:id/events", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const events = await storage.getGroupEvents(id);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to get group events" });
    }
  });

  app.post("/api/groups/:id/events", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;
      // Only owner can create events
      const group = await storage.getGroupById(id);
      if (!group || group.creator.id !== userId) {
        return res.status(403).json({ message: "Only owner can create events" });
      }
      const parsed = z
        .object({
          title: z.string().min(1),
          description: z.string().optional().nullable(),
          eventDate: z.union([z.string(), z.date()]),
          endDate: z.union([z.string(), z.date()]).optional().nullable(),
          location: z.string().optional().nullable(),
          isVirtual: z.boolean().optional().nullable(),
          meetingLink: z.string().optional().nullable(),
          maxAttendees: z.number().optional().nullable(),
          coverImage: z.string().optional().nullable(),
        })
        .parse(req.body || {});

      const event = await (storage as any).createGroupEvent({
        groupId: id,
        creatorId: userId,
        title: parsed.title,
        description: parsed.description ?? null,
        eventDate:
          typeof parsed.eventDate === "string"
            ? new Date(parsed.eventDate)
            : parsed.eventDate,
        endDate:
          parsed.endDate
            ? typeof parsed.endDate === "string"
              ? new Date(parsed.endDate)
              : parsed.endDate
            : null,
        location: parsed.location ?? null,
        isVirtual: parsed.isVirtual ?? false,
        meetingLink: parsed.meetingLink ?? null,
        maxAttendees: parsed.maxAttendees ?? null,
        coverImage: parsed.coverImage ?? null,
        currentAttendees: 0,
        status: "active",
      } as any);
      res.json(event);
    } catch (error) {
      console.error("Create group event error:", error);
      res.status(500).json({ message: "Failed to create group event" });
    }
  });

  app.put("/api/groups/:groupId/events/:eventId", requireAuth, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const eventId = parseInt(req.params.eventId);
      const userId = req.session.userId as number;
      const group = await storage.getGroupById(groupId);
      if (!group || group.creator.id !== userId) {
        return res.status(403).json({ message: "Only owner can edit events" });
      }
      // For now, update using storage.updateEvent if backed by real events table, else echo
      const updates = req.body || {};
      const result = await (storage as any).updateGroupEvent(eventId, updates);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/groups/:groupId/events/:eventId", requireAuth, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const eventId = parseInt(req.params.eventId);
      const userId = req.session.userId as number;
      const group = await storage.getGroupById(groupId);
      if (!group || group.creator.id !== userId) {
        return res.status(403).json({ message: "Only owner can delete events" });
      }
      await (storage as any).deleteGroupEvent(eventId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  app.get("/api/groups/:id/files", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const files = await storage.getGroupFiles(id);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to get group files" });
    }
  });

  app.post("/api/groups/:id/files", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;
      const group = await storage.getGroupById(id);
      if (!group || group.creator.id !== userId) {
        return res.status(403).json({ message: "Only owner can upload files" });
      }
      const data = { ...req.body, groupId: id, uploaderId: userId };
      const file = await storage.uploadGroupFile(data);
      res.json(file);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload group file" });
    }
  });

  app.put("/api/groups/:groupId/files/:fileId", requireAuth, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const fileId = parseInt(req.params.fileId);
      const userId = req.session.userId as number;
      const group = await storage.getGroupById(groupId);
      if (!group || group.creator.id !== userId) {
        return res.status(403).json({ message: "Only owner can edit files" });
      }
      const updates = req.body || {};
      const f = await (storage as any).updateGroupFile(fileId, updates);
      res.json(f);
    } catch (error) {
      res.status(500).json({ message: "Failed to update group file" });
    }
  });

  app.delete("/api/groups/:groupId/files/:fileId", requireAuth, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const fileId = parseInt(req.params.fileId);
      const userId = req.session.userId as number;
      const group = await storage.getGroupById(groupId);
      if (!group || group.creator.id !== userId) {
        return res.status(403).json({ message: "Only owner can delete files" });
      }
      await (storage as any).deleteGroupFile(fileId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete group file" });
    }
  });

  // ========== HABIT TRACKING API ROUTES ==========
  app.get("/api/habits", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const habits = await storage.getUserHabits(userId);
      res.json(habits);
    } catch (error) {
      res.status(500).json({ message: "Failed to get habits" });
    }
  });

  app.post("/api/habits", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const { name, description, frequency, category, targetValue, unit } = req.body || {};
      if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "Name is required" });
      }
      const habit = await storage.createHabit({
        userId,
        name,
        description: description ?? null,
        frequency: frequency ?? "daily",
        category: category ?? null,
        targetValue: targetValue ?? null,
        unit: unit ?? null,
        isActive: true,
      } as any);
      res.json(habit);
    } catch (error) {
      res.status(500).json({ message: "Failed to create habit" });
    }
  });

  app.get("/api/habit-logs", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const date = (req.query.date as string) || undefined;
      const days = req.query.days ? parseInt(String(req.query.days)) : undefined;
      if (date) {
        const logs = await storage.getHabitLogsForDate(userId, date);
        return res.json(logs);
      }
      const logs = await storage.getHabitLogsForUser(userId, days);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get habit logs" });
    }
  });

  app.post("/api/habit-logs", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const { habitId, date, completed, value, notes } = req.body || {};
      if (!habitId || !date) {
        return res.status(400).json({ message: "habitId and date are required" });
      }
      const log = await storage.logHabit({
        habitId: Number(habitId),
        userId,
        date: new Date(date),
        completed: !!completed,
        value: value ?? null,
        notes: notes ?? null,
      } as any);
      res.json(log);
    } catch (error) {
      res.status(500).json({ message: "Failed to record habit log" });
    }
  });

  app.post("/api/wellness-tracking", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const body = req.body || {};
      const payload = {
        userId,
        date: body.date ? new Date(body.date) : new Date(),
        moodRating: body.moodRating,
        energyLevel: body.energyLevel,
        stressLevel: body.stressLevel,
        sleepHours: body.sleepHours,
        waterIntake: body.waterIntake,
        exerciseMinutes: body.exerciseMinutes,
        notes: body.notes,
        isPrivate: body.isPrivate,
      } as any;
      const record = await storage.recordWellnessTracking(payload);
      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to record wellness tracking" });
    }
  });

  app.put("/api/wellness-tracking/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const id = parseInt(req.params.id);
      const updates = req.body || {};
      const record = await storage.updateWellnessTracking(id, userId, updates);
      res.json(record);
    } catch (error: any) {
      if (String(error.message || "").includes("not found")) {
        return res.status(404).json({ message: "Wellness record not found" });
      }
      res.status(500).json({ message: "Failed to update wellness tracking" });
    }
  });

  app.delete("/api/wellness-tracking/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const id = parseInt(req.params.id);
      const ok = await storage.deleteWellnessTracking(id, userId);
      if (!ok) return res.status(404).json({ message: "Wellness record not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete wellness record" });
    }
  });

  app.get("/api/wellness-tracking/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const days = req.query.days ? parseInt(String(req.query.days)) : undefined;
      const stats = await storage.getWellnessStats(userId, days);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get wellness stats" });
    }
  });

  // ========== EVENTS API ROUTES ==========
  app.get("/api/events", async (req, res) => {
    try {
      const currentUserId = req.session.userId;
      const all = await storage.getEventsWithUserRSVP(currentUserId);
      res.json(all);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ message: "Failed to get events" });
    }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const parsed = z
        .object({
          title: z.string().min(1),
          description: z.string().optional().nullable(),
          date: z.string(),
          time: z.string().optional().nullable(),
          location: z.string().optional().nullable(),
          maxAttendees: z.number().optional().nullable(),
        })
        .parse(req.body);

      const startDate = new Date(
        parsed.time
          ? `${parsed.date}T${parsed.time}`
          : `${parsed.date}T00:00:00`
      );

      const created = await storage.createEvent({
        creatorId: req.session.userId!,
        title: parsed.title,
        description: parsed.description || null,
        eventType: "general", // Default event type
        startDate,
        endDate: null,
        location: parsed.location || null,
        isVirtual: false,
        meetingLink: null,
        maxAttendees: parsed.maxAttendees || null,
        currentAttendees: 0,
        coverImage: null,
      } as any);

      res.json(created);
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const events = await storage.getEvents();
      const ev = events.find((e: any) => e.id === id);
      if (!ev) return res.status(404).json({ message: "Event not found" });
      res.json(ev);
    } catch (error) {
      console.error("Get event error:", error);
      res.status(500).json({ message: "Failed to get event" });
    }
  });

  app.put("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // First check if the event exists and user is the creator
      const existingEvent = await storage.getEvents();
      const event = existingEvent.find(e => e.id === id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.creatorId !== req.session.userId) {
        return res.status(403).json({ message: "You can only edit your own events" });
      }

      const parsed = z
        .object({
          title: z.string().min(1).optional(),
          description: z.string().optional().nullable(),
          eventType: z.string().optional(),
          date: z.string().optional(),
          time: z.string().optional().nullable(),
          location: z.string().optional().nullable(),
          maxAttendees: z.number().optional().nullable(),
        })
        .parse(req.body);

      const updates: Partial<InsertEvent> = {};
      
      if (parsed.title) updates.title = parsed.title;
      if (parsed.description !== undefined) updates.description = parsed.description;
      if (parsed.eventType) updates.eventType = parsed.eventType;
      if (parsed.location !== undefined) updates.location = parsed.location;
      if (parsed.maxAttendees !== undefined) updates.maxAttendees = parsed.maxAttendees;
      
      if (parsed.date) {
        const startDate = new Date(
          parsed.time
            ? `${parsed.date}T${parsed.time}`
            : `${parsed.date}T00:00:00`
        );
        updates.startDate = startDate;
      }

      const updatedEvent = await storage.updateEvent(id, updates);
      res.json(updatedEvent);
    } catch (error) {
      console.error("Update event error:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // First check if the event exists and user is the creator
      const existingEvent = await storage.getEvents();
      const event = existingEvent.find(e => e.id === id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.creatorId !== req.session.userId) {
        return res.status(403).json({ message: "You can only delete your own events" });
      }

      await storage.deleteEvent(id);
      res.json({ success: true, message: "Event deleted successfully" });
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  app.post("/api/events/:id/rsvp", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = z.object({ status: z.string() }).parse(req.body);
      const attendee = await storage.respondToEvent(
        id,
        req.session.userId!,
        status
      );
      res.json(attendee);
    } catch (error) {
      console.error("RSVP error:", error);
      res.status(500).json({ message: "Failed to RSVP" });
    }
  });

  app.get("/api/events/:id/attendees", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const list = await storage.getEvents();
      const ev = list.find((e: any) => e.id === id);
      res.json({ attendees: ev?.attendeeCount || 0 });
    } catch (error) {
      console.error("Get attendees error:", error);
      res.status(500).json({ message: "Failed to get attendees" });
    }
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationRead(id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.session.userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Search routes
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const type = (req.query.type as string) || "all";

      if (!query) {
        return res.json({ users: [], posts: [] });
      }

      let users = [];
      let posts = [];

      if (type === "all" || type === "users") {
        users = await storage.searchUsers(query);
      }

      if (type === "all" || type === "posts") {
        posts = await storage.searchPosts(query);
      }

      res.json({ users, posts });
    } catch (error) {
      res.status(500).json({ message: "Failed to search" });
    }
  });

  // Serve uploaded files
  app.use("/uploads", express.static("uploads"));

  // Live streams endpoints
  app.post(
    "/api/live-streams",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const body = z
          .object({
            title: z.string().min(1),
            description: z.string().optional(),
            privacy: z.enum(["public", "friends", "private"]).optional(),
          })
          .parse(req.body);

        const liveStream = await storage.createLiveStream({
          userId: req.session.userId!,
          title: body.title.trim(),
          description: body.description?.trim() || null,
          privacy: body.privacy || "public",
        } as any);

        res.json(liveStream);
      } catch (error) {
        console.error("Create live stream error:", error);
        res.status(500).json({ message: "Failed to create live stream" });
      }
    }
  );

  app.get("/api/live-streams", async (_req: Request, res: Response) => {
    try {
      const activeStreams = await storage.getActiveLiveStreams();
      res.json(activeStreams);
    } catch (error) {
      console.error("Get live streams error:", error);
      res.status(500).json({ message: "Failed to get live streams" });
    }
  });

  app.get("/api/live-streams/:id", async (req: Request, res: Response) => {
    try {
      const streamId = parseInt(req.params.id);
      const stream = await storage.getLiveStreamById(streamId);
      
      if (!stream) {
        return res.status(404).json({ message: "Live stream not found" });
      }
      
      res.json(stream);
    } catch (error) {
      console.error("Get live stream error:", error);
      res.status(500).json({ message: "Failed to get live stream" });
    }
  });

  // Get chat messages for a live stream
  app.get("/api/live-streams/:id/chat", async (req: Request, res: Response) => {
    try {
      const streamId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const messages = await storage.getLiveStreamChatMessages(streamId, limit, offset);
      res.json(messages);
    } catch (error) {
      console.error("Get live stream chat messages error:", error);
      res.status(500).json({ message: "Failed to get chat messages" });
    }
  });

  app.put(
    "/api/live-streams/:id/end",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const streamId = parseInt(req.params.id);
        const userId = req.session.userId!;
        
        console.log("Ending live stream:", { streamId, userId });
        
        const success = await storage.endLiveStream(
          streamId,
          userId
        );

        console.log("End live stream result:", success);

        if (!success) {
          console.log("Stream not found or not authorized");
          return res
            .status(404)
            .json({ message: "Live stream not found or not authorized" });
        }

        console.log("Live stream ended successfully");
        res.json({ message: "Live stream ended successfully" });
      } catch (error) {
        console.error("End live stream error:", error);
        res.status(500).json({ message: "Failed to end live stream" });
      }
    }
  );

  // Friend Request Routes
  app.post("/api/friend-requests", requireAuth, async (req, res) => {
    try {
      const { receiverId, message } = z
        .object({
          receiverId: z.number(),
          message: z.string().optional(),
        })
        .parse(req.body);

      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (receiverId === userId) {
        return res
          .status(400)
          .json({ error: "Cannot send friend request to yourself" });
      }

      // Check if users exist
      const [sender, receiver] = await Promise.all([
        storage.getUserById(userId),
        storage.getUserById(receiverId),
      ]);

      if (!sender || !receiver) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if friendship already exists
      const existingFriendship = await storage.getFriendship(
        userId,
        receiverId
      );
      if (existingFriendship) {
        return res.status(400).json({ error: "Already friends" });
      }

      // Check if there's already a pending request
      const existingRequest = await storage.getFriendRequest(
        userId,
        receiverId
      );
      if (existingRequest) {
        return res.status(400).json({ error: "Friend request already sent" });
      }

      // Create friend request
      const friendRequest = await storage.createFriendRequest({
        senderId: userId,
        receiverId,
        message: message || null,
      });

      // Create notification
      await storage.createNotification({
        userId: receiverId,
        type: "friend_request",
        fromUserId: userId,
        metadata: JSON.stringify({ requestId: friendRequest.id }),
      });

      res.json(friendRequest);
    } catch (error) {
      console.error("Error creating friend request:", error);
      res.status(500).json({ error: "Failed to send friend request" });
    }
  });

  app.get("/api/friend-requests/received", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const requests = await storage.getReceivedFriendRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching received friend requests:", error);
      res.status(500).json({ error: "Failed to fetch friend requests" });
    }
  });

  app.get("/api/friend-requests/sent", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const requests = await storage.getSentFriendRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching sent friend requests:", error);
      res.status(500).json({ error: "Failed to fetch sent friend requests" });
    }
  });

  app.put("/api/friend-requests/:id", requireAuth, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const { action } = z
        .object({
          action: z.enum(["accept", "decline"]),
        })
        .parse(req.body);

      const request = await storage.getFriendRequestById(requestId);
      if (!request) {
        return res.status(404).json({ error: "Friend request not found" });
      }

      if (request.receiverId !== req.session.userId) {
        return res
          .status(403)
          .json({ error: "Not authorized to respond to this request" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({ error: "Request already responded to" });
      }

      if (action === "accept") {
        // Create friendship
        await storage.createFriendship({
          user1Id: request.senderId,
          user2Id: request.receiverId,
        });

        // Create notification for sender
        await storage.createNotification({
          userId: request.senderId,
          type: "friend_request_accepted",
          fromUserId: req.session.userId,
        });
      }

      // Update request status
      await storage.updateFriendRequestStatus(
        requestId,
        action === "accept" ? "accepted" : "declined"
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error responding to friend request:", error);
      res.status(500).json({ error: "Failed to respond to friend request" });
    }
  });

  app.delete("/api/friend-requests/:id", requireAuth, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const request = await storage.getFriendRequestById(requestId);

      if (!request) {
        return res.status(404).json({ error: "Friend request not found" });
      }

      if (request.senderId !== req.session.userId) {
        return res
          .status(403)
          .json({ error: "Not authorized to cancel this request" });
      }

      await storage.deleteFriendRequest(requestId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error canceling friend request:", error);
      res.status(500).json({ error: "Failed to cancel friend request" });
    }
  });

  // Friends Routes
  app.get("/api/friends", requireAuth, async (req, res) => {
    try {
      const friends = await storage.getUserFriends(req.session.userId);
      res.json(friends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ error: "Failed to fetch friends" });
    }
  });

  app.delete("/api/friends/:id", requireAuth, async (req, res) => {
    try {
      const friendId = parseInt(req.params.id);

      if (friendId === req.session.userId) {
        return res.status(400).json({ error: "Cannot unfriend yourself" });
      }

      const friendship = await storage.getFriendship(
        req.session.userId,
        friendId
      );
      if (!friendship) {
        return res.status(404).json({ error: "Friendship not found" });
      }

      await storage.deleteFriendship(friendship.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing friend:", error);
      res.status(500).json({ error: "Failed to remove friend" });
    }
  });

  // Friend Suggestions Route
  app.get("/api/friend-suggestions", requireAuth, async (req, res) => {
    try {
      const suggestions = await storage.getFriendSuggestions(
        req.session.userId
      );
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching friend suggestions:", error);
      res.status(500).json({ error: "Failed to fetch friend suggestions" });
    }
  });

  const httpServer = createServer(app);

  // Set up WebSocket server for live streaming
  let wss: WebSocketServer | null = null;
  try {
    wss = new WebSocketServer({
      server: httpServer,
      path: "/ws",
    });
    console.log("WebSocket server initialized successfully");
  } catch (error) {
    console.warn("Failed to initialize WebSocket server:", error);
    console.log("Continuing without WebSocket support...");
  }

  if (wss) {
    wss.on("connection", (ws: WebSocket, req) => {
      const joinedGroups = new Set<number>();
      let currentStreamId: number | null = null;
      let socketId: string = Math.random().toString(36).substring(7);
      let currentUserId: number | null = null;
      let isHost = false;

      console.log("New WebSocket connection established");

      ws.on("message", async (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log("WebSocket message received:", data.type);

          switch (data.type) {
            // ========== GROUP CHAT ==========
            case "group:join": {
              if (typeof data.groupId === "number") {
                joinedGroups.add(data.groupId);
                ws.send(JSON.stringify({ type: "group:joined", groupId: data.groupId }));
              }
              break;
            }
            case "group:leave": {
              if (typeof data.groupId === "number") {
                joinedGroups.delete(data.groupId);
                ws.send(JSON.stringify({ type: "group:left", groupId: data.groupId }));
              }
              break;
            }
            case "group:message": {
              if (typeof data.groupId === "number" && typeof data.content === "string") {
                const payload = {
                  type: "group:message",
                  groupId: data.groupId,
                  content: data.content,
                  userId: data.userId || null,
                  username: data.username || null,
                  timestamp: Date.now(),
                };
                // broadcast to all sockets that joined this group
                if (wss) {
                  wss.clients.forEach((client) => {
                    try {
                      // naive: send to everyone; client filters by groupId
                      if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(payload));
                      }
                    } catch {}
                  });
                }
              }
              break;
            }
            // ========== END GROUP CHAT ==========
            case "join": {
              if (data.userId) {
                currentUserId = data.userId;
                console.log('👤 SERVER: User', currentUserId, 'joined for messaging');
              }
              break;
            }
            case "join_stream":
              currentStreamId = data.streamId;
              currentUserId = data.userId;
              isHost = false;

              if (!liveStreamViewers.has(currentStreamId)) {
                liveStreamViewers.set(currentStreamId, new Set());
              }
              liveStreamViewers.get(currentStreamId)!.add(socketId);
              streamSockets.set(ws, {
                streamId: currentStreamId,
                userId: currentUserId,
                isHost: false,
              });

              // Broadcast viewer count update
              broadcastViewerCountUpdate(currentStreamId);

              // Notify other viewers that someone joined
              broadcastToStream(
                currentStreamId,
                {
                  type: "user_joined",
                  streamId: currentStreamId,
                  userId: currentUserId,
                  username: data.username || `User ${currentUserId}`,
                  userAvatar: data.userAvatar,
                },
                ws
              );

              console.log(
                `User ${currentUserId} joined stream ${currentStreamId}`
              );
              break;

            case "join_stream_as_host":
            case "live-stream:host":
              console.log("Host joining stream:", data);
              currentStreamId = data.streamId;
              currentUserId = data.userId;
              isHost = true;

              liveStreamHosts.set(currentStreamId, ws);
              streamSockets.set(ws, {
                streamId: currentStreamId,
                userId: currentUserId,
                isHost: true,
              });
              
              console.log("Host connected to stream:", currentStreamId);
              console.log("Total hosts connected:", liveStreamHosts.size);

              if (!liveStreamViewers.has(currentStreamId)) {
                liveStreamViewers.set(currentStreamId, new Set());
              }
              liveStreamViewers.get(currentStreamId)!.add(socketId);

              // Broadcast viewer count update
              broadcastViewerCountUpdate(currentStreamId);

              console.log(
                `Host ${currentUserId} started stream ${currentStreamId}`
              );
              break;

            case "leave_stream":
              if (currentStreamId) {
                if (isHost) {
                  // Host is leaving, end the stream
                  liveStreamHosts.delete(currentStreamId);
                  broadcastToStream(currentStreamId, {
                    type: "stream_ended",
                    streamId: currentStreamId,
                  });
                } else {
                  // Viewer is leaving
                  if (liveStreamViewers.has(currentStreamId)) {
                    liveStreamViewers.get(currentStreamId)!.delete(socketId);
                    if (liveStreamViewers.get(currentStreamId)!.size === 0) {
                      liveStreamViewers.delete(currentStreamId);
                    }
                  }

                  // Notify other viewers that someone left
                  broadcastToStream(
                    currentStreamId,
                    {
                      type: "user_left",
                      streamId: currentStreamId,
                      userId: currentUserId,
                    },
                    ws
                  );

                  // Broadcast viewer count update
                  broadcastViewerCountUpdate(currentStreamId);
                }
              }
              break;

            case "send_chat_message":
              if (currentStreamId && currentUserId) {
                const messageId = Date.now().toString();
                const messageData = {
                  type: "chat_message",
                  streamId: currentStreamId,
                  messageId,
                  userId: currentUserId,
                  username: data.username || `User ${currentUserId}`,
                  userAvatar: data.userAvatar,
                  message: data.message,
                  timestamp: new Date().toISOString(),
                };

                // Store the message in the database
                (async () => {
                  try {
                    await storage.createLiveStreamChatMessage({
                      streamId: currentStreamId,
                      userId: currentUserId,
                      username: data.username || `User ${currentUserId}`,
                      userAvatar: data.userAvatar,
                      message: data.message,
                      messageType: "text",
                    });
                  } catch (error) {
                    console.error("Error storing chat message:", error);
                  }
                })();

                // Broadcast to all viewers in the stream
                broadcastToStream(currentStreamId, messageData);
              }
              break;

            case "send_reaction":
              if (currentStreamId && currentUserId) {
                const reactionData = {
                  type: "reaction",
                  streamId: currentStreamId,
                  userId: currentUserId,
                  username: data.username || `User ${currentUserId}`,
                  userAvatar: data.userAvatar,
                  reactionType: data.reactionType,
                };

                // Store the reaction in the database
                (async () => {
                  try {
                    await storage.createLiveStreamChatMessage({
                      streamId: currentStreamId,
                      userId: currentUserId,
                      username: data.username || `User ${currentUserId}`,
                      userAvatar: data.userAvatar,
                      message: data.reactionType,
                      messageType: "reaction",
                    });
                  } catch (error) {
                    console.error("Error storing reaction:", error);
                  }
                })();

                // Broadcast to all viewers in the stream
                broadcastToStream(currentStreamId, reactionData);
              }
              break;

            // WebRTC signaling messages
            case "request-offer":
              if (currentStreamId && !isHost) {
                // Viewer requests offer from host
                const hostWs = liveStreamHosts.get(currentStreamId);
                if (hostWs) {
                  hostWs.send(
                    JSON.stringify({
                      type: "create-offer",
                      streamId: currentStreamId,
                      targetUserId: currentUserId,
                    })
                  );
                }
              }
              break;

            case "create-offer":
              if (currentStreamId && isHost) {
                // Host creates offer for specific viewer
                const targetUserId = data.targetUserId;
                if (targetUserId) {
                  // Find the viewer's WebSocket and send create-offer message
                  wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN && client !== ws) {
                      const streamInfo = streamSockets.get(client);
                      if (
                        streamInfo &&
                        streamInfo.streamId === currentStreamId &&
                        streamInfo.userId === targetUserId
                      ) {
                        client.send(
                          JSON.stringify({
                            type: "create-offer",
                            streamId: currentStreamId,
                            fromUserId: currentUserId,
                          })
                        );
                      }
                    }
                  });
                }
              }
              break;

            case "offer":
              if (currentStreamId) {
                if (isHost) {
                  // Host's offer goes to specific viewer
                  const targetUserId = data.targetUserId;
                  if (targetUserId) {
                    // Find the viewer's WebSocket
                    wss.clients.forEach((client) => {
                      if (
                        client.readyState === WebSocket.OPEN &&
                        client !== ws
                      ) {
                        const streamInfo = streamSockets.get(client);
                        if (
                          streamInfo &&
                          streamInfo.streamId === currentStreamId &&
                          streamInfo.userId === targetUserId
                        ) {
                          client.send(
                            JSON.stringify({
                              type: "offer",
                              streamId: currentStreamId,
                              offer: data.offer,
                              fromUserId: currentUserId,
                            })
                          );
                        }
                      }
                    });
                  }
                } else {
                  // Forward offer from viewer to host
                  const hostWs = liveStreamHosts.get(currentStreamId);
                  if (hostWs) {
                    hostWs.send(
                      JSON.stringify({
                        type: "offer",
                        streamId: currentStreamId,
                        offer: data.offer,
                        fromUserId: currentUserId,
                      })
                    );
                  }
                }
              }
              break;

            case "answer":
              if (currentStreamId) {
                if (isHost) {
                  // Forward answer from host to all viewers
                  broadcastToStream(
                    currentStreamId,
                    {
                      type: "answer",
                      streamId: currentStreamId,
                      answer: data.answer,
                      fromUserId: currentUserId,
                    },
                    ws
                  );
                } else {
                  // Forward answer from viewer to host
                  const hostWs = liveStreamHosts.get(currentStreamId);
                  if (hostWs) {
                    hostWs.send(
                      JSON.stringify({
                        type: "answer",
                        streamId: currentStreamId,
                        answer: data.answer,
                        fromUserId: currentUserId,
                      })
                    );
                  }
                }
              }
              break;

            case "ice-candidate":
              if (currentStreamId) {
                // Forward ICE candidate to the other peer
                if (isHost) {
                  // Host's ICE candidate goes to all viewers
                  broadcastToStream(
                    currentStreamId,
                    {
                      type: "ice-candidate",
                      streamId: currentStreamId,
                      candidate: data.candidate,
                      fromUserId: currentUserId,
                    },
                    ws
                  );
                } else {
                  // Viewer's ICE candidate goes to host
                  const hostWs = liveStreamHosts.get(currentStreamId);
                  if (hostWs) {
                    hostWs.send(
                      JSON.stringify({
                        type: "ice-candidate",
                        streamId: currentStreamId,
                        candidate: data.candidate,
                        fromUserId: currentUserId,
                      })
                    );
                  }
                }
              }
              break;

            case "webrtc-signaling": {
              console.log('📞 SERVER: WebRTC signaling message received!');
              console.log('📞 SERVER: Current user ID:', currentUserId);
              console.log('📞 SERVER: Data:', data);
              
              if (!currentUserId) {
                console.log('❌ SERVER: No current user ID set! User needs to join first.');
                break;
              }
              
              const signalingData = data.data;
              
              console.log('📞 SERVER: WebRTC signaling received from user', currentUserId);
              console.log('📞 SERVER: Signaling data:', signalingData);
              
              // Handle different signaling message structures
              let targetUserId;
              if (signalingData.to) {
                targetUserId = signalingData.to;
              } else if (signalingData.data && signalingData.data.to) {
                targetUserId = signalingData.data.to;
              }
              
              console.log('📞 SERVER: Target user ID:', targetUserId);
              
              // Forward signaling message to the target user
              if (wss && targetUserId) {
                wss.clients.forEach((client) => {
                  try {
                    if (client.readyState === WebSocket.OPEN && client !== ws) {
                      // Send to all clients - they'll filter by user ID
                      const messageToSend = {
                        type: "webrtc-signaling",
                        data: {
                          ...signalingData,
                          from: currentUserId,
                          to: targetUserId
                        }
                      };
                      console.log('📞 SERVER: Forwarding WebRTC message:', messageToSend);
                      client.send(JSON.stringify(messageToSend));
                    }
                  } catch (error) {
                    console.error('Error forwarding WebRTC message:', error);
                  }
                });
              } else {
                console.log('❌ SERVER: No target user ID found or no WebSocket server');
              }
              break;
            }

            case "audio_data":
              // Forward audio data to all viewers of this stream
              if (currentStreamId && isHost) {
                console.log("Forwarding audio data to viewers of stream:", currentStreamId);
                const viewers = liveStreamViewers.get(currentStreamId);
                if (viewers) {
                  // Find all WebSocket connections for this stream
                  streamSockets.forEach((socketInfo, socketWs) => {
                    if (socketInfo.streamId === currentStreamId && !socketInfo.isHost && socketWs.readyState === WebSocket.OPEN) {
                      try {
                        socketWs.send(JSON.stringify({
                          type: "audio_data",
                          streamId: currentStreamId,
                          audioData: data.audioData,
                          sampleRate: data.sampleRate,
                          timestamp: data.timestamp
                        }));
                      } catch (error) {
                        console.error("Error sending audio data to viewer:", error);
                      }
                    }
                  });
                }
              }
              break;

            case "video_frame":
              // Forward video frame to all viewers of this stream
              if (currentStreamId && isHost) {
                console.log("Forwarding video frame to viewers of stream:", currentStreamId);
                const viewers = liveStreamViewers.get(currentStreamId);
                if (viewers) {
                  // Find all WebSocket connections for this stream
                  streamSockets.forEach((socketInfo, socketWs) => {
                    if (socketInfo.streamId === currentStreamId && !socketInfo.isHost && socketWs.readyState === WebSocket.OPEN) {
                      try {
                        socketWs.send(JSON.stringify({
                          type: "video_frame",
                          streamId: currentStreamId,
                          frameData: data.frameData,
                          timestamp: data.timestamp
                        }));
                      } catch (error) {
                        console.error("Error sending video frame to viewer:", error);
                      }
                    }
                  });
                }
              }
              break;

            default:
              console.log("Unknown WebSocket message type:", data.type);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });

      ws.on("close", () => {
        console.log("WebSocket connection closed");

        if (currentStreamId) {
          if (isHost) {
            // Host disconnected, end the stream
            liveStreamHosts.delete(currentStreamId);
            broadcastToStream(currentStreamId, {
              type: "stream_ended",
              streamId: currentStreamId,
            });
          } else {
            // Viewer disconnected
            if (liveStreamViewers.has(currentStreamId)) {
              liveStreamViewers.get(currentStreamId)!.delete(socketId);
              if (liveStreamViewers.get(currentStreamId)!.size === 0) {
                liveStreamViewers.delete(currentStreamId);
              }
            }

            // Notify other viewers that someone left
            if (currentUserId) {
              broadcastToStream(
                currentStreamId,
                {
                  type: "user_left",
                  streamId: currentStreamId,
                  userId: currentUserId,
                },
                ws
              );
            }

            // Broadcast viewer count update
            broadcastViewerCountUpdate(currentStreamId);
          }
        }

        streamSockets.delete(ws);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });
  }

  // Helper function to broadcast to all viewers in a stream
  function broadcastToStream(
    streamId: number,
    data: any,
    excludeWs?: WebSocket
  ) {
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
          const streamInfo = streamSockets.get(client);
          if (streamInfo && streamInfo.streamId === streamId) {
            client.send(JSON.stringify(data));
          }
        }
      });
    }
  }

  // Helper function to broadcast viewer count updates
  function broadcastViewerCountUpdate(streamId: number) {
    const viewerCount = liveStreamViewers.get(streamId)?.size || 0;
    const updateData = {
      type: "viewer_count_update",
      streamId,
      viewerCount,
    };

    broadcastToStream(streamId, updateData);
  }

  return httpServer;
}
