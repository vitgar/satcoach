# MongoDB Timeout Fix for Vercel Deployment

## Problem
When deploying to Vercel, registration and other database operations were failing with:
```
{"error":"Operation `users.findOne()` buffering timed out after 10000ms"}
```

## Root Cause
The database connection middleware was registered **AFTER** the API routes in the Express app, causing requests to reach controllers before the database connection was established. In serverless environments like Vercel, each function invocation needs to ensure the database connection is ready before processing requests.

## Solution

### 1. Moved Database Connection Middleware (src/index.ts)
- **Before**: Database connection middleware was at the end of the file (lines 127-135)
- **After**: Moved to run immediately after basic middleware setup (lines 28-39), BEFORE routes

This ensures that in Vercel serverless mode:
1. Request arrives
2. Database connection is established/reused
3. Routes can safely access the database

### 2. Optimized Connection Settings (src/config/database.ts)
Updated MongoDB connection timeouts to better handle serverless cold starts:
- `serverSelectionTimeoutMS`: 5s → 15s (handles cold starts)
- `socketTimeoutMS`: 5s → 45s (prevents premature timeouts)
- `connectTimeoutMS`: Added 15s (initial connection timeout)
- `maxIdleTimeMS`: Added 10s (closes idle connections)

## Changes Made

### src/index.ts
```typescript
// For serverless: ensure DB connection on first request BEFORE routes
if (process.env.VERCEL === '1') {
  app.use(async (req, res, next) => {
    try {
      await connectDatabase();
      next();
    } catch (error) {
      console.error('Database connection failed:', error);
      res.status(503).json({ error: 'Database connection failed. Please try again.' });
    }
  });
}
```

### src/config/database.ts
```typescript
const opts = {
  bufferCommands: false,
  serverSelectionTimeoutMS: 15000, // 15 seconds to handle cold starts
  socketTimeoutMS: 45000, // 45 seconds
  connectTimeoutMS: 15000, // 15 seconds for initial connection
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 10000, // Close idle connections after 10s
};
```

## Deployment

To deploy these fixes to Vercel:

### Option 1: Git Push (Automatic)
```bash
cd packages/db-backend
git add .
git commit -m "Fix MongoDB timeout on Vercel by moving connection middleware before routes"
git push
```
Vercel will automatically detect the changes and redeploy.

### Option 2: Manual Deployment
```bash
cd packages/db-backend
vercel --prod
```

## Verification

After deployment, test the registration endpoint:

```bash
curl -X POST https://satcoach-db-backend.vercel.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

Expected response (201):
```json
{
  "message": "User registered successfully",
  "user": { ... },
  "accessToken": "...",
  "refreshToken": "..."
}
```

## Technical Details

### Why Middleware Order Matters in Serverless
In traditional server setups, database connection happens once at startup. In serverless:
- Each function invocation may be a "cold start"
- Middleware executes in registration order
- Routes registered before connection middleware can execute before DB is ready
- Connection caching (via global variable) reuses connections across warm invocations

### Connection Caching Strategy
The `connectDatabase()` function implements connection caching:
- Checks if connection exists in global cache
- Reuses existing connections (warm starts)
- Creates new connection only when needed (cold starts)
- Prevents redundant connection attempts

## Monitoring

Monitor Vercel function logs for:
- ✅ "Using cached MongoDB connection" (warm starts - good!)
- 🔄 "Creating new MongoDB connection..." (cold starts - normal)
- ❌ "Database connection failed:" (investigate if frequent)

## Environment Variables

Ensure these are set in Vercel:
- `MONGODB_URI`: Your MongoDB connection string
- `VERCEL`: Automatically set to '1' by Vercel
- `JWT_SECRET`: Your JWT secret key
- `JWT_REFRESH_SECRET`: Your refresh token secret

---

**Status**: ✅ Fixed and ready for deployment
**Date**: December 20, 2025
**Issue**: MongoDB buffering timeout in Vercel serverless environment

