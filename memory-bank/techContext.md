# Technical Context: SAT Coach

## Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: 
  - Context API for global state (auth, theme)
  - React Query (TanStack Query) for server state
- **Form Handling**: React Hook Form + Zod validation
- **Routing**: React Router v6
- **HTTP Client**: Axios with interceptors
- **Testing**: Vitest + React Testing Library

### DB Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **Validation**: Express Validator + Zod
- **Environment**: dotenv
- **Security**: Helmet, cors, rate-limit
- **Testing**: Jest + Supertest

### AI Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js with TypeScript
- **AI Service**: OpenAI API (GPT-4-mini)
- **Prompt Management**: LangChain (optional, for advanced flows)
- **Validation**: Zod
- **Caching**: Node-cache (in-memory)
- **Testing**: Jest

### Shared Package
- **Purpose**: Shared TypeScript types and utilities
- **Contents**: 
  - Type definitions (User, Question, ChatMessage, etc.)
  - Validation schemas
  - Constants
  - Utility functions

### DevOps & Deployment
- **Hosting**: Vercel (all three services)
- **Database**: MongoDB Atlas (shared cluster for dev, dedicated for prod)
- **CI/CD**: GitHub Actions + Vercel integration
- **Environment Management**: Vercel environment variables
- **Version Control**: Git + GitHub
- **Package Manager**: npm workspaces (monorepo)

## Development Environment Setup

### Prerequisites
```bash
Node.js 20+
npm 9+
Git
MongoDB Atlas account
OpenAI API account
Vercel account
```

### Environment Variables

#### DB Backend (.env)
```
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

#### AI Backend (.env)
```
PORT=3002
NODE_ENV=development
OPENAI_API_KEY=sk-...
DB_BACKEND_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:5173
```

#### Frontend (.env)
```
VITE_DB_API_URL=http://localhost:3001/api/v1
VITE_AI_API_URL=http://localhost:3002/api/v1
```

## Database Design

### MongoDB Collections

#### users
```typescript
{
  _id: ObjectId,
  email: string,              // unique
  password: string,           // hashed
  firstName: string,
  lastName: string,
  role: 'student' | 'admin',
  learningProfile: {
    currentLevel: number,     // 1-10 scale
    preferredDifficulty: 'easy' | 'medium' | 'hard',
    adaptiveSettings: {
      autoAdjust: boolean,
      adjustmentSpeed: number
    }
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### questions
```typescript
{
  _id: ObjectId,
  subject: 'math' | 'reading' | 'writing',
  difficulty: 'easy' | 'medium' | 'hard',
  difficultyScore: number,    // 1-10 granular
  content: {
    questionText: string,
    options: string[],        // for multiple choice
    correctAnswer: string,
    explanation: string
  },
  metadata: {
    generatedBy: 'ai' | 'manual',
    generatedAt: Date,
    timesUsed: number,
    averageAccuracy: number
  },
  tags: string[],             // e.g., ['algebra', 'quadratic-equations']
  createdAt: Date,
  updatedAt: Date
}
```

#### studentProgress
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  subject: string,
  topic: string,              // granular topic tracking
  attempts: [{
    questionId: ObjectId,
    attemptDate: Date,
    isCorrect: boolean,
    timeSpent: number,        // seconds
    hintsUsed: number,
    confidence: number,       // 1-5 scale
    chatInteractions: number
  }],
  performance: {
    totalAttempts: number,
    correctAttempts: number,
    accuracyRate: number,
    averageTime: number,
    lastAttemptDate: Date,
    nextReviewDate: Date,     // spaced repetition
    masteryLevel: number,     // 0-100
    easeFactor: number        // for SM-2 algorithm
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### chatSessions
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  questionId: ObjectId,
  messages: [{
    role: 'user' | 'assistant',
    content: string,
    timestamp: Date,
    tokens: number            // track API usage
  }],
  sessionMetadata: {
    startedAt: Date,
    endedAt: Date,
    totalInteractions: number,
    helpfulness: number,      // user rating 1-5
    difficultyLevel: number   // AI tutor difficulty
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### bookmarks
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  questionId: ObjectId,
  reason: string,             // why bookmarked
  tags: string[],
  markedForReview: boolean,
  createdAt: Date
}
```

#### studySessions
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  startTime: Date,
  endTime: Date,
  questionsAttempted: number,
  questionsCorrect: number,
  totalTimeSpent: number,
  subjects: string[],
  averageConfidence: number,
  createdAt: Date
}
```

## API Endpoints

### DB Backend (/api/v1)

#### Authentication
- `POST /auth/register` - Create account
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user
- `PUT /auth/password` - Change password

#### Users
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update profile
- `GET /users/progress` - Get learning progress
- `GET /users/analytics` - Get performance analytics

#### Questions
- `GET /questions` - List questions (with filters)
- `GET /questions/:id` - Get specific question
- `POST /questions` - Create question (admin)
- `PUT /questions/:id` - Update question (admin)
- `GET /questions/next` - Get next question (with adaptive logic)

#### Progress
- `POST /progress/attempt` - Record question attempt
- `GET /progress/topic/:topic` - Get topic progress
- `GET /progress/review-schedule` - Get spaced repetition schedule

#### Bookmarks
- `GET /bookmarks` - List bookmarks
- `POST /bookmarks` - Create bookmark
- `DELETE /bookmarks/:id` - Remove bookmark

#### Sessions
- `POST /sessions/start` - Start study session
- `PUT /sessions/:id/end` - End study session
- `GET /sessions/history` - Get session history

### AI Backend (/api/v1)

#### Question Generation
- `POST /questions/generate` - Generate new question
  ```json
  { "subject": "math", "difficulty": "medium", "topic": "algebra" }
  ```

#### Chat
- `POST /chat/message` - Send chat message
  ```json
  { 
    "questionId": "...",
    "message": "...",
    "chatHistory": [...],
    "studentLevel": 5
  }
  ```
- `GET /chat/session/:questionId` - Get chat history

#### Prompts
- `POST /prompts/test` - Test prompt (dev only)

## OpenAI Integration Strategy

### Prompt Engineering for Questions
```
System: You are an SAT question generator specialized in [subject].
Generate questions that match actual SAT format and difficulty.

User: Create a [difficulty] [subject] question about [topic].
Include 4 multiple choice options with one correct answer.
Provide a detailed explanation.

Format as JSON:
{
  "questionText": "...",
  "options": ["A...", "B...", "C...", "D..."],
  "correctAnswer": "A",
  "explanation": "..."
}
```

### Prompt Engineering for Tutoring
```
System: You are a patient SAT tutor helping a student understand this question.
Student difficulty level: [1-10]

Context:
- Question: [question text]
- Correct Answer: [answer]
- Student's understanding level: [level]

Guidelines:
- Adjust explanation complexity based on student level
- Use Socratic method - guide rather than tell
- Provide SAT strategies and tips
- Encourage and be positive
- If level < 5: Use simpler language, more examples
- If level > 7: Use advanced concepts, challenge thinking

User: [student's question]
```

### Context Preparation Materials
The AI will be given access to:
1. **SAT Strategy Guide**: Document with test-taking strategies
2. **Common Mistakes**: Patterns of typical student errors
3. **Scaffolding Techniques**: How to break down complex problems
4. **Subject-Specific Guides**: Math formulas, reading strategies, grammar rules

These will be stored as:
- JSON files in the AI backend
- Loaded and injected into system prompts
- Versioned for improvement over time

## Spaced Repetition Algorithm

### SM-2 Algorithm Implementation
```typescript
interface SpacedRepetitionResult {
  nextReviewDate: Date;
  easeFactor: number;
  interval: number;
}

function calculateNextReview(
  quality: number,          // 0-5 (quality of recall)
  easeFactor: number,       // current ease factor
  interval: number,         // days since last review
  repetitions: number       // number of reviews
): SpacedRepetitionResult {
  // SM-2 algorithm implementation
  // Returns when student should review this topic next
}
```

### Adaptive Difficulty Logic
```typescript
function adjustStudentLevel(
  currentLevel: number,
  recentPerformance: Attempt[]
): number {
  // Analyze last 10 attempts
  // Adjust level up if 80%+ correct
  // Adjust level down if <60% correct
  // Consider time spent and confidence
}
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Deploy
on:
  push:
    branches: [main, develop]

jobs:
  test:
    # Run tests for all packages
  deploy-frontend:
    # Deploy to Vercel
  deploy-db-backend:
    # Deploy to Vercel
  deploy-ai-backend:
    # Deploy to Vercel
```

### Vercel Configuration
- Separate projects for each service
- Environment variables per project
- Preview deployments for PRs
- Production deployment on main branch

## Development Workflow

1. **Local Development**
   ```bash
   npm install                    # Install all dependencies
   npm run dev                    # Start all services concurrently
   ```

2. **Database Setup**
   - Create MongoDB Atlas cluster
   - Set up database user
   - Whitelist IP addresses
   - Copy connection string to .env

3. **Testing**
   ```bash
   npm run test                   # Run all tests
   npm run test:watch             # Watch mode
   npm run test:coverage          # Coverage report
   ```

4. **Build**
   ```bash
   npm run build                  # Build all packages
   ```

## Performance Considerations

### Frontend Optimization
- Code splitting by route
- Lazy loading components
- React.memo for expensive components
- Debounced search/filter inputs
- Optimistic UI updates

### Backend Optimization
- Database connection pooling
- Index optimization
- Query result caching
- Pagination for large datasets
- Rate limiting

### AI Optimization
- Cache common responses
- Batch similar requests
- Stream responses for better UX
- Implement token limits
- Monitor costs

## Security Measures

1. **Authentication**: Secure JWT implementation
2. **Authorization**: Role-based access control
3. **Input Validation**: All user inputs validated
4. **SQL Injection**: N/A (NoSQL, but validate inputs)
5. **XSS Protection**: React escaping + CSP headers
6. **CSRF Protection**: SameSite cookies
7. **Rate Limiting**: Prevent abuse
8. **API Key Security**: Environment variables only
9. **HTTPS**: Enforced in production
10. **Data Encryption**: Passwords hashed, sensitive data encrypted at rest

