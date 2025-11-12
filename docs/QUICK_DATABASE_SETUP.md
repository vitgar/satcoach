# Quick MongoDB Setup (5 Minutes)

Follow these steps to get your database ready:

## ✅ Step-by-Step Checklist

### 1. Download MongoDB Compass (if you haven't)
- [ ] Go to https://www.mongodb.com/try/download/compass
- [ ] Download and install for your OS

### 2. Create MongoDB Atlas Account
- [ ] Go to https://www.mongodb.com/cloud/atlas/register
- [ ] Sign up (use Google for faster signup)
- [ ] Choose **FREE** tier (M0)

### 3. Create Your Cluster
- [ ] Click "Build a Database"
- [ ] Select **M0 FREE**
- [ ] Choose AWS and region closest to you
- [ ] Click "Create" (wait 1-3 minutes)

### 4. Set Up Security

**Create Database User:**
- [ ] Username: `satcoach-admin`
- [ ] Password: Create strong password (click "Autogenerate")
- [ ] **SAVE THIS PASSWORD!** You'll need it
- [ ] Click "Create User"

**Network Access:**
- [ ] Click "Add Current IP Address"
- [ ] For development, also add: `0.0.0.0/0` (description: "Dev - Allow All")
- [ ] Click "Finish and Close"

### 5. Get Connection String
- [ ] Click "Connect" on your cluster
- [ ] Choose "Connect using MongoDB Compass"
- [ ] Copy the connection string
- [ ] Replace `<password>` with your actual password

**Example:**
```
mongodb+srv://satcoach-admin:MyPassword123@cluster0.xxxxx.mongodb.net/
```

### 6. Connect in Compass
- [ ] Open MongoDB Compass
- [ ] Paste your connection string
- [ ] Add database name to the end: `/satcoach-dev`
  
**Full string:**
```
mongodb+srv://satcoach-admin:MyPassword123@cluster0.xxxxx.mongodb.net/satcoach-dev
```

- [ ] Click "Connect"
- [ ] ✅ You should see "My Cluster" connected!

### 7. Create Collections

Click "Create Database":
- [ ] Database name: `satcoach-dev`
- [ ] First collection: `users`

Then create these additional collections:
- [ ] `questions`
- [ ] `studentprogress`
- [ ] `chatsessions`
- [ ] `bookmarks`
- [ ] `studysessions`

### 8. Create Indexes (Important!)

For each collection, click the "Indexes" tab, then "Create Index":

**users** - Create 1 index:
```json
{ "email": 1 }
```
☑️ Check "Create unique index"

**questions** - Create 1 index:
```json
{ "subject": 1, "difficulty": 1 }
```

**studentprogress** - Create 2 indexes:

Index 1:
```json
{ "userId": 1, "subject": 1, "topic": 1 }
```
☑️ Check "Create unique index"

Index 2:
```json
{ "userId": 1, "performance.nextReviewDate": 1 }
```

**chatsessions** - Create 1 index:
```json
{ "userId": 1, "questionId": 1 }
```

**bookmarks** - Create 1 index:
```json
{ "userId": 1, "questionId": 1 }
```
☑️ Check "Create unique index"

**studysessions** - Create 1 index:
```json
{ "userId": 1, "startTime": -1 }
```

### 9. Update .env File

Create the file `packages/db-backend/.env` (if it doesn't exist):

```bash
# MongoDB Configuration
MONGODB_URI=mongodb+srv://satcoach-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/satcoach-dev?retryWrites=true&w=majority

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Configuration (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=GENERATE_A_RANDOM_32_CHAR_STRING
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=GENERATE_ANOTHER_RANDOM_32_CHAR_STRING
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Bcrypt
BCRYPT_ROUNDS=10
```

### 10. Generate JWT Secrets

Open terminal and run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run it **twice** to get two different secrets:
- [ ] Copy first secret → `JWT_SECRET`
- [ ] Copy second secret → `JWT_REFRESH_SECRET`

### 11. Test Connection

```bash
cd packages/db-backend
npm init -y
npm install mongodb dotenv
node test-connection.js
```

You should see:
```
✅ Successfully connected to MongoDB!
📁 Database: satcoach-dev
```

---

## 🎉 Done!

Your database is ready! You should have:
- ✅ MongoDB Atlas cluster running
- ✅ Database user created
- ✅ Network access configured
- ✅ MongoDB Compass connected
- ✅ Database and collections created
- ✅ Indexes configured
- ✅ Connection string in .env
- ✅ JWT secrets generated
- ✅ Connection tested successfully

## 📝 What You Created

**6 Collections**:
1. `users` - User accounts and profiles
2. `questions` - SAT questions (AI-generated and cached)
3. `studentprogress` - Learning progress and spaced repetition data
4. `chatsessions` - Chat conversations with AI tutor
5. `bookmarks` - Student's saved questions
6. `studysessions` - Study session tracking

**Key Indexes for Performance**:
- Fast user lookups by email
- Efficient question filtering by subject/difficulty
- Spaced repetition review scheduling
- Chat history retrieval

## 🔐 Security Checklist

- [ ] Connection string saved in .env (not committed to git)
- [ ] Strong password used (16+ characters)
- [ ] JWT secrets generated randomly (32+ characters)
- [ ] .env file is in .gitignore

## 🆘 Having Issues?

**Connection Failed?**
1. Check username and password are correct
2. Verify your IP is whitelisted (or use 0.0.0.0/0)
3. Make sure you added `/satcoach-dev` to the connection string

**Can't Create Index?**
- Some indexes might already exist
- Check the "Indexes" tab to see existing indexes
- Skip if index already exists

**Special Characters in Password?**
URL-encode them in the connection string:
- `@` becomes `%40`
- `:` becomes `%3A`
- `/` becomes `%2F`

See full documentation: **docs/DATABASE_SETUP.md**

---

## 🚀 Next Steps

After database setup:

1. **Review the schema** in PROJECT_PLAN.md Section 3
2. **Start backend development** - Phase 2 in PROJECT_PLAN.md
3. **Create Mongoose models** based on the schema

Your database is production-ready! The free tier (M0) supports up to 100 concurrent connections and 512MB storage - perfect for development and small-scale production.

