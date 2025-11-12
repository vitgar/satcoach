# 🚀 SAT Coach - Quick Start Guide

## Start the Application

### 1. Start MongoDB
```bash
# Make sure MongoDB is running locally
# Default: mongodb://localhost:27017
```

### 2. Start DB Backend (Port 3001)
```bash
cd packages/db-backend
npm run dev
```

**Expected output:**
```
✅ MongoDB connected successfully
✅ Database: satcoach-dev
🚀 DB Backend server running on port 3001

Available endpoints:
   POST /api/v1/auth/register
   POST /api/v1/auth/login
   GET  /api/v1/questions/next
   POST /api/v1/questions/:id/answer
   ...
```

### 3. Start AI Backend (Port 3002)
```bash
cd packages/ai-backend
npm run dev
```

**Expected output:**
```
🚀 AI Backend server running on port 3002

Available endpoints:
   POST /api/v1/questions/generate
   POST /api/v1/chat/coach
```

### 4. Start Frontend (Port 5173)
```bash
cd packages/frontend
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## Test the Flow

### Option 1: Automated Test
```bash
cd packages/db-backend
node test-question-flow.js
```

### Option 2: Manual Test
1. Open browser: `http://localhost:5173`
2. Click "Sign Up"
3. Create account
4. Go to "Study" page
5. Answer questions
6. Observe:
   - Questions load automatically
   - Correct answer is hidden
   - After submission, chat shows feedback
   - New question loads after 5 seconds
   - Questions never repeat

---

## Verify Everything Works

### ✅ Checklist
- [ ] MongoDB is running
- [ ] DB Backend started (port 3001)
- [ ] AI Backend started (port 3002)
- [ ] Frontend started (port 5173)
- [ ] Can register/login
- [ ] Questions load on Study page
- [ ] Can submit answers
- [ ] Chat shows feedback
- [ ] Questions don't repeat

---

## Common Issues

### Issue: "Cannot connect to MongoDB"
**Solution:** Start MongoDB locally or update `MONGODB_URI` in `packages/db-backend/.env`

### Issue: "AI Backend not available"
**Solution:** 
1. Check AI Backend is running on port 3002
2. Verify `AI_BACKEND_URL` in `packages/db-backend/.env`
3. Check OpenAI API key in `packages/ai-backend/.env`

### Issue: "Questions repeating"
**Solution:** Check `userquestions` collection has unique index:
```javascript
db.userquestions.createIndex({ userId: 1, questionId: 1 }, { unique: true })
```

### Issue: "Correct answer visible in frontend"
**Solution:** Clear browser cache and reload. The correct answer should NEVER be visible before submission.

---

## Architecture Overview

```
Frontend (5173)
    ↓
DB Backend (3001) ← Manages questions, users, progress
    ↓
AI Backend (3002) ← Generates questions, provides coaching
    ↓
OpenAI GPT-4o-mini
```

---

## Key Features

1. **User-Aware Question Selection**
   - Tracks which questions each user has seen
   - Never shows the same question twice

2. **AI Question Generation**
   - Automatically generates new questions when needed
   - Saves to database for reuse

3. **Secure Answer Validation**
   - Correct answer hidden from frontend
   - All validation on server

4. **Instant Feedback**
   - Correct: Celebration message
   - Incorrect: Detailed explanation in chat

5. **Progress Tracking**
   - Every attempt recorded
   - Time spent tracked
   - Statistics for adaptive learning

---

## Next Steps

- Read `IMPLEMENTATION_SUMMARY.md` for detailed architecture
- Read `QUESTION_FLOW_COMPLETE.md` for complete flow documentation
- Check `PROJECT_STATUS.md` for overall project status

---

**Model Used: Claude Sonnet 4.5**

