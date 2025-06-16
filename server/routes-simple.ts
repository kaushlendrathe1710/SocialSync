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

// Extend session data interface
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    verifiedEmail?: string;
    otpId?: number;
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
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
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
      } else {
        // Returning user - mark OTP as used and login
        await storage.markOtpCodeUsed(validOtp.id);
        req.session.userId = user.id;
        return res.json({ user, isNewUser: false });
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

      res.json({ user });
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