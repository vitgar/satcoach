# Quick Migration Guide

## 🚀 Fastest Way to Migrate

### Step 1: Set Environment Variables

Create or update `.env` file in `packages/db-backend/`:

```env
# Local MongoDB (source)
LOCAL_MONGODB_URI=mongodb://localhost:27017/satcoach-dev

# Cloud MongoDB (destination) - Your MongoDB Atlas connection string
CLOUD_MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/satcoach?retryWrites=true&w=majority

# Optional: Specify database names explicitly
# LOCAL_DB_NAME=satcoach-dev
# CLOUD_DB_NAME=satcoach
```

### Step 2: Run Migration

```bash
cd packages/db-backend
npm run migrate
```

That's it! 🎉

## Alternative: Use npm scripts

```bash
# Standard migration (preserves existing data)
npm run migrate

# Drop and replace (⚠️ deletes existing data first)
npm run migrate:drop
```

## What Gets Migrated?

All collections with data:
- ✅ users
- ✅ questions  
- ✅ concepts
- ✅ userquestions
- ✅ studentprogresses
- ✅ learningsessions
- ✅ studysessions
- ✅ learnerexplanations

Plus all indexes are copied automatically!

## Troubleshooting

**Can't connect?**
- Make sure local MongoDB is running: `mongosh mongodb://localhost:27017`
- Check MongoDB Atlas IP whitelist includes your IP

**Need help?** See `MIGRATION_GUIDE.md` for detailed instructions.

