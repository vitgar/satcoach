# 🧪 Testing Guide - SAT Coach Application

## 🚀 Quick Start

### Prerequisites
- Both servers must be running:
  - Backend: `http://localhost:3001`
  - Frontend: `http://localhost:5173`
- MongoDB connection active

### Starting the Servers

**Terminal 1 - Backend:**
```bash
cd packages/db-backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd packages/frontend
npm run dev
```

**Terminal 3 - Test APIs (optional):**
```bash
cd packages/db-backend
node test-api.js          # Test authentication
node test-questions.js    # Test questions
node test-progress.js     # Test progress tracking
```

---

## 📝 Test Scenarios

### Scenario 1: New User Registration & Login

#### Step 1: Register a New Account
1. Navigate to `http://localhost:5173`
2. Click "Sign up" link
3. Fill in the registration form:
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `john.doe@example.com`
   - Password: `TestPass123!`
4. Click "Create Account"

**Expected Result:**
- ✅ Redirect to dashboard
- ✅ Welcome message displays "Welcome back, John!"
- ✅ User level shown (default: 1)

#### Step 2: Logout and Login
1. Click "Logout" in the navigation
2. You should be redirected to `/login`
3. Enter credentials:
   - Email: `john.doe@example.com`
   - Password: `TestPass123!`
4. Click "Sign In"

**Expected Result:**
- ✅ Successfully logged in
- ✅ Redirect to dashboard
- ✅ User data persists

---

### Scenario 2: Explore Dashboard

#### View Analytics
1. After login, you're on the dashboard
2. Observe the cards:
   - **Total Attempts**: Initially 0
   - **Average Accuracy**: 0%
   - **Average Mastery**: 0%
   - **Review Schedule**: All 0

#### Start Studying
1. Click the "Start Studying" button

**Expected Result:**
- ✅ Navigate to `/study`
- ✅ Split screen layout loads
- ✅ Question appears on left
- ✅ Chat panel appears on right

---

### Scenario 3: Answer Questions

#### Answer Your First Question
1. On the study page, read the question
2. Select an answer (A, B, C, or D)
3. Click "Submit Answer"

**Expected Result:**
- ✅ Selected option highlights
- ✅ Result shown (Correct/Incorrect)
- ✅ Explanation appears
- ✅ Correct answer highlighted in green
- ✅ Wrong answer (if selected) highlighted in red
- ✅ "Next Question" button appears

#### Continue to Next Question
1. Click "Next Question"

**Expected Result:**
- ✅ New question loads
- ✅ Previous selections cleared
- ✅ Chat resets with new greeting

#### Try Different Subjects
1. At the top, click subject filters:
   - **All** (mixed questions)
   - **Math** (only math questions)
   - **Reading** (only reading questions)
   - **Writing** (only writing questions)

**Expected Result:**
- ✅ Questions adapt to selected subject
- ✅ Previous questions reset

---

### Scenario 4: Use AI Chat

#### Ask a Question
1. While viewing a question, look at the right panel
2. Type in the chat input: `How do I approach this?`
3. Press Enter or click "Send"

**Expected Result:**
- ✅ Your message appears (blue, right-aligned)
- ✅ Loading indicator shows (three bouncing dots)
- ✅ AI response appears (gray, left-aligned)
- ✅ Response includes contextual help
- ✅ Response references the question's subject

#### Use Quick Questions
1. Click one of the quick question buttons:
   - "How do I approach this?"
   - "Can you give me a hint?"
   - "Explain the concept"

**Expected Result:**
- ✅ Question auto-fills in input
- ✅ Message sends automatically
- ✅ AI responds with relevant guidance

#### Chat History
1. Ask multiple questions in the same session
2. Scroll through chat history

**Expected Result:**
- ✅ All messages persist
- ✅ Auto-scrolls to latest message
- ✅ Timestamps displayed

**Note:** Currently showing placeholder responses. Real AI integration coming with AI backend!

---

### Scenario 5: Track Progress

#### Answer Multiple Questions
1. Answer at least 5 questions (mix of correct and incorrect)
2. Navigate back to Dashboard (click "Dashboard" in nav)

**Expected Result:**
- ✅ **Total Attempts** increases
- ✅ **Average Accuracy** updates (percentage correct)
- ✅ **Average Mastery** shows learning progress
- ✅ **Subject Performance** section appears
- ✅ Progress bars show accuracy per subject

#### View Review Schedule
1. On dashboard, scroll to "Review Schedule" cards

**Expected Result:**
- ✅ **Due Now**: Shows topics ready for review
- ✅ **Overdue**: Shows topics needing attention
- ✅ **Upcoming**: Shows scheduled reviews

#### Check Strengths & Weaknesses
1. Scroll to bottom of dashboard
2. View two cards:
   - "Your Strengths" (green checkmark)
   - "Areas to Improve" (orange exclamation)

**Expected Result:**
- ✅ Lists appear after sufficient data (5+ attempts)
- ✅ Strengths show topics with high accuracy
- ✅ Weaknesses show topics needing practice

---

### Scenario 6: Test Adaptive Difficulty

#### Watch Your Level Change
1. Answer several questions correctly in a row (3-5)
2. Check your level in the navigation bar

**Expected Result:**
- ✅ Level increases (e.g., 1 → 2)
- ✅ Next questions become slightly harder

#### Test the Opposite
1. Answer several questions incorrectly
2. Check your level again

**Expected Result:**
- ✅ Level decreases
- ✅ Next questions become easier

---

### Scenario 7: Session Management

#### View Session Duration
1. Study for a few minutes (answer 3-5 questions)
2. Open browser console (F12)
3. Check Network tab for session updates

**Expected Result:**
- ✅ Session starts automatically when you begin studying
- ✅ Session tracks questions attempted
- ✅ Session records correct/incorrect answers

---

## 🔍 Advanced Testing

### Test API Endpoints Directly

#### Test Authentication
```bash
cd packages/db-backend
node test-api.js
```

**Expected Output:**
```
=== Testing SAT Coach Authentication API ===

✓ Test 1: User Registration - PASSED
✓ Test 2: User Login - PASSED
✓ Test 3: Get Current User - PASSED
✓ Test 4: Duplicate Registration - PASSED (correctly rejected)

All tests completed successfully!
```

#### Test Questions
```bash
node test-questions.js
```

**Expected Output:**
```
=== Testing SAT Coach Question API ===

✓ Test 1: Get All Questions - PASSED
✓ Test 2: Get Next Question - PASSED
✓ Test 3: Get Question by ID - PASSED
✓ Test 4: Filter by Subject - PASSED
✓ Test 5: Adaptive Selection - PASSED
```

#### Test Progress Tracking
```bash
node test-progress.js
```

**Expected Output:**
```
=== Testing SAT Coach Progress & Session API ===

✓ Test 1: Start Study Session - PASSED
✓ Test 2: Record Correct Answer - PASSED
✓ Test 3: Get Review Schedule - PASSED
✓ Test 4: Get Analytics - PASSED
✓ Test 5: End Session - PASSED
```

---

## 🐛 Troubleshooting

### Frontend Not Loading
```bash
# Check if frontend server is running
curl http://localhost:5173

# If not, restart it:
cd packages/frontend
npm run dev
```

### Backend Not Responding
```bash
# Check if backend server is running
curl http://localhost:3001/health

# Should return:
# {"status":"healthy","timestamp":"..."}

# If not, restart it:
cd packages/db-backend
npm run dev
```

### MongoDB Connection Error
```bash
# Check if MongoDB is running
# On Windows, check Services for "MongoDB Server"

# Test connection:
cd packages/db-backend
node test-connection.js
```

### Authentication Issues
```bash
# Clear localStorage in browser:
# F12 > Console > Type:
localStorage.clear()
location.reload()
```

### API 401 Errors
- Your JWT token may have expired
- Click "Logout" and log back in
- Token should refresh automatically

---

## ✅ Test Checklist

Use this checklist to verify all features:

### Authentication
- [ ] Can register new user
- [ ] Can login with correct credentials
- [ ] Cannot login with wrong password
- [ ] Cannot register duplicate email
- [ ] Can logout successfully
- [ ] Protected routes redirect to login
- [ ] Token persists across page reloads

### Dashboard
- [ ] Dashboard loads without errors
- [ ] User name displays correctly
- [ ] User level badge shows
- [ ] Analytics cards display
- [ ] "Start Studying" button works
- [ ] Subject performance section appears (after attempts)
- [ ] Review schedule updates correctly
- [ ] Strengths/weaknesses appear (after data)

### Study Interface
- [ ] Split-screen layout displays
- [ ] Question loads on left panel
- [ ] Chat panel loads on right
- [ ] Subject filter works (All/Math/Reading/Writing)
- [ ] Question text displays clearly
- [ ] 4 answer options show (A, B, C, D)
- [ ] Can select an answer
- [ ] "Submit Answer" button works
- [ ] Result feedback shows
- [ ] Explanation appears
- [ ] Correct answer highlighted
- [ ] "Next Question" loads new question
- [ ] Question metadata shows (subject, difficulty, tags)

### Chat
- [ ] Initial greeting appears
- [ ] Can type messages
- [ ] Can send messages (Enter or button)
- [ ] User messages appear (blue, right)
- [ ] AI responses appear (gray, left)
- [ ] Quick question buttons work
- [ ] Chat auto-scrolls to bottom
- [ ] Timestamps display
- [ ] Loading indicator shows
- [ ] Chat history persists during question

### Progress Tracking
- [ ] First attempt records correctly
- [ ] Analytics update after attempts
- [ ] Accuracy calculates correctly
- [ ] Subject performance tracks properly
- [ ] Mastery level updates
- [ ] Review schedule generates
- [ ] Strengths identified
- [ ] Weaknesses identified

### Adaptive System
- [ ] User level increases with correct answers
- [ ] User level decreases with wrong answers
- [ ] Question difficulty adapts
- [ ] Next question selection is intelligent

### Session Management
- [ ] Session starts automatically
- [ ] Session tracks questions
- [ ] Session records results
- [ ] Session can be ended

---

## 📊 Expected Data Flow

```
1. User registers → JWT token generated → Stored in localStorage
2. User logs in → Token sent with all requests → Backend validates
3. User starts study → Session created → Questions fetched
4. User answers → Progress recorded → Analytics updated
5. User continues → Adaptive algorithm → Next question selected
6. User views dashboard → Analytics calculated → Charts displayed
```

---

## 🎯 Success Criteria

Your application is working correctly if:

1. ✅ All API tests pass (test-api.js, test-questions.js, test-progress.js)
2. ✅ Can register and login without errors
3. ✅ Dashboard displays analytics after answering questions
4. ✅ Questions load and can be answered
5. ✅ Chat interface is responsive
6. ✅ Progress tracking updates in real-time
7. ✅ User level adapts based on performance
8. ✅ No console errors in browser (F12)
9. ✅ No unhandled promise rejections
10. ✅ All navigation works correctly

---

## 📝 Test Data Suggestions

### Sample Users
- Student 1: `alice@test.com` / `password123`
- Student 2: `bob@test.com` / `password123`
- Admin: `admin@satcoach.com` / `admin123`

### Testing Scenarios
1. **New User Journey**: Register → Study → View Progress
2. **Power User**: Answer 20+ questions, observe analytics
3. **Multi-Subject**: Mix Math, Reading, Writing questions
4. **Chat Heavy**: Ask many questions via chat
5. **Adaptive Test**: Intentionally fail/succeed to see level changes

---

## 🔜 Coming Soon (Not Yet Testable)

- ❌ Real AI responses (placeholder responses now)
- ❌ AI-generated questions (will need AI backend)
- ❌ Bookmarks functionality
- ❌ Timer for practice tests
- ❌ Export progress reports
- ❌ Performance charts/graphs

---

## 🎉 Ready to Test!

Open your browser to **http://localhost:5173** and start testing!

**Recommended Test Order:**
1. Run backend tests first (validate APIs)
2. Register a new user in the browser
3. Complete 5-10 questions
4. Check dashboard analytics
5. Test chat interface
6. Verify progress tracking

**Questions or Issues?**
- Check browser console (F12) for errors
- Check backend terminal for logs
- Review API responses in Network tab
- Verify MongoDB has data (use MongoDB Compass)

**Happy Testing! 🚀**

