# MongoDB Migration Guide

This guide explains how to migrate data from your local MongoDB database to a cloud MongoDB database (MongoDB Atlas).

## 🎯 Quick Start

### Option 1: Using the Migration Script (Recommended)

The easiest way is to use the provided TypeScript migration script:

```bash
cd packages/db-backend

# Set environment variables
export LOCAL_MONGODB_URI="mongodb://localhost:27017/satcoach-dev"
export CLOUD_MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/satcoach?retryWrites=true&w=majority"

# Run migration
npx ts-node scripts/migrate-to-cloud.ts
```

Or create a `.env` file in `packages/db-backend/`:

```env
LOCAL_MONGODB_URI=mongodb://localhost:27017/satcoach-dev
CLOUD_MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/satcoach
```

Then run:

```bash
npx ts-node scripts/migrate-to-cloud.ts
```

### Option 2: Using mongodump and mongorestore (MongoDB Tools)

If you prefer using MongoDB's official tools:

```bash
# 1. Dump local database
mongodump --uri="mongodb://localhost:27017/satcoach-dev" --out=./dump

# 2. Restore to cloud database
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/satcoach" ./dump/satcoach-dev
```

## 📋 Prerequisites

1. **Local MongoDB must be running**
   ```bash
   # Check if MongoDB is running
   mongosh mongodb://localhost:27017
   ```

2. **Cloud MongoDB (Atlas) must be accessible**
   - Your IP address must be whitelisted in MongoDB Atlas
   - Or use `0.0.0.0/0` to allow all IPs (development only)

3. **Connection strings ready**
   - Local: `mongodb://localhost:27017/satcoach-dev`
   - Cloud: Your MongoDB Atlas connection string

## 🔧 Migration Script Options

### Basic Migration (Preserves existing data)
```bash
npx ts-node scripts/migrate-to-cloud.ts
```
- Copies all documents from local to cloud
- Skips duplicates (won't overwrite existing data)
- Preserves indexes

### Drop and Replace (⚠️ Destructive)
```bash
npx ts-node scripts/migrate-to-cloud.ts --drop-existing
```
- Drops existing collections in cloud before migrating
- Use with caution! This will delete existing data.

### Migrate Specific Collections
```bash
npx ts-node scripts/migrate-to-cloud.ts --collections=users,questions
```
- Only migrates specified collections
- Useful for selective migration or retries

### Combine Options
```bash
npx ts-node scripts/migrate-to-cloud.ts --drop-existing --collections=users,questions
```

## 📊 What Gets Migrated

The script migrates:

### Collections
- `users` - User accounts and profiles
- `questions` - SAT questions
- `concepts` - Learning concepts
- `userquestions` - User question attempts
- `studentprogresses` - Learning progress tracking
- `learningsessions` - Learning session records
- `studysessions` - Study session records
- `learnerexplanations` - Learner explanations

### What's Preserved
- ✅ All documents (with all fields)
- ✅ Indexes (including unique indexes)
- ✅ ObjectIds (preserved from source)
- ✅ Timestamps (`createdAt`, `updatedAt`)

### What's Excluded
- ❌ System collections (e.g., `system.*`)
- ❌ Empty collections

## 🔍 Verification

After migration, verify the data:

### Using MongoDB Compass
1. Connect to your cloud database
2. Check each collection
3. Verify document counts match

### Using mongosh
```bash
# Connect to cloud database
mongosh "mongodb+srv://username:password@cluster.mongodb.net/satcoach"

# Count documents in each collection
db.users.countDocuments()
db.questions.countDocuments()
db.studentprogresses.countDocuments()
# ... etc
```

### Using the Script
The migration script prints a summary at the end showing:
- Number of collections migrated
- Total documents copied
- Any errors encountered

## 🚨 Troubleshooting

### "Connection refused" Error
- **Problem**: Can't connect to local MongoDB
- **Solution**: Start MongoDB service
  ```bash
  # Windows
  net start MongoDB
  
  # macOS (Homebrew)
  brew services start mongodb-community
  
  # Linux
  sudo systemctl start mongod
  ```

### "Authentication failed" Error
- **Problem**: Wrong credentials for cloud database
- **Solution**: 
  1. Check username and password in connection string
  2. Verify database user exists in MongoDB Atlas
  3. Check IP whitelist in MongoDB Atlas

### "Network access not configured" Error
- **Problem**: Your IP is not whitelisted in MongoDB Atlas
- **Solution**: 
  1. Go to MongoDB Atlas → Network Access
  2. Click "Add IP Address"
  3. Add your current IP or `0.0.0.0/0` for development

### "Duplicate key error" Error
- **Problem**: Documents already exist in cloud database
- **Solution**: 
  - Use `--drop-existing` to replace existing data
  - Or manually delete specific collections first
  - The script handles duplicates gracefully (skips them)

### "Index already exists" Error
- **Problem**: Indexes already exist with different options
- **Solution**: This is handled automatically - existing indexes are preserved

### Large Collections Taking Too Long
- **Problem**: Migration is slow for large collections
- **Solution**: 
  - The script uses batching (1000 documents per batch)
  - For very large collections, consider migrating during off-peak hours
  - You can migrate collections individually using `--collections` flag

## 🔄 Incremental Migration

To migrate only new/updated data:

1. **First time**: Full migration
   ```bash
   npx ts-node scripts/migrate-to-cloud.ts --drop-existing
   ```

2. **Subsequent times**: Migrate specific collections
   ```bash
   npx ts-node scripts/migrate-to-cloud.ts --collections=users,questions
   ```

The script handles duplicates, so re-running won't create duplicate documents.

## 🔐 Security Notes

1. **Never commit connection strings** to git
2. **Use environment variables** or `.env` files (add to `.gitignore`)
3. **Use strong passwords** for database users
4. **Limit IP whitelist** in production (avoid `0.0.0.0/0`)
5. **Use MongoDB Atlas encryption** for sensitive data

## 📝 Example Migration Workflow

```bash
# 1. Backup local database (optional but recommended)
mongodump --uri="mongodb://localhost:27017/satcoach-dev" --out=./backup-$(date +%Y%m%d)

# 2. Set environment variables
export LOCAL_MONGODB_URI="mongodb://localhost:27017/satcoach-dev"
export CLOUD_MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/satcoach"

# 3. Test connection (optional)
mongosh "$CLOUD_MONGODB_URI" --eval "db.adminCommand('ping')"

# 4. Run migration
npx ts-node scripts/migrate-to-cloud.ts

# 5. Verify in MongoDB Compass or mongosh
# Check document counts match

# 6. Update your application's MONGODB_URI
# In Vercel: Settings → Environment Variables → Update MONGODB_URI
```

## 🎓 Understanding the Migration Process

1. **Connect**: Establishes connections to both databases
2. **Discover**: Lists all collections in local database
3. **Copy**: For each collection:
   - Counts documents
   - Copies documents in batches (1000 at a time)
   - Handles duplicates gracefully
   - Copies indexes
4. **Verify**: Reports statistics and any errors

## 💡 Tips

- **Test first**: Migrate to a test database before production
- **Check indexes**: Verify indexes were copied correctly
- **Monitor size**: Large databases may take time to migrate
- **Off-peak migration**: Run during low-traffic periods
- **Incremental updates**: Use `--collections` for selective updates

## 📚 Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [mongodump Documentation](https://docs.mongodb.com/database-tools/mongodump/)
- [mongorestore Documentation](https://docs.mongodb.com/database-tools/mongorestore/)
- [MongoDB Connection Strings](https://docs.mongodb.com/manual/reference/connection-string/)

---

**Need Help?** Check the error messages - they usually indicate the specific issue. Most common problems are connection/authentication related.

