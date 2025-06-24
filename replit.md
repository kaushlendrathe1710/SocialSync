# Social Media Platform - Architecture Overview

## Overview

This is a full-stack social media platform built with a React frontend, Express backend, and PostgreSQL database. The application features real-time messaging, post creation with media support, user authentication via OTP, comprehensive social features (likes, comments, follows), stories, live streaming capabilities, wellness tracking, community groups, and admin functionality.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Styling**: Tailwind CSS with Shadcn/UI components
- **Build Tool**: Vite for development and build process
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Session Management**: Express sessions with PostgreSQL store
- **Real-time Features**: WebSocket integration for live messaging and notifications
- **File Upload**: Multer for handling media uploads
- **Email Service**: Nodemailer for OTP delivery

### Database Design
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Connection**: Neon serverless PostgreSQL with HTTP connections
- **Schema**: Comprehensive social media schema including users, posts, comments, likes, follows, messages, stories, notifications, wellness tracking, and more

## Key Components

### Authentication System
- **OTP-based Authentication**: Email-based one-time password system
- **Session Management**: Server-side sessions with PostgreSQL storage
- **User Roles**: Support for regular users, admins, and super admins
- **Impersonation**: Admin capability to impersonate users

### Content Management
- **Post Creation**: Text, image, and video posts with privacy controls
- **Media Handling**: AWS S3 integration for file storage and management
- **Content Types**: Regular posts, stories (ephemeral content), live streams
- **Reactions**: Extended reaction system beyond simple likes
- **Comments**: Nested commenting with reactions

### Real-time Features
- **Live Messaging**: WebSocket-based real-time chat system
- **Notifications**: Real-time push notifications for user interactions
- **Live Streaming**: Basic live video streaming capabilities
- **Online Status**: Real-time user presence tracking

### Social Features
- **Follow System**: User following and follower relationships
- **Friend Requests**: Formal friendship system with requests
- **Community Groups**: User-created communities with moderation
- **Privacy Controls**: Granular privacy settings for posts and profiles

### Wellness & Lifestyle
- **Wellness Tracking**: Mood, energy, stress, sleep, and exercise tracking
- **Habit Tracking**: Goal setting and progress monitoring
- **Beauty & Shopping**: Product reviews, wishlists, and shopping posts
- **Events**: Event creation and attendance management

## Data Flow

### Authentication Flow
1. User enters email address
2. Server generates and sends OTP via email
3. User enters OTP for verification
4. New users complete profile setup
5. Session established with persistent login

### Post Creation Flow
1. User creates post with optional media
2. Media files uploaded to AWS S3
3. Post metadata stored in PostgreSQL
4. Real-time updates pushed to followers
5. Notifications sent to relevant users

### Real-time Messaging Flow
1. WebSocket connection established on login
2. Messages sent through WebSocket server
3. Messages persisted to database
4. Delivery confirmations and read receipts
5. Offline message queuing

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **File Storage**: AWS S3 for media file storage
- **Email Service**: SMTP configuration for OTP delivery
- **Session Store**: PostgreSQL-based session storage

### Development Tools
- **Type Safety**: Full TypeScript implementation
- **Code Quality**: ESLint and Prettier configuration
- **Build Process**: Vite for fast development and optimized builds
- **Environment**: Replit-optimized development environment

### Third-party Services
- **AWS SDK**: S3 client for file operations with presigned URLs
- **Nodemailer**: Email delivery service integration
- **WebSocket**: Native WebSocket implementation for real-time features

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20 runtime
- **Database**: Neon PostgreSQL with automatic provisioning
- **File Serving**: Local development with Vite dev server
- **Hot Reload**: Vite HMR with React Fast Refresh

### Production Deployment
- **Build Process**: Vite production build with asset optimization
- **Server Bundle**: ESBuild for backend compilation
- **Static Assets**: Served from dist/public directory
- **Database Deployment**: Drizzle migrations with schema versioning
- **Environment Variables**: Secure configuration management

### Scalability Considerations
- **Database**: Connection pooling with optimized query patterns
- **File Storage**: CDN-ready S3 integration with proper caching
- **Real-time**: WebSocket scaling considerations for multiple instances
- **Session Storage**: PostgreSQL-based sessions for horizontal scaling

## Changelog

- June 24, 2025: Fixed Settings and Privacy security section buttons (AN011) - added missing onClick handlers to security buttons in settings modal, enabling View Login Activity, Manage Devices, Apps and Websites, and Log Out All Devices functionality
- June 24, 2025: Fixed Settings and Privacy account section buttons (AN010) - added missing onClick handlers to account buttons in settings modal, enabling proper navigation and functionality for Edit Profile, Change Email, Change Password, Download Data, and Delete Account features
- June 24, 2025: Fixed messages page blank screen (AN009) - corrected undefined selectedFile variable reference to use selectedFiles array, preventing component crash when clicking message icon
- June 24, 2025: Fixed duplicate share icons (AN008) - removed redundant SharePostButton component from enhanced post card, keeping only ShareDropdown to prevent duplicate share buttons
- June 24, 2025: Fixed community group category filtering (AN007) - corrected React Query implementation to properly pass category parameters to server-side filtering API
- June 24, 2025: Fixed explore page post opening functionality (AN006) - created full-size post detail modal with media display, video controls, and interactive features for trending posts
- June 24, 2025: Fixed messages three dots menu functionality (AN005) - replaced Popover with DropdownMenu component, added proper click handlers for mark all as read and refresh functionality
- June 24, 2025: Fixed saved posts functionality (AN004) - created proper saved posts database table, API endpoints, and updated frontend to use dedicated save system instead of confusing it with likes
- June 24, 2025: Fixed events functionality (AN003) - removed duplicate API endpoints, fixed database schema requirements, and created comprehensive Events page
- June 24, 2025: Fixed public post sharing functionality - resolved table import issues in server routes
- June 24, 2025: Fixed community join functionality - added authentication middleware and membership validation
- June 24, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.