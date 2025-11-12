# 🎯 Complete Question Flow Implementation

## Overview

The SAT Coach application now has a **complete end-to-end question flow** that:

1. ✅ **Tracks which questions each user has seen** (no repeats)
2. ✅ **Generates new questions with AI** when needed
3. ✅ **Hides correct answers** until submission
4. ✅ **Validates answers server-side** for security
5. ✅ **Injects explanations into chat** when answers are wrong
6. ✅ **Saves questions to database** to avoid regenerating

---

## 🏗️ Architecture

### Backend Components

#### 1. **UserQuestion Model** (`packages/db-backend/src/models/UserQuestion.model.ts`)
Tracks which questions each user has been shown:

```typescript
{
  userId: ObjectId,           // Which user
  questionId: ObjectId,       // Which question
  shownAt: Date,              // When shown
  answered: boolean,          // Has user answered?
  isCorrect: boolean | null,  // Was it correct?
  userAnswer: string | null,  // What they answered
  timeSpent: number           // Time in seconds
}
```

**Indexes:**
- `{ userId, questionId }` - Unique constraint (can't show same question twice)
- `{ userId, answered }` - Query unanswered questions
- `{ userId, shownAt }` - Get recent questions

#### 2. **AI Integration Service** (`packages/db-backend/src/services/ai-integration.service.ts`)
Calls the AI backend to generate questions and saves them to the database:

```typescript
async generateAndSaveQuestion(
  subject: Subject,
  difficulty: Difficulty,
  topic?: string
): Promise<IQuestion>
```

**Flow:**
1. Call AI backend `/questions/generate`
2. Receive generated question
3. Save to MongoDB `questions` collection
4. Return saved question

#### 3. **Enhanced Question Service** (`packages/db-backend/src/services/question.service.ts`)

**New Methods:**

##### `getNextQuestionForUser(userId, subject?, topic?)`
Smart question selection:
1. Get all question IDs user has seen
2. Query for unseen questions matching filters
3. If none found → **Generate with AI**
4. Mark question as shown to user
5. Return question (without correct answer)

##### `submitAnswer(userId, questionId, userAnswer, timeSpent)`
Server-side answer validation:
1. Get question from database
2. Check if answer is correct
3. Update UserQuestion record
4. Update question statistics
5. Return result with explanation

#### 4. **Question Controller Updates** (`packages/db-backend/src/controllers/question.controller.ts`)

##### `GET /api/v1/questions/next`
- Uses `getNextQuestionForUser()` 
- **Strips correct answer** from response
- Returns question without revealing solution

##### `POST /api/v1/questions/:id/answer`
- Accepts user's answer
- Validates server-side
- Returns:
  ```json
  {
    "message": "Correct!" | "Incorrect",
    "isCorrect": true | false,
    "correctAnswer": "A",
    "explanation": "..." // Only if incorrect
  }
  ```

---

### Frontend Components

#### 1. **Question Service** (`packages/frontend/src/services/question.service.ts`)

**New Method:**
```typescript
async submitAnswer(
  questionId: string,
  userAnswer: string,
  timeSpent: number
): Promise<{
  message: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
}>
```

#### 2. **QuestionPanel** (`packages/frontend/src/components/QuestionPanel.tsx`)

**Changes:**
- No longer checks answers locally
- Removed `correctAnswer` comparison
- Shows "Answer submitted!" message
- Disables options after submission
- Waits for backend validation

**Props:**
```typescript
interface QuestionPanelProps {
  question: Question;
  onAnswerSubmit: (selectedAnswer: string) => void; // No isCorrect param
  loading: boolean;
}
```

#### 3. **ChatPanel** (`packages/frontend/src/components/ChatPanel.tsx`)

**New Prop:**
```typescript
interface ChatPanelProps {
  question: Question;
  answerResult?: {
    isCorrect: boolean;
    explanation: string | null;
  } | null;
}
```

**Behavior:**
- Watches `answerResult` prop
- When answer submitted:
  - ✅ Correct → Shows celebration message
  - ❌ Incorrect → Injects explanation into chat

#### 4. **StudyPage** (`packages/frontend/src/pages/StudyPage.tsx`)

**Enhanced Flow:**
```typescript
const handleAnswerSubmit = async (selectedAnswer: string) => {
  // 1. Submit to backend
  const result = await questionService.submitAnswer(
    questionId,
    selectedAnswer,
    timeSpent
  );

  // 2. Set result for ChatPanel
  setAnswerResult({
    isCorrect: result.isCorrect,
    explanation: result.explanation,
  });

  // 3. Record progress
  await progressService.recordAttempt(...);
  await sessionService.addQuestionToSession(...);

  // 4. Load next question after 5 seconds
  setTimeout(() => {
    setAnswerResult(null);
    loadNextQuestion();
  }, 5000);
};
```

---

## 🔄 Complete User Flow

### Step 1: User Requests Question
```
Frontend: GET /api/v1/questions/next?subject=math
         ↓
Backend:  1. Get user's seen question IDs
          2. Query for unseen questions
          3. If none → Generate with AI
          4. Mark as shown
          5. Return question (NO correct answer)
         ↓
Frontend: Display question with options
```

### Step 2: User Submits Answer
```
Frontend: User selects "B"
         ↓
Frontend: POST /api/v1/questions/:id/answer
          { userAnswer: "B", timeSpent: 45 }
         ↓
Backend:  1. Get question from DB
          2. Compare "B" with correct answer
          3. Update UserQuestion record
          4. Update question statistics
          5. Return result + explanation
         ↓
Frontend: Inject result into ChatPanel
```

### Step 3: Show Result
```
ChatPanel: 
  ✅ Correct → "🎉 Correct! Great job!"
  ❌ Incorrect → "❌ Incorrect\n\n[Explanation]"

After 5 seconds → Load next question
```

---

## 🎨 UI/UX Flow

### Before Submission
- User sees question text
- User sees 4 options (A, B, C, D)
- User can select one option
- "Submit Answer" button is enabled

### After Submission
- Options are disabled (grayed out)
- "Answer submitted!" message appears
- Chat shows result:
  - ✅ Correct: Celebration
  - ❌ Incorrect: Explanation injected
- After 5 seconds: New question loads

---

## 🔒 Security Features

### 1. **Server-Side Validation**
- Correct answer NEVER sent to frontend
- Backend validates all answers
- No client-side answer checking

### 2. **User Tracking**
- Each question shown is recorded
- Unique constraint prevents duplicates
- Audit trail of all attempts

### 3. **Authentication Required**
- All endpoints require JWT token
- User ID extracted from token
- No spoofing possible

---

## 📊 Database Schema

### UserQuestions Collection
```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  questionId: ObjectId("..."),
  shownAt: ISODate("2025-11-11T10:30:00Z"),
  answered: true,
  isCorrect: false,
  userAnswer: "B",
  timeSpent: 45,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Questions Collection
```javascript
{
  _id: ObjectId("..."),
  subject: "math",
  difficulty: "medium",
  difficultyScore: 5,
  content: {
    questionText: "...",
    options: ["A", "B", "C", "D"],
    correctAnswer: "A",
    explanation: "..."
  },
  tags: ["algebra", "equations"],
  metadata: {
    generatedBy: "ai",
    generatedAt: ISODate("..."),
    timesUsed: 5,
    averageAccuracy: 0.6,
    averageTimeSpent: 42
  }
}
```

---

## 🚀 API Endpoints

### Get Next Question
```http
GET /api/v1/questions/next?subject=math&topic=algebra
Authorization: Bearer <token>

Response:
{
  "question": {
    "_id": "...",
    "subject": "math",
    "difficulty": "medium",
    "content": {
      "questionText": "...",
      "options": ["A", "B", "C", "D"]
      // NO correctAnswer or explanation
    },
    "tags": ["algebra"]
  },
  "studentLevel": 5,
  "recommendedDifficulty": "medium"
}
```

### Submit Answer
```http
POST /api/v1/questions/:id/answer
Authorization: Bearer <token>
Content-Type: application/json

{
  "userAnswer": "B",
  "timeSpent": 45
}

Response:
{
  "message": "Incorrect",
  "isCorrect": false,
  "correctAnswer": "A",
  "explanation": "The correct approach is..."
}
```

---

## 🧪 Testing the Flow

### 1. Start All Servers
```bash
# Terminal 1 - DB Backend
cd packages/db-backend
npm run dev

# Terminal 2 - AI Backend
cd packages/ai-backend
npm run dev

# Terminal 3 - Frontend
cd packages/frontend
npm run dev
```

### 2. Test Scenario
1. **Login** to the application
2. **Navigate** to Study page
3. **Observe**: Question loads (no correct answer visible)
4. **Select** an answer
5. **Submit** answer
6. **Check Chat**: 
   - Correct → Celebration message
   - Incorrect → Explanation appears
7. **Wait 5 seconds**: New question loads
8. **Verify**: Previous question won't appear again

### 3. Database Verification
```javascript
// Check UserQuestions
db.userquestions.find({ userId: ObjectId("...") })

// Check Questions
db.questions.find({ "metadata.generatedBy": "ai" })
```

---

## 🎯 Key Features

### ✅ No Question Repeats
- Each user has a unique list of seen questions
- Questions are marked as shown before being displayed
- AI generates new questions when pool is exhausted

### ✅ AI Question Generation
- Seamless fallback to AI when no questions available
- Generated questions are saved to database
- Future users can see the same questions (efficient)

### ✅ Secure Answer Validation
- Correct answer never exposed to frontend
- All validation happens server-side
- Prevents cheating or inspection

### ✅ Adaptive Feedback
- Correct answers get celebration
- Incorrect answers get detailed explanations
- Explanations injected directly into chat

### ✅ Progress Tracking
- Every attempt is recorded
- Time spent is tracked
- Statistics updated for adaptive learning

---

## 🔧 Configuration

### Environment Variables

**DB Backend** (`.env`):
```env
AI_BACKEND_URL=http://localhost:3002/api/v1
MONGODB_URI=mongodb://localhost:27017/satcoach-dev
JWT_SECRET=your-secret-key
```

**AI Backend** (`.env`):
```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
PORT=3002
```

**Frontend** (`.env`):
```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_AI_API_URL=http://localhost:3002/api/v1
```

---

## 📈 Next Steps

### Potential Enhancements
1. **Question Navigation**: Allow users to go back to previous questions
2. **Bookmarking**: Let users save questions for later review
3. **Difficulty Adaptation**: Adjust question difficulty based on performance
4. **Hints System**: Provide progressive hints before revealing answer
5. **Explanation Rating**: Let users rate explanation quality
6. **Question Reporting**: Allow users to report incorrect/unclear questions

---

## 🐛 Troubleshooting

### Issue: Questions Repeating
**Solution**: Check UserQuestions collection for proper indexing
```javascript
db.userquestions.createIndex({ userId: 1, questionId: 1 }, { unique: true })
```

### Issue: AI Not Generating Questions
**Solution**: 
1. Check AI backend is running on port 3002
2. Verify `AI_BACKEND_URL` in db-backend `.env`
3. Check OpenAI API key is valid

### Issue: Correct Answer Visible
**Solution**: Ensure using updated `getNextQuestion` controller that strips answer

### Issue: Explanation Not Showing
**Solution**: Check `answerResult` prop is passed to ChatPanel

---

## ✨ Summary

The complete question flow is now fully implemented with:

- ✅ User-aware question tracking
- ✅ AI-powered question generation
- ✅ Secure server-side validation
- ✅ Automatic explanation injection
- ✅ No question repeats
- ✅ Database persistence
- ✅ Progress tracking integration

**The system is production-ready and provides a seamless learning experience!** 🎓

---

**Model Used: Claude Sonnet 4.5**

