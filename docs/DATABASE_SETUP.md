# MongoDB Database Setup Guide

## Overview

This guide will walk you through setting up MongoDB for SAT Coach using MongoDB Compass. You have two options:

1. **MongoDB Atlas (Recommended)** - Cloud-hosted, free tier available, production-ready
2. **Local MongoDB** - Run MongoDB locally for development

We'll use **MongoDB Atlas + MongoDB Compass** for the best experience.

## Prerequisites

- Download MongoDB Compass: https://www.mongodb.com/try/download/compass

## Option 1: MongoDB Atlas + Compass (Recommended)

### Step 1: Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with email or Google account
3. Choose **FREE** tier (M0 Sandbox)

### Step 2: Create a Cluster

1. After logging in, click **"Build a Database"** or **"Create"**
2. Choose **M0 FREE** tier
   - Storage: 512 MB
   - Shared RAM
   - Perfect for development and small production

3. Select a **Cloud Provider & Region**:
   - Provider: AWS (recommended)
   - Region: Choose closest to you (e.g., US East, Europe West)
   - Click **"Create"**

4. Wait 1-3 minutes for cluster to deploy

### Step 3: Create Database User

1. You'll see a **"Security Quickstart"** screen
2. Choose **Username and Password** authentication
3. Create credentials:
   ```
   Username: satcoach-admin
   Password: [Generate a secure password - SAVE THIS!]
   ```
4. Click **"Create User"**

### Step 4: Configure Network Access

1. In the Security Quickstart, you'll see **"Where would you like to connect from?"**
2. For development, choose **"My Local Environment"**
3. Click **"Add My Current IP Address"**
4. For broader access during development:
   - Click **"Add IP Address"**
   - Enter: `0.0.0.0/0` (allows access from anywhere)
   - Description: "Development - Allow All"
   - ⚠️ **For production, restrict to specific IPs**
5. Click **"Finish and Close"**

### Step 5: Get Connection String

1. On your cluster dashboard, click **"Connect"**
2. Choose **"Connect using MongoDB Compass"**
3. Copy the connection string - it looks like:
   ```
   mongodb+srv://satcoach-admin:<password>@cluster0.xxxxx.mongodb.net/
   ```
4. **IMPORTANT**: Replace `<password>` with your actual password
5. Save this - you'll need it!

### Step 6: Connect with MongoDB Compass

1. Open **MongoDB Compass**
2. You should see a connection screen
3. Paste your connection string:
   ```
   mongodb+srv://satcoach-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/
   ```
4. Click **"Connect"**
5. ✅ You should now be connected!

### Step 7: Create Database and Collections

Now that you're connected, let's create the SAT Coach database structure:

#### 7.1 Create Database

1. In Compass, click **"Create Database"** (top left)
2. Enter:
   - Database Name: `satcoach-dev`
   - Collection Name: `users` (we'll add more later)
3. Click **"Create Database"**

#### 7.2 Create Collections

Click on `satcoach-dev` database, then create these collections:

1. **users** (already created)
2. **questions**
3. **studentprogress**
4. **chatsessions**
5. **bookmarks**
6. **studysessions**

To create each collection:
- Click **"Create Collection"** button
- Enter collection name
- Click **"Create"**

#### 7.3 Create Indexes (Important for Performance)

For each collection, we'll create indexes. Click on the collection, then click **"Indexes"** tab, then **"Create Index"**.

**users collection**:
```json
// Index 1: Email (unique)
{ "email": 1 }
Options: Check "Create unique index"

// Index 2: Created at
{ "createdAt": 1 }
```

**questions collection**:
```json
// Index 1: Subject and difficulty
{ "subject": 1, "difficulty": 1 }

// Index 2: Tags
{ "tags": 1 }

// Index 3: Times used
{ "metadata.timesUsed": 1 }
```

**studentprogress collection**:
```json
// Index 1: User, subject, topic (unique)
{ "userId": 1, "subject": 1, "topic": 1 }
Options: Check "Create unique index"

// Index 2: Next review date
{ "userId": 1, "performance.nextReviewDate": 1 }

// Index 3: Mastery level
{ "userId": 1, "performance.masteryLevel": 1 }
```

**chatsessions collection**:
```json
// Index 1: User and question
{ "userId": 1, "questionId": 1 }

// Index 2: Question
{ "questionId": 1 }

// Index 3: Created at (for cleanup)
{ "createdAt": 1 }
```

**bookmarks collection**:
```json
// Index 1: User and question (unique)
{ "userId": 1, "questionId": 1 }
Options: Check "Create unique index"

// Index 2: Marked for review
{ "userId": 1, "markedForReview": 1 }
```

**studysessions collection**:
```json
// Index 1: User and start time
{ "userId": 1, "startTime": -1 }

// Index 2: User and end time
{ "userId": 1, "endTime": 1 }
```

### Step 8: Update Environment Variables

Now update your `.env` file with the connection string:

1. Navigate to `packages/db-backend/.env`
2. Update `MONGODB_URI`:

```bash
# Full connection string with database name
MONGODB_URI=mongodb+srv://satcoach-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/satcoach-dev?retryWrites=true&w=majority
```

**Important**: Add `/satcoach-dev` before the `?` to specify the database!

### Step 9: Test the Connection

Create a simple test script to verify everything works:

**packages/db-backend/test-connection.js**:
```javascript
require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Successfully connected to MongoDB!');
    console.log('Database:', mongoose.connection.db.databaseName);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nCollections:');
    collections.forEach(col => console.log('  -', col.name));
    
    await mongoose.connection.close();
    console.log('\n✅ Test complete!');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
```

Run it:
```bash
cd packages/db-backend
npm init -y
npm install mongoose dotenv
node test-connection.js
```

---

## Option 2: Local MongoDB (Alternative)

If you prefer to run MongoDB locally:

### Step 1: Install MongoDB Community Edition

**Windows**:
1. Download: https://www.mongodb.com/try/download/community
2. Run installer, choose "Complete" installation
3. Install as a Windows Service
4. Default port: 27017

**Mac**:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux**:
```bash
# Ubuntu/Debian
sudo apt-get install mongodb

# Start service
sudo systemctl start mongodb
```

### Step 2: Connect with Compass

1. Open MongoDB Compass
2. Connection string: `mongodb://localhost:27017`
3. Click **"Connect"**

### Step 3: Create Database

Follow the same steps as Step 7 above (Create Database and Collections)

### Step 4: Update .env

```bash
MONGODB_URI=mongodb://localhost:27017/satcoach-dev
```

---

## Database Schema Reference

Here's what each collection stores:

### users
- User accounts (email, password, learning profile)
- Learning level (1-10 for adaptive difficulty)
- Preferences

### questions
- AI-generated SAT questions
- Subject, difficulty, content
- Usage statistics

### studentprogress
- Per-topic progress tracking
- Attempt history
- Spaced repetition data (next review date, ease factor)
- Mastery levels

### chatsessions
- Chat conversations per question
- Message history
- Token usage tracking

### bookmarks
- Student's bookmarked questions
- Review flags
- Personal notes

### studysessions
- Study session tracking
- Time spent
- Questions attempted

---

## Troubleshooting

### "Authentication failed"
- Double-check username and password
- Ensure password doesn't contain special characters that need URL encoding
- Use Compass to test connection first

### "Network timeout"
- Check IP whitelist in Atlas (should include your IP or 0.0.0.0/0)
- Check firewall settings

### "Database not found"
- Make sure you added `/satcoach-dev` to the connection string
- MongoDB will create the database on first write

### Connection string encoding
If your password has special characters, URL-encode them:
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `?` → `%3F`

Or use MongoDB Compass to generate the encoded string.

---

## Security Reminders

✅ **Do's**:
- Use strong passwords (16+ characters)
- Restrict IP access in production
- Use separate credentials for dev/staging/prod
- Enable MongoDB Atlas backup
- Monitor usage and set alerts

❌ **Don'ts**:
- Don't commit connection strings to git (already in .gitignore)
- Don't use 0.0.0.0/0 IP whitelist in production
- Don't use admin credentials in application
- Don't share connection strings publicly

---

## Next Steps

After database setup:

1. ✅ Generate JWT secrets:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   
2. ✅ Update `packages/db-backend/.env` with all values

3. ✅ Ready to start backend development!

---

## Quick Reference

### Connection String Format
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

### Compass Tips
- **Documents tab**: View and edit data
- **Indexes tab**: Manage indexes for performance
- **Schema tab**: Analyze data structure
- **Explain Plan tab**: Optimize queries

### Useful MongoDB Compass Features
- Visual query builder
- Aggregation pipeline builder
- Import/export data (JSON, CSV)
- Index performance analysis

---

**Your database is now ready for SAT Coach! 🚀**

