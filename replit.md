# Social Media Platform - Compressed Architecture Overview

## Overview
This project is a full-stack social media platform designed to offer a comprehensive suite of social interaction, content sharing, and personal wellness features. It includes real-time messaging, diverse content posting with media support, secure OTP-based user authentication, and extensive social functionalities like likes, comments, follows, stories, and live streaming. The platform also integrates wellness tracking, community groups, and robust admin capabilities, aiming to create an engaging and feature-rich user experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with Shadcn/UI and Radix UI components for a modern, consistent design system.
- **Routing**: Wouter for efficient client-side navigation.
- **State Management**: TanStack Query (React Query) for effective server state handling.

### Technical Implementations
- **Backend**: Node.js with Express.js, written in TypeScript with ES modules.
- **Real-time**: WebSocket integration for live messaging, notifications, and presence.
- **Authentication**: OTP-based email authentication, server-side sessions stored in PostgreSQL, and support for multiple user roles (user, admin, super admin) with impersonation capabilities.
- **Content Handling**: Multer for media uploads, integrated with AWS S3 for storage. Supports various post types including text, images, videos, stories, and live streams, with granular privacy controls.
- **Social Features**: Comprehensive follow system, friend requests, community groups with moderation, and detailed privacy settings for profiles and content.
- **Wellness Features**: Mood, energy, stress, sleep, exercise, and habit tracking functionalities.

### System Design Choices
- **Database**: PostgreSQL managed with Drizzle ORM, utilizing Neon for serverless connections. The schema is designed to support all social media features, including users, posts, messages, notifications, and wellness data.
- **Scalability**: Designed with considerations for database connection pooling, CDN integration for S3, and WebSocket scaling.

## External Dependencies

- **Database**: Neon serverless PostgreSQL.
- **File Storage**: AWS S3 for media file storage.
- **Email Service**: Nodemailer for OTP delivery.
- **Session Store**: PostgreSQL for session management.
- **AWS SDK**: Used for S3 operations, including presigned URLs.
- **WebSocket**: Native WebSocket implementation for real-time features.