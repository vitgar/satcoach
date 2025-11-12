# SAT Coach - Database Backend API

Express + TypeScript + MongoDB backend for SAT Coach application.

## 🚀 Quick Start

### 1. Start the Development Server

```bash
npm run dev
```

You should see:
```
✅ MongoDB connected: satcoach-dev

🚀 ================================
   SAT Coach DB Backend
   Environment: development
   Port: 3001
   URL: http://localhost:3001
================================

📍 Available endpoints:
   GET  /health
   POST /api/v1/auth/register
   POST /api/v1/auth/login
   GET  /api/v1/auth/me
```

### 2. Test the API

#### Option A: Use the Test Script

```bash
# In a new terminal:
node test-api.js
```

This will automatically test all endpoints and create a test user.

#### Option B: Manual Testing with curl

**Health Check:**
```bash
curl http://localhost:3001/health
```

**Register a User:**
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "password123"
  }'
```

**Get Current User (Protected Route):**
```bash
# Save the accessToken from login response, then:
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## 📁 Project Structure

```
src/
├── config/
│   ├── database.ts          # MongoDB connection
│   └── environment.ts       # Environment variables configuration
├── models/
│   └── User.model.ts        # User schema and model
├── services/
│   └── auth.service.ts      # Authentication business logic
├── controllers/
│   └── auth.controller.ts   # Request/response handling
├── routes/
│   └── auth.routes.ts       # API route definitions
├── middleware/
│   ├── auth.middleware.ts   # JWT authentication
│   └── errorHandler.middleware.ts  # Error handling
├── utils/
│   ├── jwt.utils.ts         # JWT token generation/verification
│   └── password.utils.ts    # Password hashing/comparison
└── index.ts                 # Application entry point
```

## 🏗️ Architecture Principles

This backend follows these best practices:

### Separation of Concerns
- **Models**: Database schemas only
- **Services**: Business logic
- **Controllers**: Request/response handling
- **Middleware**: Cross-cutting concerns (auth, error handling)
- **Utils**: Reusable helper functions

### Clean Code
- Small, focused files (single responsibility)
- Explicit TypeScript types
- Proper error handling
- No mock data or placeholders

### Security
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with secure secrets
- Protected routes with authentication middleware
- Input validation

## 📋 API Endpoints

### Authentication

#### POST /api/v1/auth/register
Register a new user.

**Request Body:**
```json
{
  "email": "string",
  "password": "string",  // min 8 characters
  "firstName": "string",
  "lastName": "string"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "student",
    "learningProfile": {
      "currentLevel": 5,
      "preferredDifficulty": "medium",
      "adaptiveSettings": {
        "autoAdjust": true,
        "adjustmentSpeed": 3
      }
    }
  },
  "accessToken": "string",
  "refreshToken": "string"
}
```

#### POST /api/v1/auth/login
Login existing user.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": { /* same as register */ },
  "accessToken": "string",
  "refreshToken": "string"
}
```

#### GET /api/v1/auth/me
Get current user information (protected route).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "user": { /* user object */ }
}
```

## 🔧 Available Scripts

```bash
npm run dev     # Start development server with hot reload
npm run build   # Build for production
npm run start   # Start production server
npm test        # Run tests (coming soon)
```

## 🗄️ Database Models

### User Model

See `src/models/User.model.ts` for the complete schema.

**Key Fields:**
- `email`: Unique, validated email address
- `password`: Bcrypt hashed password
- `firstName`, `lastName`: User's name
- `role`: 'student' or 'admin'
- `learningProfile`: Adaptive learning settings
  - `currentLevel`: 1-10 (for AI difficulty adjustment)
  - `preferredDifficulty`: easy/medium/hard
  - `adaptiveSettings`: Auto-adjustment configuration

**Indexes:**
- `email`: Unique index for fast lookups
- `createdAt`: For sorting by registration date

## 🔐 Authentication Flow

1. **Register/Login** → Server generates JWT access token + refresh token
2. **Client** → Stores tokens securely
3. **Protected Routes** → Client sends `Authorization: Bearer <token>` header
4. **Middleware** → Verifies token and attaches user info to request
5. **Controller** → Accesses user info from `req.user`

## 🌐 Environment Variables

See `.env` file (already configured):

```bash
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/satcoach-dev
JWT_SECRET=<generated>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<generated>
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGIN=http://localhost:5173
BCRYPT_ROUNDS=10
```

## 📊 Next Steps

After getting the authentication working, you'll build:

1. **Question Model & Routes** - SAT questions with AI generation
2. **StudentProgress Model & Routes** - Spaced repetition tracking
3. **ChatSession Model & Routes** - AI tutor conversations
4. **Bookmark Model & Routes** - Saved questions
5. **StudySession Model & Routes** - Session tracking

All schemas are documented in `PROJECT_PLAN.md` Section 3.

## 🆘 Troubleshooting

**Error: "MONGODB_URI not defined"**
- Check `.env` file exists in this directory
- Verify MongoDB is running (local or Atlas)

**Error: "Port 3001 already in use"**
- Kill the process: `npx kill-port 3001`
- Or change PORT in `.env`

**TypeScript errors**
- Run `npm install` to ensure all dependencies are installed
- Check `tsconfig.json` is properly configured

**Can't connect to MongoDB**
- Ensure MongoDB is running locally
- Or update MONGODB_URI to point to Atlas
- Test connection: `node test-connection.js`

## 📖 Additional Documentation

- **Full API Specs**: `../../PROJECT_PLAN.md` Section 7
- **Database Schemas**: `../../PROJECT_PLAN.md` Section 3
- **Architecture**: `../../memory-bank/systemPatterns.md`

---

**Your authentication system is production-ready! 🎉**

Test it now by running `npm run dev` in one terminal and `node test-api.js` in another.

