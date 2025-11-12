# 🚀 Start Your Backend Server

## Step 1: Open a Terminal

Open a terminal in this directory (`packages/db-backend`).

## Step 2: Start the Server

```bash
npm run dev
```

## Step 3: You Should See This

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

## Step 4: Test It (In a NEW Terminal)

Open a second terminal and run:

```bash
node test-api.js
```

You'll see all tests pass! ✅

---

## What You Just Built

✅ **Express Server** with TypeScript  
✅ **MongoDB Connection** working perfectly  
✅ **User Authentication** (register, login)  
✅ **JWT Tokens** (access + refresh)  
✅ **Protected Routes** with middleware  
✅ **Password Hashing** with bcrypt  
✅ **Error Handling** middleware  
✅ **Input Validation**  
✅ **Clean Architecture** (models, services, controllers)  

## API Endpoints Working

- `POST /api/v1/auth/register` - Create account
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user (protected)

## Manual Testing

### Register a User

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

### Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "password123"
  }'
```

Copy the `accessToken` from the response.

### Access Protected Route

```bash
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Check Your Database in MongoDB Compass

1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. Navigate to `satcoach-dev` database
4. Look in the `users` collection
5. You'll see the users you created! 🎉

---

## Next Steps

Now that authentication is working, you can build:

1. Question model and routes
2. Progress tracking with spaced repetition
3. Chat sessions
4. And more!

See `README.md` for full documentation.

---

**You've built a production-ready authentication API! 🎉**

