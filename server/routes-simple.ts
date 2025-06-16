import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
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
  insertNotificationSchema 
} from "@shared/schema";
import nodemailer from "nodemailer";

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Basic health check
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Auth endpoints (simplified for now)
  app.post("/api/auth/send-otp", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      await storage.createOtpCode({ email, code: otp, expiresAt });
      
      // Send OTP via email
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || "noreply@example.com",
        to: email,
        subject: "Your Login Code",
        text: `Your login code is: ${otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
            <h2 style="color: #333;">Your Login Code</h2>
            <p>Use this code to complete your login:</p>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb;">${otp}</span>
            </div>
            <p style="color: #666;">This code will expire in 10 minutes.</p>
          </div>
        `,
      });
      
      res.json({ message: "OTP sent successfully" });
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const { email, code, name, username } = req.body;
      
      const validOtp = await storage.getValidOtpCode(email, code);
      if (!validOtp) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      await storage.markOtpCodeUsed(validOtp.id);

      let user = await storage.getUserByEmail(email);
      if (!user && name && username) {
        user = await storage.createUser({
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
      }

      if (!user) {
        return res.status(400).json({ message: "User not found. Please provide name and username." });
      }

      res.json({ user });
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  // Posts endpoints
  app.get("/api/posts", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getPosts();
      res.json(posts);
    } catch (error) {
      console.error("Get posts error:", error);
      res.status(500).json({ error: "Failed to get posts" });
    }
  });

  app.post("/api/posts", async (req: Request, res: Response) => {
    try {
      const { content, imageUrl, videoUrl, privacy } = req.body;
      const userId = 1; // Hardcoded for now
      
      const post = await storage.createPost({
        userId,
        content: content || null,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        privacy: privacy || "public",
      });
      
      const postWithUser = await storage.getPost(post.id);
      res.json(postWithUser);
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({ error: "Failed to create post" });
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

  return httpServer;
}