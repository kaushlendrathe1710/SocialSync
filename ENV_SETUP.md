# Environment Configuration Setup

This guide explains how to set up the environment variables for your social media platform.

## Environment Files

The project uses multiple environment files for different deployment scenarios:

- `.env` - Local development environment (not tracked by git)
- `.env.example` - Template showing all required variables (tracked by git)
- `.env.production` - Production environment configuration (not tracked by git)

## Required Environment Variables

### Database Configuration
```
DATABASE_URL=postgresql://username:password@localhost:5432/socialconnect
```
- Required for PostgreSQL database connection
- In production, use your hosted database URL (e.g., Neon, Supabase, RDS)

### Session Configuration
```
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
```
- Used for session encryption and security
- Must be a strong, unique string in production
- Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Email Configuration (SMTP)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@socialconnect.com
```
- Required for sending OTP emails during authentication
- For Gmail: Use App Passwords instead of regular password
- For other providers: Use their SMTP settings

### AWS S3 Configuration
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET_NAME=your-s3-bucket-name
```
- Required for file uploads (images, videos, documents)
- Create S3 bucket and IAM user with appropriate permissions
- Ensure bucket has public read permissions for media serving

## Setup Instructions

### 1. Copy Environment Template
```bash
cp .env.example .env
```

### 2. Fill in Your Values
Edit the `.env` file with your actual configuration values:

**Database (if using local PostgreSQL):**
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/socialconnect
```

**Database (if using Neon/Supabase):**
```
DATABASE_URL=postgresql://username:password@host:5432/database_name
```

**Email (Gmail example):**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
FROM_EMAIL=noreply@yourdomain.com
```

**AWS S3:**
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET_NAME=your-social-media-bucket
```

### 3. Create Database Tables
```bash
npm run db:push
```

### 4. Start the Application
```bash
npm run dev
```

## Production Setup

### 1. Copy Production Template
```bash
cp .env.production .env
```

### 2. Update Production Values
- Use strong, unique SESSION_SECRET
- Use production database URL
- Configure production SMTP settings
- Set up production S3 bucket

### 3. Set Environment Variables
For deployment platforms like Replit, Vercel, or Heroku:
- Add all environment variables through their dashboard
- Never commit .env files to version control

## Security Notes

- ✅ `.env.example` is tracked by git (contains no secrets)
- ❌ `.env` and `.env.production` are NOT tracked by git
- ❌ Never commit real credentials to version control
- ✅ Use different credentials for development and production
- ✅ Generate strong SESSION_SECRET for production
- ✅ Use environment-specific S3 buckets

## Common Issues

### Database Connection
- Ensure PostgreSQL is running locally
- Check DATABASE_URL format is correct
- Verify database exists and user has permissions

### Email Not Sending
- Check SMTP credentials are correct
- For Gmail: Enable 2FA and use App Password
- Verify firewall allows SMTP port access

### File Upload Issues
- Verify AWS credentials are correct
- Check S3 bucket permissions
- Ensure bucket name is globally unique

## Testing Configuration

To test if your environment is properly configured:

```bash
# Test database connection
npm run db:push

# Test email sending (check server logs)
# Start app and try to sign up with email

# Test S3 uploads
# Upload a file through the app interface
```

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| DATABASE_URL | Yes | PostgreSQL connection string | postgresql://user:pass@host:5432/db |
| SESSION_SECRET | Yes | Session encryption key | random-32-char-string |
| SMTP_HOST | Yes | SMTP server hostname | smtp.gmail.com |
| SMTP_PORT | Yes | SMTP server port | 587 |
| SMTP_USER | Yes | SMTP username | your-email@gmail.com |
| SMTP_PASS | Yes | SMTP password | your-app-password |
| FROM_EMAIL | Yes | Email sender address | noreply@yourdomain.com |
| AWS_REGION | Yes | AWS region | us-east-1 |
| AWS_ACCESS_KEY_ID | Yes | AWS access key | AKIAIOSFODNN7EXAMPLE |
| AWS_SECRET_ACCESS_KEY | Yes | AWS secret key | wJalrXUtnFEMI/K7MDENG... |
| AWS_S3_BUCKET_NAME | Yes | S3 bucket name | your-bucket-name |
| NODE_ENV | No | Environment mode | development/production |
| PORT | No | Server port | 5000 |