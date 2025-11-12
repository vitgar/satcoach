# SAT Coach - Comprehensive Project Plan

## Executive Summary

**Project**: SAT Coach - AI-Powered Adaptive Learning Platform  
**Goal**: Create an intelligent tutoring system that helps high school students prepare for the SAT through personalized AI coaching, spaced repetition learning, and adaptive difficulty adjustment.

**Architecture**: Three-service monorepo
- Frontend: React + TypeScript
- DB Backend: Express + MongoDB
- AI Backend: Express + OpenAI GPT-4-mini

**Key Features**:
- AI-generated SAT questions by subject and difficulty
- Real-time AI tutoring with adaptive explanation complexity
- Spaced repetition algorithm for optimal review scheduling
- Comprehensive progress tracking and analytics
- Split-screen interface (question + chat)

**Timeline**: 8 weeks to MVP  
**Deployment**: Vercel with CI/CD via GitHub Actions

---

## Table of Contents
1. [Project Architecture](#project-architecture)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [AI Integration Strategy](#ai-integration-strategy)
5. [Spaced Repetition Implementation](#spaced-repetition-implementation)
6. [Development Phases](#development-phases)
7. [API Specifications](#api-specifications)
8. [Frontend Design](#frontend-design)
9. [Deployment Strategy](#deployment-strategy)
10. [Testing Strategy](#testing-strategy)
11. [Security Considerations](#security-considerations)
12. [Cost Management](#cost-management)
13. [Timeline & Milestones](#timeline--milestones)
14. [Risk Management](#risk-management)
15. [Success Criteria](#success-criteria)

---

## 1. Project Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│              React + TypeScript (Vercel)                     │
│  ┌──────────────────┐         ┌────────────────────────┐   │
│  │  Question Panel  │         │    AI Tutor Chat       │   │
│  │   - Display      │         │    - Chat Interface    │   │
│  │   - Timer        │         │    - History           │   │
│  │   - Navigation   │         │    - Adaptive UI       │   │
│  └──────────────────┘         └────────────────────────┘   │
└────────────────┬─────────────────────────┬──────────────────┘
                 │                         │
         ┌───────┴────────┐       ┌───────┴────────┐
         │  DB Backend    │       │  AI Backend    │
         │  Express + TS  │       │  Express + TS  │
         │  (Vercel)      │       │  (Vercel)      │
         └───────┬────────┘       └───────┬────────┘
                 │                         │
         ┌───────┴────────┐       ┌───────┴────────┐
         │  MongoDB Atlas │       │  OpenAI API    │
         │   - Users      │       │  GPT-4-mini    │
         │   - Questions  │       └────────────────┘
         │   - Progress   │
         │   - Chats      │
         └────────────────┘
```

### 1.2 Monorepo Structure

```
satcoach/
├── package.json                    # Root package.json (workspace)
├── .gitignore
├── README.md
├── PROJECT_PLAN.md
├── memory-bank/                    # Project documentation
│   ├── projectbrief.md
│   ├── productContext.md
│   ├── systemPatterns.md
│   ├── techContext.md
│   ├── activeContext.md
│   └── progress.md
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD pipeline
├── packages/
│   ├── shared/                     # Shared types and utils
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── user.types.ts
│   │   │   │   ├── question.types.ts
│   │   │   │   ├── progress.types.ts
│   │   │   │   ├── chat.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── schemas/
│   │   │   │   └── validation.schemas.ts
│   │   │   ├── constants/
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── dist/                   # Compiled output
│   │
│   ├── frontend/                   # React application
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── index.html
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── LoginForm.tsx
│   │   │   │   │   ├── SignupForm.tsx
│   │   │   │   │   └── ProtectedRoute.tsx
│   │   │   │   ├── question/
│   │   │   │   │   ├── QuestionPanel.tsx
│   │   │   │   │   ├── QuestionDisplay.tsx
│   │   │   │   │   ├── QuestionTimer.tsx
│   │   │   │   │   └── NavigationControls.tsx
│   │   │   │   ├── chat/
│   │   │   │   │   ├── TutorPanel.tsx
│   │   │   │   │   ├── ChatInterface.tsx
│   │   │   │   │   ├── MessageList.tsx
│   │   │   │   │   └── MessageInput.tsx
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── Dashboard.tsx
│   │   │   │   │   ├── ProgressOverview.tsx
│   │   │   │   │   ├── SubjectBreakdown.tsx
│   │   │   │   │   └── UpcomingReviews.tsx
│   │   │   │   └── ui/              # shadcn/ui components
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── SignupPage.tsx
│   │   │   │   ├── DashboardPage.tsx
│   │   │   │   └── StudySessionPage.tsx
│   │   │   ├── contexts/
│   │   │   │   ├── AuthContext.tsx
│   │   │   │   └── ThemeContext.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useQuestions.ts
│   │   │   │   ├── useChat.ts
│   │   │   │   └── useProgress.ts
│   │   │   ├── services/
│   │   │   │   ├── api.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── question.service.ts
│   │   │   │   ├── chat.service.ts
│   │   │   │   └── progress.service.ts
│   │   │   ├── utils/
│   │   │   └── styles/
│   │   └── tests/
│   │
│   ├── db-backend/                 # Database API
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   ├── vercel.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── config/
│   │   │   │   ├── database.ts
│   │   │   │   └── environment.ts
│   │   │   ├── models/
│   │   │   │   ├── User.model.ts
│   │   │   │   ├── Question.model.ts
│   │   │   │   ├── StudentProgress.model.ts
│   │   │   │   ├── ChatSession.model.ts
│   │   │   │   ├── Bookmark.model.ts
│   │   │   │   └── StudySession.model.ts
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── user.routes.ts
│   │   │   │   ├── question.routes.ts
│   │   │   │   ├── progress.routes.ts
│   │   │   │   ├── bookmark.routes.ts
│   │   │   │   └── session.routes.ts
│   │   │   ├── controllers/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── user.controller.ts
│   │   │   │   ├── question.controller.ts
│   │   │   │   ├── progress.controller.ts
│   │   │   │   ├── bookmark.controller.ts
│   │   │   │   └── session.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── spacedRepetition.service.ts
│   │   │   │   ├── adaptiveDifficulty.service.ts
│   │   │   │   └── analytics.service.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── validation.middleware.ts
│   │   │   │   ├── errorHandler.middleware.ts
│   │   │   │   └── rateLimit.middleware.ts
│   │   │   └── utils/
│   │   │       ├── jwt.utils.ts
│   │   │       └── password.utils.ts
│   │   └── tests/
│   │
│   └── ai-backend/                 # AI service
│       ├── package.json
│       ├── tsconfig.json
│       ├── .env.example
│       ├── vercel.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── config/
│       │   │   ├── openai.ts
│       │   │   └── environment.ts
│       │   ├── routes/
│       │   │   ├── question.routes.ts
│       │   │   └── chat.routes.ts
│       │   ├── controllers/
│       │   │   ├── question.controller.ts
│       │   │   └── chat.controller.ts
│       │   ├── services/
│       │   │   ├── questionGeneration.service.ts
│       │   │   ├── chatTutor.service.ts
│       │   │   ├── promptEngineering.service.ts
│       │   │   └── cache.service.ts
│       │   ├── prompts/
│       │   │   ├── questionGeneration.prompts.ts
│       │   │   ├── tutoring.prompts.ts
│       │   │   └── satStrategies.json
│       │   ├── middleware/
│       │   │   ├── validation.middleware.ts
│       │   │   └── errorHandler.middleware.ts
│       │   └── utils/
│       │       └── tokenTracking.utils.ts
│       └── tests/
```

### 1.3 Service Communication

**Frontend ↔ DB Backend**
- Authentication requests
- User profile management
- Question retrieval (cached questions)
- Progress tracking
- Bookmark operations
- Study session management

**Frontend ↔ AI Backend**
- New question generation requests
- Chat interactions with AI tutor
- Real-time streaming responses

**AI Backend ↔ DB Backend**
- Fetch user learning profile for adaptive prompts
- Save generated questions
- Retrieve question context for chat

**Communication Pattern**: RESTful APIs with JSON payloads

---

## 2. Technology Stack

### 2.1 Frontend
- **Framework**: React 18.3+
- **Language**: TypeScript 5.2+
- **Build Tool**: Vite 5.0+
- **Styling**: Tailwind CSS 3.4+
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: 
  - React Context API (auth, theme)
  - TanStack Query v5 (server state)
- **Form Handling**: React Hook Form + Zod
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Testing**: Vitest + React Testing Library
- **Dev Tools**: ESLint, Prettier

### 2.2 DB Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js 4.18+
- **Language**: TypeScript 5.2+
- **Database**: MongoDB 7.0+ with Mongoose 8.0+
- **Authentication**: 
  - jsonwebtoken (JWT)
  - bcrypt (password hashing)
- **Validation**: Zod
- **Security**:
  - helmet (security headers)
  - cors (CORS handling)
  - express-rate-limit
- **Testing**: Jest + Supertest
- **Dev Tools**: nodemon, ts-node

### 2.3 AI Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js 4.18+
- **Language**: TypeScript 5.2+
- **AI Service**: OpenAI SDK (GPT-4-mini)
- **Caching**: node-cache
- **Validation**: Zod
- **Testing**: Jest
- **Dev Tools**: nodemon, ts-node

### 2.4 Shared Package
- **Language**: TypeScript 5.2+
- **Validation**: Zod
- **Build**: tsc (TypeScript compiler)

### 2.5 DevOps
- **Version Control**: Git + GitHub
- **Package Manager**: npm (workspaces)
- **CI/CD**: GitHub Actions + Vercel
- **Hosting**: 
  - Frontend: Vercel (static)
  - DB Backend: Vercel Serverless Functions
  - AI Backend: Vercel Serverless Functions
- **Database**: MongoDB Atlas (M0 free tier for dev, M10+ for prod)
- **Monitoring**: Vercel Analytics + OpenAI usage dashboard

---

## 3. Database Schema

### 3.1 Users Collection

```typescript
interface User {
  _id: ObjectId;
  email: string;                    // unique, indexed
  password: string;                 // bcrypt hashed
  firstName: string;
  lastName: string;
  role: 'student' | 'admin';
  learningProfile: {
    currentLevel: number;           // 1-10 scale for AI difficulty
    preferredDifficulty: 'easy' | 'medium' | 'hard';
    adaptiveSettings: {
      autoAdjust: boolean;          // auto-adjust difficulty
      adjustmentSpeed: number;      // 1-5, how fast to adapt
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
- email: unique
- createdAt: 1
```

### 3.2 Questions Collection

```typescript
interface Question {
  _id: ObjectId;
  subject: 'math' | 'reading' | 'writing';
  difficulty: 'easy' | 'medium' | 'hard';
  difficultyScore: number;          // 1-10 granular
  content: {
    questionText: string;
    options: string[];              // ['A. ...', 'B. ...', 'C. ...', 'D. ...']
    correctAnswer: string;          // 'A', 'B', 'C', or 'D'
    explanation: string;            // Why correct answer is right
  };
  metadata: {
    generatedBy: 'ai' | 'manual';
    generatedAt: Date;
    timesUsed: number;              // how many times assigned
    averageAccuracy: number;        // 0-1, how often students get it right
    averageTimeSpent: number;       // seconds
  };
  tags: string[];                   // ['algebra', 'linear-equations', 'word-problems']
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
- { subject: 1, difficulty: 1 }: for filtering
- { tags: 1 }: for topic-based queries
- { 'metadata.timesUsed': 1 }: for selecting less-used questions
```

### 3.3 StudentProgress Collection

```typescript
interface StudentProgress {
  _id: ObjectId;
  userId: ObjectId;                 // ref: User
  subject: string;                  // 'math', 'reading', 'writing'
  topic: string;                    // 'algebra', 'geometry', etc.
  attempts: [
    {
      questionId: ObjectId;         // ref: Question
      attemptDate: Date;
      isCorrect: boolean;
      timeSpent: number;            // seconds
      hintsUsed: number;            // chat messages sent
      confidence: number;           // 1-5 self-reported
      chatInteractions: number;
    }
  ];
  performance: {
    totalAttempts: number;
    correctAttempts: number;
    accuracyRate: number;           // calculated
    averageTime: number;            // seconds
    lastAttemptDate: Date;
    nextReviewDate: Date;           // SPACED REPETITION
    masteryLevel: number;           // 0-100
    easeFactor: number;             // SM-2 algorithm parameter
    interval: number;               // days until next review
    repetitions: number;            // number of successful reviews
  };
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
- { userId: 1, subject: 1, topic: 1 }: unique compound
- { userId: 1, 'performance.nextReviewDate': 1 }: for review scheduling
- { userId: 1, 'performance.masteryLevel': 1 }: for analytics
```

### 3.4 ChatSessions Collection

```typescript
interface ChatSession {
  _id: ObjectId;
  userId: ObjectId;                 // ref: User
  questionId: ObjectId;             // ref: Question
  messages: [
    {
      role: 'user' | 'assistant';
      content: string;
      timestamp: Date;
      tokens: number;               // for cost tracking
    }
  ];
  sessionMetadata: {
    startedAt: Date;
    endedAt: Date | null;
    totalInteractions: number;
    helpfulness: number | null;     // 1-5 rating from user
    difficultyLevel: number;        // AI tutor difficulty at start
    finalDifficultyLevel: number;   // AI tutor difficulty at end
  };
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
- { userId: 1, questionId: 1 }: for retrieving chat history
- { questionId: 1 }: for analytics on question difficulty
- { createdAt: 1 }: for cleanup of old sessions
```

### 3.5 Bookmarks Collection

```typescript
interface Bookmark {
  _id: ObjectId;
  userId: ObjectId;                 // ref: User
  questionId: ObjectId;             // ref: Question
  reason: string;                   // why bookmarked
  tags: string[];                   // custom user tags
  markedForReview: boolean;
  notes: string;                    // user's personal notes
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
- { userId: 1, questionId: 1 }: unique compound
- { userId: 1, markedForReview: 1 }: for review list
```

### 3.6 StudySessions Collection

```typescript
interface StudySession {
  _id: ObjectId;
  userId: ObjectId;                 // ref: User
  startTime: Date;
  endTime: Date | null;             // null if still active
  questionsAttempted: ObjectId[];   // refs: Question
  questionsCorrect: ObjectId[];     // refs: Question
  totalTimeSpent: number;           // seconds
  subjects: string[];               // subjects practiced
  averageConfidence: number;        // 1-5
  timerUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
- { userId: 1, startTime: -1 }: for recent sessions
- { userId: 1, endTime: 1 }: for active sessions
```

---

## 4. AI Integration Strategy

### 4.1 OpenAI Configuration

**Model**: GPT-4-mini (or latest mini model available)
- **Reasoning**: Cost-effective, fast responses, sufficient intelligence for tutoring
- **Alternative**: GPT-4o-mini if available

**API Settings**:
```typescript
const openaiConfig = {
  model: 'gpt-4-mini',
  temperature: 0.7,              // some creativity, but controlled
  max_tokens: 1000,              // reasonable response length
  top_p: 1,
  frequency_penalty: 0.3,        // reduce repetition
  presence_penalty: 0.3
};
```

### 4.2 Question Generation System

#### 4.2.1 Prompt Template

```typescript
const QUESTION_GENERATION_PROMPT = `
You are an expert SAT question writer. Create authentic SAT questions that match the format, difficulty, and style of official College Board materials.

**Subject**: {subject}
**Difficulty**: {difficulty} (easy: basic concepts | medium: application | hard: advanced reasoning)
**Topic**: {topic}
**Style Requirements**: 
- For Math: Include real-world context when appropriate
- For Reading: Create passage-based or standalone questions
- For Writing: Focus on grammar, usage, and rhetoric

**Output Format** (JSON):
{
  "questionText": "Full question text here",
  "options": [
    "A) First option",
    "B) Second option",
    "C) Third option",
    "D) Fourth option"
  ],
  "correctAnswer": "A",
  "explanation": "Clear explanation of why this is correct and common mistakes"
}

**Quality Criteria**:
1. Authenticity: Matches SAT style and format
2. Clarity: Unambiguous wording
3. Distractor Quality: Wrong answers are plausible
4. Educational Value: Tests important concepts
5. Appropriate Difficulty: Matches requested level

Generate ONE high-quality question now.
`;
```

#### 4.2.2 Question Generation Flow

```typescript
async function generateQuestion(
  subject: Subject,
  difficulty: Difficulty,
  topic?: string
): Promise<Question> {
  // 1. Check if suitable cached question exists
  const cachedQuestion = await findCachedQuestion(subject, difficulty, topic);
  if (cachedQuestion && cachedQuestion.metadata.timesUsed < 10) {
    return cachedQuestion;
  }

  // 2. Generate new question with OpenAI
  const prompt = buildQuestionPrompt(subject, difficulty, topic);
  const response = await openai.chat.completions.create({
    model: 'gpt-4-mini',
    messages: [
      { role: 'system', content: QUESTION_GENERATION_SYSTEM },
      { role: 'user', content: prompt }
    ],
    temperature: 0.8,  // more variety for questions
    response_format: { type: 'json_object' }
  });

  // 3. Parse and validate
  const questionData = JSON.parse(response.choices[0].message.content);
  validateQuestionFormat(questionData);

  // 4. Save to database
  const question = await Question.create({
    subject,
    difficulty,
    difficultyScore: mapDifficultyToScore(difficulty),
    content: questionData,
    metadata: {
      generatedBy: 'ai',
      generatedAt: new Date(),
      timesUsed: 0,
      averageAccuracy: 0,
      averageTimeSpent: 0
    },
    tags: topic ? [topic] : []
  });

  return question;
}
```

### 4.3 AI Tutor Chat System

#### 4.3.1 System Prompt Engineering

```typescript
const buildTutorSystemPrompt = (studentLevel: number) => `
You are an encouraging SAT tutor helping a high school student understand this question. Your goal is to guide them to understanding, not just give the answer.

**Student Level**: ${studentLevel}/10
${studentLevel <= 3 ? '(Beginner - needs foundational concepts)' : ''}
${studentLevel >= 4 && studentLevel <= 7 ? '(Intermediate - needs guided practice)' : ''}
${studentLevel >= 8 ? '(Advanced - needs challenging extension)' : ''}

**Teaching Approach**:
${getTeachingApproachByLevel(studentLevel)}

**Core Principles**:
1. **Socratic Method**: Ask guiding questions rather than lecturing
2. **Encourage**: Praise effort and progress
3. **Scaffold**: Break complex problems into manageable steps
4. **Connect**: Relate to prior knowledge and real-world examples
5. **Strategy**: Teach SAT-specific test-taking strategies

**SAT Strategies** (incorporate naturally):
${SAT_STRATEGIES_CONTEXT}

**Response Style**:
- Keep responses conversational and encouraging
- Use examples and analogies appropriate for high school students
- Highlight key concepts in **bold**
- Use bullet points for multi-step processes
- End with a guiding question when appropriate

**What NOT to do**:
- Don't give away the answer immediately
- Don't use overly academic language
- Don't overwhelm with too much information at once
- Don't be condescending or impatient
`;

const getTeachingApproachByLevel = (level: number): string => {
  if (level <= 3) {
    return `
- Use simple, clear language
- Define all technical terms
- Provide concrete examples
- Break down into very small steps
- Check understanding frequently
- Be extra patient and encouraging`;
  } else if (level >= 4 && level <= 7) {
    return `
- Balance explanation with questioning
- Use moderate technical vocabulary
- Provide strategic hints
- Encourage independent thinking
- Connect to patterns and strategies
- Challenge slightly beyond comfort zone`;
  } else {
    return `
- Use advanced terminology appropriately
- Focus on efficiency and pattern recognition
- Discuss multiple solution approaches
- Extend to related concepts
- Encourage metacognition
- Prepare for hardest SAT questions`;
  }
};
```

#### 4.3.2 SAT Strategies Context

Create a file `satStrategies.json` with comprehensive SAT strategies:

```json
{
  "math": {
    "general": [
      "Always read the question carefully - what is it actually asking?",
      "Plug in answer choices when possible (work backwards)",
      "Estimate before calculating - eliminate unreasonable answers",
      "Draw diagrams for geometry problems",
      "Use the calculator strategically - don't over-rely on it"
    ],
    "algebra": [
      "Look for patterns and shortcuts before solving algebraically",
      "Substitute simple numbers to understand relationships",
      "Check your answer by plugging it back into the original equation"
    ],
    "geometry": [
      "Mark up the diagram with given information",
      "Look for special triangles (30-60-90, 45-45-90)",
      "Use unit circle knowledge for trigonometry"
    ]
  },
  "reading": {
    "general": [
      "Read questions before the passage to know what to look for",
      "Eliminate obviously wrong answers first",
      "Find evidence in the text - don't rely on assumptions",
      "Watch for extreme language in answer choices (usually wrong)",
      "Manage time - don't get stuck on one question"
    ],
    "mainIdea": [
      "Focus on the introduction and conclusion",
      "Look for repeated themes and concepts",
      "The correct answer is usually supported throughout the passage"
    ],
    "inference": [
      "The answer must be supported by the text",
      "Don't bring in outside knowledge",
      "Look for subtle implications, not explicit statements"
    ]
  },
  "writing": {
    "general": [
      "Read the sentence with each answer choice",
      "Trust your ear - often the correct answer 'sounds right'",
      "Be concise - shorter answers are often correct",
      "Watch for parallelism in lists and comparisons"
    ],
    "grammar": [
      "Check subject-verb agreement carefully",
      "Watch for pronoun-antecedent agreement",
      "Identify and fix run-on sentences and fragments",
      "Look for misplaced modifiers"
    ],
    "punctuation": [
      "Commas: use for lists, after introductory phrases, around non-essential clauses",
      "Semicolons: connect two independent clauses or separate complex list items",
      "Colons: introduce lists or explanations",
      "Apostrophes: show possession or form contractions (not plurals!)"
    ]
  },
  "testTaking": [
    "Answer every question - there's no penalty for guessing",
    "Mark questions you're unsure about and return if time permits",
    "Pace yourself - don't spend too long on any single question",
    "Stay calm - if stuck, skip and come back with fresh eyes"
  ]
}
```

#### 4.3.3 Chat Flow Implementation

```typescript
async function handleChatMessage(
  userId: string,
  questionId: string,
  message: string,
  chatHistory: ChatMessage[],
  studentLevel: number
): Promise<string> {
  // 1. Load question context
  const question = await Question.findById(questionId);
  
  // 2. Build context messages
  const systemPrompt = buildTutorSystemPrompt(studentLevel);
  const questionContext = buildQuestionContext(question);
  
  // 3. Prepare conversation history
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: questionContext },
    ...chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: message }
  ];

  // 4. Call OpenAI
  const response = await openai.chat.completions.create({
    model: 'gpt-4-mini',
    messages,
    temperature: 0.7,
    max_tokens: 1000
  });

  // 5. Extract and save response
  const assistantMessage = response.choices[0].message.content;
  const tokens = response.usage.total_tokens;

  await ChatSession.findOneAndUpdate(
    { userId, questionId },
    {
      $push: {
        messages: [
          { role: 'user', content: message, timestamp: new Date(), tokens: 0 },
          { role: 'assistant', content: assistantMessage, timestamp: new Date(), tokens }
        ]
      },
      $inc: { 'sessionMetadata.totalInteractions': 1 }
    },
    { upsert: true }
  );

  return assistantMessage;
}

function buildQuestionContext(question: Question): string {
  return `
**Current Question Context**:
Subject: ${question.subject}
Difficulty: ${question.difficulty}

Question: ${question.content.questionText}

Options:
${question.content.options.join('\n')}

Correct Answer: ${question.content.correctAnswer}
(Don't reveal this directly - guide the student to discover it)

Standard Explanation: ${question.content.explanation}
(Use this as reference, but adapt to student's level)
`;
}
```

### 4.4 Providing SAT Materials to AI

#### Strategy 1: System Prompt Injection (Recommended)
- **Method**: Include SAT strategies in system prompt
- **Pros**: Always available, no extra API calls, consistent
- **Cons**: Uses tokens in every request
- **Implementation**: Load `satStrategies.json` and inject relevant sections based on question subject

#### Strategy 2: RAG (Retrieval-Augmented Generation)
- **Method**: Store SAT materials in vector database, retrieve relevant chunks
- **Pros**: More scalable, can include extensive materials
- **Cons**: More complex, requires embedding API calls, additional infrastructure
- **Implementation**: Use Pinecone/Weaviate + OpenAI embeddings
- **When to use**: If SAT materials exceed ~2000 tokens or need to scale to hundreds of documents

#### Strategy 3: Fine-tuning (Future Enhancement)
- **Method**: Fine-tune GPT model on SAT tutoring conversations
- **Pros**: Most efficient at scale, embedded knowledge
- **Cons**: Expensive upfront, requires quality training data, less flexible
- **When to use**: After collecting significant user interaction data

**Recommendation for MVP**: Use Strategy 1 (System Prompt Injection)
- Simple to implement
- Sufficient for comprehensive SAT strategies
- Easy to update and iterate
- Predictable token usage

---

## 5. Spaced Repetition Implementation

### 5.1 SM-2 Algorithm Adaptation

The **SM-2** (SuperMemo 2) algorithm is the industry standard for spaced repetition. We'll adapt it for SAT prep.

#### 5.1.1 Core Algorithm

```typescript
interface SpacedRepetitionResult {
  nextReviewDate: Date;
  easeFactor: number;
  interval: number;      // days
  repetitions: number;
}

function calculateNextReview(
  quality: number,        // 0-5: quality of recall/performance
  easeFactor: number,     // current ease factor (default: 2.5)
  interval: number,       // current interval in days (0 for new)
  repetitions: number     // number of consecutive successful reviews
): SpacedRepetitionResult {
  // Quality mapping:
  // 0: Complete blackout
  // 1: Incorrect, but recognized correct answer
  // 2: Incorrect, but remembered after seeing answer
  // 3: Correct with serious difficulty
  // 4: Correct with hesitation
  // 5: Perfect response

  let newEaseFactor = easeFactor;
  let newInterval = interval;
  let newRepetitions = repetitions;

  // Update ease factor based on performance
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // Minimum ease factor of 1.3
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  // Calculate new interval
  if (quality < 3) {
    // Failed recall - reset
    newRepetitions = 0;
    newInterval = 1;  // review tomorrow
  } else {
    // Successful recall
    newRepetitions = repetitions + 1;
    
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEaseFactor);
    }
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    nextReviewDate,
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions
  };
}
```

#### 5.1.2 Converting Question Performance to Quality Score

```typescript
function calculateQualityScore(attempt: {
  isCorrect: boolean;
  timeSpent: number;
  hintsUsed: number;
  confidence: number;
}): number {
  // Start with correctness
  let quality = attempt.isCorrect ? 4 : 1;

  if (attempt.isCorrect) {
    // Adjust based on confidence
    if (attempt.confidence === 5) quality = 5;
    else if (attempt.confidence >= 4) quality = 4;
    else quality = 3;

    // Penalize if too many hints needed
    if (attempt.hintsUsed > 5) quality = Math.max(3, quality - 1);
  } else {
    // Even if incorrect, give credit if they understood after explanation
    if (attempt.hintsUsed > 0 && attempt.hintsUsed < 10) {
      quality = 2;  // Understood after seeing answer
    }
  }

  return quality;
}
```

#### 5.1.3 Service Implementation

```typescript
class SpacedRepetitionService {
  async recordAttempt(
    userId: string,
    questionId: string,
    attempt: QuestionAttempt
  ): Promise<void> {
    // 1. Get or create progress record
    const question = await Question.findById(questionId);
    const progress = await StudentProgress.findOne({
      userId,
      subject: question.subject,
      topic: question.tags[0] || question.subject
    }) || await this.createProgress(userId, question);

    // 2. Calculate quality score
    const quality = calculateQualityScore(attempt);

    // 3. Calculate next review using SM-2
    const srResult = calculateNextReview(
      quality,
      progress.performance.easeFactor,
      progress.performance.interval,
      progress.performance.repetitions
    );

    // 4. Update progress
    await StudentProgress.findByIdAndUpdate(progress._id, {
      $push: {
        attempts: {
          questionId,
          attemptDate: new Date(),
          isCorrect: attempt.isCorrect,
          timeSpent: attempt.timeSpent,
          hintsUsed: attempt.hintsUsed,
          confidence: attempt.confidence,
          chatInteractions: attempt.chatInteractions
        }
      },
      $set: {
        'performance.lastAttemptDate': new Date(),
        'performance.nextReviewDate': srResult.nextReviewDate,
        'performance.easeFactor': srResult.easeFactor,
        'performance.interval': srResult.interval,
        'performance.repetitions': srResult.repetitions
      },
      $inc: {
        'performance.totalAttempts': 1,
        'performance.correctAttempts': attempt.isCorrect ? 1 : 0
      }
    });

    // 5. Recalculate derived metrics
    await this.updatePerformanceMetrics(progress._id);
  }

  async getReviewSchedule(userId: string): Promise<ReviewItem[]> {
    const now = new Date();
    
    // Find all topics due for review
    const dueProgress = await StudentProgress.find({
      userId,
      'performance.nextReviewDate': { $lte: now }
    }).sort({ 'performance.nextReviewDate': 1 });

    return dueProgress.map(p => ({
      subject: p.subject,
      topic: p.topic,
      nextReviewDate: p.performance.nextReviewDate,
      masteryLevel: p.performance.masteryLevel,
      priority: this.calculatePriority(p)
    }));
  }

  private calculatePriority(progress: StudentProgress): number {
    // Priority factors:
    // 1. How overdue (negative is overdue)
    const daysOverdue = Math.min(0, 
      daysBetween(new Date(), progress.performance.nextReviewDate)
    );
    // 2. How low the mastery
    const masteryFactor = (100 - progress.performance.masteryLevel) / 100;
    // 3. How many attempts (newer topics are higher priority)
    const recencyFactor = Math.min(1, progress.performance.totalAttempts / 10);

    return (Math.abs(daysOverdue) * 2) + (masteryFactor * 5) + (recencyFactor * 3);
  }
}
```

### 5.2 Adaptive Difficulty System

```typescript
class AdaptiveDifficultyService {
  async adjustStudentLevel(userId: string): Promise<number> {
    // Get recent performance (last 10-20 attempts across all subjects)
    const recentProgress = await StudentProgress.find({ userId })
      .sort({ 'performance.lastAttemptDate': -1 })
      .limit(20);

    if (recentProgress.length === 0) return 5; // default middle level

    // Calculate recent accuracy
    const totalRecent = recentProgress.reduce((sum, p) => 
      sum + p.performance.totalAttempts, 0
    );
    const correctRecent = recentProgress.reduce((sum, p) => 
      sum + p.performance.correctAttempts, 0
    );
    const recentAccuracy = correctRecent / totalRecent;

    // Get current level
    const user = await User.findById(userId);
    const currentLevel = user.learningProfile.currentLevel;

    // Adjustment logic
    let newLevel = currentLevel;
    
    if (recentAccuracy >= 0.85) {
      // Doing very well - increase difficulty
      newLevel = Math.min(10, currentLevel + 1);
    } else if (recentAccuracy >= 0.70) {
      // Doing well - slight increase or maintain
      newLevel = Math.min(10, currentLevel + 0.5);
    } else if (recentAccuracy >= 0.55) {
      // Adequate - maintain level
      newLevel = currentLevel;
    } else if (recentAccuracy >= 0.40) {
      // Struggling - decrease difficulty
      newLevel = Math.max(1, currentLevel - 0.5);
    } else {
      // Really struggling - significant decrease
      newLevel = Math.max(1, currentLevel - 1);
    }

    // Update user profile
    await User.findByIdAndUpdate(userId, {
      'learningProfile.currentLevel': newLevel
    });

    return newLevel;
  }

  mapLevelToDifficulty(level: number): Difficulty {
    if (level <= 3) return 'easy';
    if (level <= 7) return 'medium';
    return 'hard';
  }

  async getNextQuestion(userId: string, subject?: Subject): Promise<Question> {
    // 1. Check review schedule first
    const dueReviews = await spacedRepetitionService.getReviewSchedule(userId);
    
    if (dueReviews.length > 0) {
      // Prioritize reviews
      const topReview = dueReviews[0];
      if (!subject || topReview.subject === subject) {
        return this.getQuestionForTopic(
          topReview.subject,
          topReview.topic,
          userId
        );
      }
    }

    // 2. No reviews due - get new question at appropriate difficulty
    const user = await User.findById(userId);
    const difficulty = this.mapLevelToDifficulty(
      user.learningProfile.currentLevel
    );

    // 3. Try to find existing question student hasn't seen
    const attemptedQuestionIds = await this.getAttemptedQuestionIds(userId);
    
    const newQuestion = await Question.findOne({
      subject: subject || { $exists: true },
      difficulty,
      _id: { $nin: attemptedQuestionIds }
    });

    if (newQuestion) return newQuestion;

    // 4. Generate new question
    return await aiBackend.generateQuestion(subject, difficulty);
  }
}
```

---

## 6. Development Phases

### Phase 1: Project Setup & Infrastructure (Week 1)

#### 1.1 Repository Initialization
```bash
# Initialize monorepo
mkdir satcoach
cd satcoach
npm init -y

# Update package.json for workspaces
{
  "name": "satcoach-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev --workspace=frontend\" \"npm run dev --workspace=db-backend\" \"npm run dev --workspace=ai-backend\"",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces"
  }
}

# Install root dev dependencies
npm install -D concurrently typescript @types/node eslint prettier

# Create workspace structure
mkdir -p packages/shared packages/frontend packages/db-backend packages/ai-backend
```

#### 1.2 Shared Package Setup
```bash
cd packages/shared
npm init -y
npm install zod
npm install -D typescript @types/node

# Create tsconfig.json, folder structure
# Implement shared types
```

#### 1.3 Git Setup
```bash
git init
# Create .gitignore (node_modules, .env, dist, build)
git add .
git commit -m "Initial commit: monorepo structure"

# Create GitHub repository
# Push to GitHub
```

#### 1.4 MongoDB Atlas Setup
- Create account
- Create cluster (M0 free tier for development)
- Set up database user
- Whitelist IP addresses (0.0.0.0/0 for development)
- Get connection string
- Create databases: satcoach-dev, satcoach-test, satcoach-prod

#### 1.5 OpenAI API Setup
- Create OpenAI account
- Generate API key
- Set up usage limits and alerts
- Test API connection

**Deliverables**:
- [x] Monorepo structure created
- [x] Shared types package initialized
- [x] Git repository initialized
- [x] MongoDB Atlas cluster created
- [x] OpenAI API key obtained
- [x] Development environment documented

---

### Phase 2: DB Backend Development (Week 2-3)

#### 2.1 Project Initialization
```bash
cd packages/db-backend
npm init -y
npm install express mongoose cors helmet express-validator bcrypt jsonwebtoken dotenv
npm install -D typescript @types/express @types/node @types/cors @types/bcrypt @types/jsonwebtoken ts-node nodemon jest supertest @types/jest @types/supertest

# Create tsconfig.json
# Create folder structure
```

#### 2.2 Database Connection & Models
1. **Database Config** (`config/database.ts`)
   - MongoDB connection with Mongoose
   - Connection pooling
   - Error handling

2. **Mongoose Models**:
   - User.model.ts
   - Question.model.ts
   - StudentProgress.model.ts
   - ChatSession.model.ts
   - Bookmark.model.ts
   - StudySession.model.ts

3. **Create indexes** for performance

#### 2.3 Authentication System
1. **Auth Service** (`services/auth.service.ts`)
   - Register user (email validation, password hashing)
   - Login user (credential validation, JWT generation)
   - Verify token

2. **JWT Utils** (`utils/jwt.utils.ts`)
   - Generate token
   - Verify token
   - Refresh token logic

3. **Auth Middleware** (`middleware/auth.middleware.ts`)
   - Verify JWT from cookie/header
   - Attach user to request
   - Role-based access control

4. **Auth Routes** (`routes/auth.routes.ts`)
   - POST /auth/register
   - POST /auth/login
   - POST /auth/logout
   - GET /auth/me

#### 2.4 Core Services

1. **Spaced Repetition Service** (`services/spacedRepetition.service.ts`)
   - SM-2 algorithm implementation
   - Calculate next review date
   - Get review schedule
   - Update progress tracking

2. **Adaptive Difficulty Service** (`services/adaptiveDifficulty.service.ts`)
   - Analyze student performance
   - Adjust difficulty level
   - Select next appropriate question
   - Map level to difficulty

3. **Analytics Service** (`services/analytics.service.ts`)
   - Calculate performance metrics
   - Generate progress reports
   - Subject breakdown analysis
   - Time-based trends

#### 2.5 API Routes & Controllers

1. **User Routes** (`routes/user.routes.ts`, `controllers/user.controller.ts`)
   - GET /users/profile
   - PUT /users/profile
   - GET /users/progress
   - GET /users/analytics

2. **Question Routes** (`routes/question.routes.ts`, `controllers/question.controller.ts`)
   - GET /questions (list with filters)
   - GET /questions/:id
   - POST /questions (admin)
   - GET /questions/next (adaptive logic)

3. **Progress Routes** (`routes/progress.routes.ts`, `controllers/progress.controller.ts`)
   - POST /progress/attempt
   - GET /progress/topic/:topic
   - GET /progress/review-schedule

4. **Bookmark Routes** (`routes/bookmark.routes.ts`, `controllers/bookmark.controller.ts`)
   - GET /bookmarks
   - POST /bookmarks
   - DELETE /bookmarks/:id

5. **Session Routes** (`routes/session.routes.ts`, `controllers/session.controller.ts`)
   - POST /sessions/start
   - PUT /sessions/:id/end
   - GET /sessions/history

#### 2.6 Middleware
1. **Validation Middleware** - Request validation with Zod
2. **Error Handler** - Centralized error handling
3. **Rate Limiting** - Prevent abuse
4. **CORS** - Configure allowed origins
5. **Security Headers** - Helmet configuration

#### 2.7 Testing
1. **Unit Tests**: Individual functions and services
2. **Integration Tests**: API endpoints with test database
3. **Test Coverage**: Aim for >80%

**Deliverables**:
- [x] Complete DB Backend API
- [x] All routes functional
- [x] Spaced repetition working
- [x] Adaptive difficulty working
- [x] Authentication implemented
- [x] Tests passing
- [x] API documentation

---

### Phase 3: AI Backend Development (Week 3-4)

#### 3.1 Project Initialization
```bash
cd packages/ai-backend
npm init -y
npm install express openai node-cache dotenv cors zod
npm install -D typescript @types/express @types/node ts-node nodemon jest @types/jest

# Create tsconfig.json
# Create folder structure
```

#### 3.2 OpenAI Integration
1. **OpenAI Config** (`config/openai.ts`)
   - Initialize OpenAI client
   - Configure API settings
   - Error handling

2. **Token Tracking** (`utils/tokenTracking.utils.ts`)
   - Track API usage
   - Calculate costs
   - Alert on thresholds

#### 3.3 Question Generation Service
1. **Prompt Templates** (`prompts/questionGeneration.prompts.ts`)
   - System prompt
   - Subject-specific prompts
   - Difficulty-specific instructions

2. **Question Generation Service** (`services/questionGeneration.service.ts`)
   - Generate question with OpenAI
   - Validate format
   - Save to DB Backend
   - Handle errors

3. **Caching Layer** (`services/cache.service.ts`)
   - Cache recent questions
   - Cache common responses
   - TTL management

#### 3.4 Chat Tutor Service
1. **SAT Strategies** (`prompts/satStrategies.json`)
   - Math strategies
   - Reading strategies
   - Writing strategies
   - Test-taking tips

2. **Prompt Engineering** (`services/promptEngineering.service.ts`)
   - Build system prompt based on student level
   - Inject SAT strategies
   - Build question context
   - Manage conversation history

3. **Chat Tutor Service** (`services/chatTutor.service.ts`)
   - Handle chat messages
   - Maintain conversation context
   - Adapt to student level
   - Stream responses (optional)
   - Save to DB Backend

#### 3.5 API Routes & Controllers
1. **Question Routes** (`routes/question.routes.ts`, `controllers/question.controller.ts`)
   - POST /questions/generate

2. **Chat Routes** (`routes/chat.routes.ts`, `controllers/chat.controller.ts`)
   - POST /chat/message
   - GET /chat/session/:questionId

#### 3.6 Testing
1. **Unit Tests**: Prompt building, validation
2. **Integration Tests**: OpenAI API calls (with mocking)
3. **Quality Tests**: Validate AI response quality

**Deliverables**:
- [x] AI Backend API complete
- [x] Question generation working
- [x] Chat tutor working
- [x] SAT strategies integrated
- [x] Adaptive prompting working
- [x] Tests passing

---

### Phase 4: Frontend Development (Week 4-6)

#### 4.1 Project Initialization
```bash
cd packages/frontend
npm create vite@latest . -- --template react-ts
npm install

# Install dependencies
npm install react-router-dom @tanstack/react-query axios react-hook-form zod @hookform/resolvers
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install shadcn/ui
npx shadcn-ui@latest init
```

#### 4.2 Project Structure Setup
1. Create folder structure (components, pages, hooks, services, contexts)
2. Configure Tailwind CSS
3. Set up routing with React Router
4. Configure React Query
5. Set up Axios interceptors

#### 4.3 Authentication System
1. **Auth Context** (`contexts/AuthContext.tsx`)
   - User state management
   - Login/logout functions
   - Token management

2. **Auth Service** (`services/auth.service.ts`)
   - API calls for auth
   - Token storage
   - Auto-refresh logic

3. **Auth Components**:
   - LoginForm.tsx
   - SignupForm.tsx
   - ProtectedRoute.tsx

4. **Auth Pages**:
   - LoginPage.tsx
   - SignupPage.tsx

#### 4.4 Dashboard Development
1. **Dashboard Page** (`pages/DashboardPage.tsx`)
   - Overview layout
   - Navigation to study session

2. **Dashboard Components**:
   - ProgressOverview.tsx (overall stats)
   - SubjectBreakdown.tsx (by subject)
   - UpcomingReviews.tsx (spaced repetition schedule)
   - RecentActivity.tsx (recent sessions)

3. **Analytics Visualizations**:
   - Use recharts or similar for graphs
   - Accuracy trends
   - Time spent per subject
   - Mastery levels

#### 4.5 Study Session - Question Panel
1. **Study Session Page** (`pages/StudySessionPage.tsx`)
   - Split-screen layout
   - Responsive design

2. **Question Panel** (`components/question/QuestionPanel.tsx`)
   - Layout container for left side

3. **Question Components**:
   - QuestionDisplay.tsx (question text and options)
   - QuestionTimer.tsx (optional timer)
   - NavigationControls.tsx (next, previous, bookmark)
   - AnswerSubmit.tsx (submit answer with confidence)

4. **Question Hooks**:
   - useQuestions.ts (fetch questions, get next)
   - useQuestionAttempt.ts (submit answer, update progress)

#### 4.6 Study Session - Chat Panel
1. **Tutor Panel** (`components/chat/TutorPanel.tsx`)
   - Layout container for right side

2. **Chat Components**:
   - ChatInterface.tsx (main chat container)
   - MessageList.tsx (display messages)
   - Message.tsx (individual message bubble)
   - MessageInput.tsx (input field and send button)
   - TypingIndicator.tsx (while AI is responding)

3. **Chat Hooks**:
   - useChat.ts (send message, load history)
   - useChatStream.ts (optional streaming)

#### 4.7 Additional Features
1. **Bookmarks**:
   - BookmarkButton.tsx
   - BookmarksPage.tsx (list all bookmarks)

2. **Settings**:
   - SettingsPage.tsx
   - Profile editing
   - Adaptive settings (auto-adjust on/off)

3. **Session Timer**:
   - SessionTimer.tsx
   - Start/pause/stop functionality

#### 4.8 Styling & UI Polish
1. Install and configure shadcn/ui components:
   - Button, Input, Card, Dialog, Select, etc.

2. Create consistent theme:
   - Colors, typography, spacing
   - Dark mode support (optional)

3. Responsive design:
   - Mobile-friendly (chat below question on mobile)
   - Tablet optimization

4. Loading states:
   - Skeletons for loading content
   - Spinners for actions

5. Error states:
   - Error boundaries
   - User-friendly error messages

#### 4.9 Testing
1. **Component Tests**: Vitest + React Testing Library
2. **Integration Tests**: User flows
3. **E2E Tests**: Playwright (optional for MVP)

**Deliverables**:
- [x] Complete React frontend
- [x] Authentication working
- [x] Dashboard with analytics
- [x] Study session with split-screen
- [x] Question display and interaction
- [x] AI chat working
- [x] Bookmarks and features
- [x] Responsive design
- [x] Tests passing

---

### Phase 5: Integration & Testing (Week 6)

#### 5.1 Frontend-Backend Integration
1. Connect all frontend services to backends
2. Test authentication flow end-to-end
3. Test question fetching and generation
4. Test chat interactions
5. Test progress tracking and analytics

#### 5.2 Feature Testing
1. **User Journey Testing**:
   - Sign up → Profile setup → Dashboard → Study → Progress tracking
   
2. **Spaced Repetition Testing**:
   - Complete questions
   - Wait for review schedule
   - Verify questions reappear at right time

3. **Adaptive Difficulty Testing**:
   - Answer questions correctly
   - Verify difficulty increases
   - Answer incorrectly
   - Verify difficulty decreases

4. **Chat Quality Testing**:
   - Test at different student levels
   - Verify appropriate complexity
   - Test SAT strategy integration

#### 5.3 Bug Fixes & Refinement
1. Fix identified bugs
2. Optimize performance bottlenecks
3. Improve error handling
4. Enhance user experience based on testing

**Deliverables**:
- [x] All features integrated
- [x] End-to-end functionality verified
- [x] Major bugs fixed
- [x] Performance optimized

---

### Phase 6: Deployment (Week 7)

#### 6.1 Vercel Setup
1. **Create Vercel Account**
2. **Create Vercel Projects**:
   - satcoach-frontend
   - satcoach-db-backend
   - satcoach-ai-backend

3. **Configure Build Settings**:
   - Frontend: Vite build
   - Backends: Node.js serverless functions

#### 6.2 Environment Variables
1. **Frontend**:
   ```
   VITE_DB_API_URL=https://satcoach-db-backend.vercel.app/api/v1
   VITE_AI_API_URL=https://satcoach-ai-backend.vercel.app/api/v1
   ```

2. **DB Backend**:
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=...
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   CORS_ORIGIN=https://satcoach.vercel.app
   ```

3. **AI Backend**:
   ```
   OPENAI_API_KEY=sk-...
   DB_BACKEND_URL=https://satcoach-db-backend.vercel.app/api/v1
   NODE_ENV=production
   CORS_ORIGIN=https://satcoach.vercel.app
   ```

#### 6.3 MongoDB Production Setup
1. Upgrade to dedicated cluster (M10+) for production
2. Configure production database
3. Set up backups
4. Configure IP whitelist for Vercel
5. Enable monitoring

#### 6.4 CI/CD Pipeline
Create GitHub Actions workflow (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm test

  deploy-frontend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_FRONTEND_PROJECT_ID }}
          working-directory: ./packages/frontend
          vercel-args: '--prod'

  deploy-db-backend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_DB_BACKEND_PROJECT_ID }}
          working-directory: ./packages/db-backend
          vercel-args: '--prod'

  deploy-ai-backend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_AI_BACKEND_PROJECT_ID }}
          working-directory: ./packages/ai-backend
          vercel-args: '--prod'
```

#### 6.5 Testing Deployment
1. Deploy to staging environment (develop branch)
2. Test all functionality in staging
3. Deploy to production (main branch)
4. Smoke test production

**Deliverables**:
- [x] All services deployed to Vercel
- [x] Production MongoDB configured
- [x] Environment variables set
- [x] CI/CD pipeline working
- [x] Production tested and verified

---

### Phase 7: Monitoring & Optimization (Week 8)

#### 7.1 Monitoring Setup
1. **Vercel Analytics**: Enable for frontend
2. **OpenAI Usage Dashboard**: Monitor costs
3. **MongoDB Atlas Monitoring**: Performance metrics
4. **Error Tracking**: Sentry or similar (optional)

#### 7.2 Performance Optimization
1. **Frontend**:
   - Code splitting
   - Lazy loading
   - Image optimization
   - Bundle size optimization

2. **Backend**:
   - Database query optimization
   - Caching strategies
   - Response time monitoring

3. **AI**:
   - Response caching
   - Token optimization
   - Cost monitoring

#### 7.3 Security Audit
1. Review authentication implementation
2. Check for common vulnerabilities (OWASP Top 10)
3. Validate input sanitization
4. Review API rate limiting
5. Check environment variable security

#### 7.4 Documentation
1. **README Files**:
   - Root README with overview
   - Each package README with setup instructions

2. **API Documentation**:
   - Document all endpoints
   - Request/response examples
   - Error codes

3. **Deployment Guide**:
   - How to deploy
   - Environment setup
   - Troubleshooting

**Deliverables**:
- [x] Monitoring in place
- [x] Performance optimized
- [x] Security validated
- [x] Documentation complete
- [x] Production ready

---

## 7. API Specifications

### 7.1 DB Backend API (`/api/v1`)

#### Authentication Endpoints

**POST /auth/register**
```json
Request:
{
  "email": "student@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}

Response (201):
{
  "user": {
    "id": "654abc...",
    "email": "student@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student"
  },
  "token": "eyJhbGc..."
}

Errors:
400: Invalid email format
409: Email already exists
500: Server error
```

**POST /auth/login**
```json
Request:
{
  "email": "student@example.com",
  "password": "SecurePass123!"
}

Response (200):
{
  "user": { ... },
  "token": "eyJhbGc..."
}

Errors:
401: Invalid credentials
500: Server error
```

**GET /auth/me**
```
Headers: Authorization: Bearer {token}

Response (200):
{
  "user": {
    "id": "654abc...",
    "email": "student@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "learningProfile": {
      "currentLevel": 5,
      "preferredDifficulty": "medium"
    }
  }
}

Errors:
401: Unauthorized
```

#### Question Endpoints

**GET /questions/next**
```
Headers: Authorization: Bearer {token}
Query Params: ?subject=math (optional)

Response (200):
{
  "question": {
    "id": "654abc...",
    "subject": "math",
    "difficulty": "medium",
    "content": {
      "questionText": "If 2x + 3 = 11, what is x?",
      "options": ["A) 3", "B) 4", "C) 5", "D) 6"],
      "correctAnswer": "B"
    },
    "tags": ["algebra", "linear-equations"]
  },
  "isReview": false
}
```

**GET /questions/:id**
```
Headers: Authorization: Bearer {token}

Response (200):
{
  "question": { ... },
  "previousAttempts": [
    {
      "date": "2024-11-08T10:30:00Z",
      "isCorrect": false,
      "timeSpent": 120
    }
  ]
}
```

#### Progress Endpoints

**POST /progress/attempt**
```json
Headers: Authorization: Bearer {token}

Request:
{
  "questionId": "654abc...",
  "isCorrect": true,
  "timeSpent": 90,
  "confidence": 4,
  "hintsUsed": 2
}

Response (200):
{
  "success": true,
  "nextReviewDate": "2024-11-17T10:30:00Z",
  "masteryLevel": 65,
  "newStudentLevel": 5.5
}
```

**GET /progress/review-schedule**
```
Headers: Authorization: Bearer {token}

Response (200):
{
  "reviews": [
    {
      "subject": "math",
      "topic": "algebra",
      "nextReviewDate": "2024-11-10T00:00:00Z",
      "masteryLevel": 45,
      "priority": 8.5
    },
    {
      "subject": "reading",
      "topic": "inference",
      "nextReviewDate": "2024-11-11T00:00:00Z",
      "masteryLevel": 70,
      "priority": 5.2
    }
  ]
}
```

**GET /users/analytics**
```
Headers: Authorization: Bearer {token}
Query: ?timeframe=week|month|all

Response (200):
{
  "overall": {
    "totalQuestions": 145,
    "correctAnswers": 98,
    "accuracyRate": 0.676,
    "totalTimeSpent": 12600,
    "averageTimePerQuestion": 87
  },
  "bySubject": {
    "math": {
      "attempted": 50,
      "correct": 35,
      "accuracy": 0.70,
      "masteryLevel": 65
    },
    "reading": { ... },
    "writing": { ... }
  },
  "trends": [
    { "date": "2024-11-03", "accuracy": 0.60 },
    { "date": "2024-11-04", "accuracy": 0.65 },
    { "date": "2024-11-05", "accuracy": 0.68 }
  ]
}
```

### 7.2 AI Backend API (`/api/v1`)

**POST /questions/generate**
```json
Request:
{
  "subject": "math",
  "difficulty": "medium",
  "topic": "algebra"  // optional
}

Response (200):
{
  "question": {
    "id": "654def...",  // newly created in DB
    "subject": "math",
    "difficulty": "medium",
    "content": {
      "questionText": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "C",
      "explanation": "..."
    },
    "tags": ["algebra", "quadratic-equations"]
  }
}

Errors:
400: Invalid parameters
429: Rate limit exceeded
500: OpenAI API error
```

**POST /chat/message**
```json
Request:
{
  "questionId": "654abc...",
  "message": "I don't understand why the answer is B",
  "chatHistory": [
    { "role": "user", "content": "Can you help me?" },
    { "role": "assistant", "content": "Of course! ..." }
  ],
  "studentLevel": 5
}

Response (200):
{
  "response": "Great question! Let's break this down step by step...",
  "tokens": 235
}

Errors:
400: Invalid request
404: Question not found
429: Rate limit exceeded
500: OpenAI API error
```

---

## 8. Frontend Design

### 8.1 Design System

**Colors**:
```css
:root {
  /* Primary */
  --primary: #2563eb;      /* Blue */
  --primary-dark: #1e40af;
  --primary-light: #60a5fa;
  
  /* Secondary */
  --secondary: #10b981;    /* Green for success */
  --warning: #f59e0b;      /* Amber for attention */
  --danger: #ef4444;       /* Red for errors */
  
  /* Neutral */
  --background: #ffffff;
  --surface: #f9fafb;
  --border: #e5e7eb;
  --text-primary: #111827;
  --text-secondary: #6b7280;
}
```

**Typography**:
- Headings: Inter or similar modern sans-serif
- Body: System font stack for performance
- Code: JetBrains Mono for technical content

### 8.2 Page Layouts

#### Login/Signup Page
```
┌────────────────────────────────────────┐
│                                        │
│         [SAT Coach Logo]               │
│                                        │
│    ┌──────────────────────────┐       │
│    │                          │       │
│    │   Email: [_________]     │       │
│    │   Password: [_______]    │       │
│    │                          │       │
│    │   [Login Button]         │       │
│    │                          │       │
│    │   Don't have account?    │       │
│    │   [Sign Up]              │       │
│    │                          │       │
│    └──────────────────────────┘       │
│                                        │
└────────────────────────────────────────┘
```

#### Dashboard Page
```
┌────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard  Study  Bookmarks  Profile  [Logout] │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Welcome back, John!                                   │
│                                                        │
│  ┌──────────────────┐  ┌──────────────────┐          │
│  │ Progress Overview│  │ Subject Breakdown│          │
│  │                  │  │                  │          │
│  │ 145 Questions    │  │ Math:     70%    │          │
│  │ 68% Accuracy     │  │ Reading:  65%    │          │
│  │ 12.5 hrs studied │  │ Writing:  72%    │          │
│  └──────────────────┘  └──────────────────┘          │
│                                                        │
│  ┌──────────────────────────────────────┐            │
│  │ Upcoming Reviews (Spaced Repetition) │            │
│  │                                      │            │
│  │ • Algebra - Due today                │            │
│  │ • Reading Inference - Due tomorrow   │            │
│  │ • Grammar Rules - Due in 3 days      │            │
│  └──────────────────────────────────────┘            │
│                                                        │
│  [Start Study Session]                                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### Study Session Page (Desktop)
```
┌────────────────────────────────────────────────────────────────┐
│ [Logo]  [Timer: 15:23]  [Subject: Math]  [Quit]              │
├────────────────────────────────────────────────────────────────┤
│                        │                                       │
│  Question Panel        │    AI Tutor Chat                     │
│  (50% width)           │    (50% width)                       │
│                        │                                       │
│  Subject: Math         │  ┌────────────────────────────────┐ │
│  Difficulty: Medium    │  │ Messages scroll here           │ │
│                        │  │                                │ │
│  If 2x + 3 = 11,       │  │ User: How do I start?          │ │
│  what is x?            │  │                                │ │
│                        │  │ AI: Great question! Let's      │ │
│  A) 3                  │  │     isolate x step by step...  │ │
│  B) 4   [Selected]     │  │                                │ │
│  C) 5                  │  │ User: What do I do first?      │ │
│  D) 6                  │  │                                │ │
│                        │  │ AI: The first step is to...    │ │
│  [Submit Answer]       │  │                                │ │
│                        │  └────────────────────────────────┘ │
│  Confidence: ⭐⭐⭐⭐⭐   │                                       │
│                        │  ┌────────────────────────────────┐ │
│  [← Previous]  [Next →]│  │ Type your question...          │ │
│  [Bookmark] [Review]   │  │ [Send]                         │ │
│                        │  └────────────────────────────────┘ │
│                        │                                       │
└────────────────────────────────────────────────────────────────┘
```

#### Study Session Page (Mobile - Stacked)
```
┌──────────────────────┐
│ [Logo] Math [Timer]  │
├──────────────────────┤
│                      │
│ Question Panel       │
│                      │
│ If 2x + 3 = 11,      │
│ what is x?           │
│                      │
│ ○ A) 3               │
│ ● B) 4               │
│ ○ C) 5               │
│ ○ D) 6               │
│                      │
│ [Submit Answer]      │
│                      │
├──────────────────────┤
│ AI Tutor Chat        │
│ [Expand ▲]           │
├──────────────────────┤
│                      │
│ (Chat interface)     │
│                      │
└──────────────────────┘
```

### 8.3 Component Library (shadcn/ui)

Install these shadcn/ui components:
- button
- card
- input
- textarea
- select
- dialog
- toast
- progress
- skeleton
- badge
- separator

---

## 9. Deployment Strategy

### 9.1 Vercel Configuration

**Frontend (vercel.json)**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**DB Backend (vercel.json)**:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.ts"
    }
  ]
}
```

**AI Backend (vercel.json)**:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.ts"
    }
  ],
  "functions": {
    "src/index.ts": {
      "maxDuration": 30
    }
  }
}
```

### 9.2 Environment Configuration

**Development** (.env.local):
- Local MongoDB or Atlas dev cluster
- OpenAI dev API key (with low limits)
- Localhost URLs

**Staging** (Vercel environment variables):
- Atlas staging cluster
- OpenAI staging key (moderate limits)
- Staging URLs

**Production** (Vercel environment variables):
- Atlas production cluster (dedicated)
- OpenAI production key (with alerts)
- Production URLs

### 9.3 Deployment Workflow

1. **Develop on feature branch**
2. **Create PR to `develop` branch**
   - CI runs tests
   - Preview deployment created
3. **Merge to `develop`**
   - Deploy to staging environment
   - Run integration tests
4. **Create PR to `main` branch**
   - Final review
5. **Merge to `main`**
   - Deploy to production
   - Smoke test
   - Monitor

---

## 10. Testing Strategy

### 10.1 Unit Testing

**DB Backend**:
- Services: Spaced repetition logic, adaptive difficulty
- Utilities: JWT functions, password hashing
- Validation: Zod schemas

**AI Backend**:
- Prompt building functions
- Token tracking
- Response parsing

**Frontend**:
- Hooks logic
- Utility functions
- Context providers

### 10.2 Integration Testing

**DB Backend**:
- API endpoints with test database
- Authentication flow
- CRUD operations

**AI Backend**:
- OpenAI integration (with mocking)
- Error handling

**Frontend**:
- API service calls (with MSW)
- Component integration

### 10.3 End-to-End Testing

**Critical User Flows**:
1. Sign up → Login → Dashboard
2. Start study session → Answer question → Submit
3. Chat with AI → Get help → Answer correctly
4. Complete session → View progress
5. Return next day → See review questions

---

## 11. Security Considerations

### 11.1 Authentication Security
- ✅ Passwords hashed with bcrypt (10+ rounds)
- ✅ JWT tokens with reasonable expiration
- ✅ HTTP-only cookies for token storage
- ✅ Refresh token rotation
- ✅ Rate limiting on auth endpoints

### 11.2 API Security
- ✅ CORS properly configured
- ✅ Helmet for security headers
- ✅ Input validation on all endpoints
- ✅ Rate limiting per user
- ✅ API key rotation strategy

### 11.3 Database Security
- ✅ MongoDB authentication enabled
- ✅ IP whitelist configured
- ✅ Least privilege user access
- ✅ Regular backups
- ✅ Encryption at rest

### 11.4 OpenAI Security
- ✅ API key in environment variables only
- ✅ Usage limits configured
- ✅ Cost alerts enabled
- ✅ Input sanitization before sending to AI
- ✅ Output validation after receiving from AI

---

## 12. Cost Management

### 12.1 OpenAI API Costs

**GPT-4-mini Pricing** (as of Nov 2024):
- Input: ~$0.15 per 1M tokens
- Output: ~$0.60 per 1M tokens

**Estimated Usage**:
- Question generation: ~500 tokens per question
- Chat message: ~800 tokens per exchange (avg)

**Monthly Estimates** (100 active users):
- Questions: 100 users × 20 questions/month × 500 tokens = 1M tokens → $0.75
- Chat: 100 users × 100 messages/month × 800 tokens = 8M tokens → $6.00
- **Total: ~$7/month**

**Cost Optimization**:
1. ✅ Cache generated questions
2. ✅ Limit chat history context (last 10 messages)
3. ✅ Rate limit per user
4. ✅ Monitor usage with alerts

### 12.2 MongoDB Atlas Costs

**Free Tier (M0)**:
- 512 MB storage
- Shared RAM
- Suitable for development and small MVP

**Estimated Production** (M10 - $0.08/hr):
- ~$57/month
- 10GB storage
- 2GB RAM
- Suitable for 100-500 users

### 12.3 Vercel Costs

**Hobby Plan** (Free):
- Suitable for development and small MVP
- 100 GB bandwidth
- Serverless function execution limits

**Pro Plan** ($20/month):
- Recommended for production
- 1 TB bandwidth
- Higher function limits
- Commercial use

---

## 13. Timeline & Milestones

### Week 1: Foundation
- [x] Requirements gathering
- [x] Planning complete
- [ ] Monorepo setup
- [ ] Shared types package
- [ ] MongoDB Atlas configured
- [ ] OpenAI API configured

### Week 2-3: Backend Development
- [ ] DB Backend complete
- [ ] All API endpoints working
- [ ] Authentication functional
- [ ] Spaced repetition implemented
- [ ] Adaptive difficulty implemented
- [ ] Backend tests passing

### Week 3-4: AI Backend Development
- [ ] AI Backend complete
- [ ] Question generation working
- [ ] Chat tutor working
- [ ] SAT strategies integrated
- [ ] AI tests passing

### Week 4-6: Frontend Development
- [ ] React app initialized
- [ ] Authentication UI complete
- [ ] Dashboard with analytics
- [ ] Study session split-screen
- [ ] Question interaction working
- [ ] Chat interface working
- [ ] All features implemented
- [ ] Frontend tests passing

### Week 6: Integration & Testing
- [ ] Full stack integration
- [ ] End-to-end testing
- [ ] Bug fixes
- [ ] Performance optimization

### Week 7: Deployment
- [ ] Vercel projects created
- [ ] CI/CD pipeline working
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Production testing

### Week 8: Polish & Launch
- [ ] Monitoring configured
- [ ] Documentation complete
- [ ] Security audit
- [ ] Final optimizations
- [ ] Launch ready

---

## 14. Risk Management

### 14.1 Technical Risks

**Risk**: OpenAI API rate limits or downtime
- **Mitigation**: Implement caching, graceful degradation, fallback messages
- **Impact**: Medium
- **Probability**: Low

**Risk**: MongoDB performance issues at scale
- **Mitigation**: Proper indexing, query optimization, upgrade cluster if needed
- **Impact**: High
- **Probability**: Low

**Risk**: Vercel serverless function timeouts
- **Mitigation**: Optimize long-running operations, consider streaming responses
- **Impact**: Medium
- **Probability**: Medium

### 14.2 AI Quality Risks

**Risk**: AI generates incorrect or inappropriate content
- **Mitigation**: Validation logic, content filtering, user reporting
- **Impact**: High
- **Probability**: Low

**Risk**: AI tutor not adapting properly to student level
- **Mitigation**: Thorough testing, user feedback, iterative prompt improvement
- **Impact**: Medium
- **Probability**: Medium

### 14.3 Cost Risks

**Risk**: OpenAI API costs exceed budget
- **Mitigation**: Usage limits per user, cost alerts, caching strategy
- **Impact**: High
- **Probability**: Low

---

## 15. Success Criteria

### 15.1 Technical Success
- ✅ All core features functional
- ✅ 95%+ uptime
- ✅ <2s average page load time
- ✅ <3s average AI response time
- ✅ 80%+ test coverage
- ✅ Zero critical security vulnerabilities

### 15.2 User Experience Success
- ✅ Students can complete full study session
- ✅ AI tutor provides helpful, appropriate responses
- ✅ Spaced repetition schedule is accurate
- ✅ Adaptive difficulty adjusts appropriately
- ✅ Interface is intuitive and responsive

### 15.3 Business Success (Post-MVP)
- User retention >50% month-over-month
- Average session length >15 minutes
- Measurable improvement in student accuracy over time
- Positive user feedback (>4/5 rating)

---

## Appendix A: Tech Stack Quick Reference

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | React 18 + TypeScript | UI development |
| Frontend Build | Vite | Fast development and builds |
| Frontend Styling | Tailwind CSS + shadcn/ui | Consistent, beautiful UI |
| Frontend State | Context API + React Query | State management |
| Frontend Forms | React Hook Form + Zod | Form handling and validation |
| Frontend Routing | React Router v6 | Navigation |
| Backend Runtime | Node.js 20 | JavaScript runtime |
| Backend Framework | Express.js | Web framework |
| Backend Language | TypeScript | Type safety |
| Database | MongoDB + Mongoose | Data persistence |
| AI Service | OpenAI GPT-4-mini | Question generation and tutoring |
| Authentication | JWT + bcrypt | Secure authentication |
| Deployment | Vercel | Hosting and serverless |
| CI/CD | GitHub Actions | Automation |
| Package Management | npm workspaces | Monorepo management |
| Testing (Frontend) | Vitest + React Testing Library | Component testing |
| Testing (Backend) | Jest + Supertest | API testing |

---

## Appendix B: File Naming Conventions

- **Components**: PascalCase - `QuestionPanel.tsx`
- **Services**: camelCase - `auth.service.ts`
- **Utilities**: camelCase - `jwt.utils.ts`
- **Types**: PascalCase - `user.types.ts`
- **Constants**: UPPER_SNAKE_CASE - `API_ENDPOINTS.ts`
- **Tests**: Same as source + `.test` - `auth.service.test.ts`

---

## Appendix C: Code Style Guidelines

### TypeScript
```typescript
// Use explicit types for function parameters and returns
function calculateScore(attempts: number, correct: number): number {
  return correct / attempts;
}

// Use interfaces for objects
interface User {
  id: string;
  email: string;
  firstName: string;
}

// Use enums for fixed sets of values
enum Difficulty {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard'
}
```

### React Components
```typescript
// Use functional components with TypeScript
interface QuestionDisplayProps {
  question: Question;
  onAnswer: (answer: string) => void;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  onAnswer
}) => {
  // Component logic
  return (
    // JSX
  );
};
```

### API Routes
```typescript
// RESTful naming
GET    /api/v1/questions         // List
GET    /api/v1/questions/:id     // Get one
POST   /api/v1/questions         // Create
PUT    /api/v1/questions/:id     // Update
DELETE /api/v1/questions/:id     // Delete

// Action routes
POST   /api/v1/questions/generate
GET    /api/v1/questions/next
```

---

## Summary

This comprehensive plan provides a complete roadmap for building the SAT Coach application. The project is structured as a monorepo with three main packages:

1. **Frontend**: React + TypeScript with a modern, responsive UI
2. **DB Backend**: Express API handling data, auth, and business logic
3. **AI Backend**: Express API integrating OpenAI for question generation and tutoring

**Key Features**:
- AI-generated SAT questions with caching
- Adaptive AI tutor that adjusts to student level
- Spaced repetition using SM-2 algorithm
- Comprehensive progress tracking and analytics
- Split-screen study interface
- Full authentication and user management

**Timeline**: 8 weeks to production-ready MVP

**Tech Stack**: React, TypeScript, Node.js, Express, MongoDB, OpenAI, Vercel

**Next Steps**: Begin Phase 1 - Project setup and infrastructure

---

*End of Plan*

