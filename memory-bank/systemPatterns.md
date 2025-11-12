# System Patterns: SAT Coach

## Architecture Overview

### Three-Service Architecture
```
┌─────────────────┐
│   Frontend      │
│  React + TS     │
│  (Vercel)       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───┴───┐ ┌──┴────┐
│  DB   │ │  AI   │
│Backend│ │Backend│
│(API)  │ │(API)  │
└───┬───┘ └──┬────┘
    │        │
┌───┴───┐ ┌──┴─────┐
│MongoDB│ │OpenAI  │
│ Atlas │ │  API   │
└───────┘ └────────┘
```

## Design Patterns

### 1. Backend for Frontend (BFF) Pattern
Each backend service has a specific responsibility:
- **DB Backend**: Data persistence, user management, business logic
- **AI Backend**: OpenAI integration, prompt engineering, AI response handling

### 2. Repository Pattern
Data access is abstracted through repositories:
```typescript
interface IQuestionRepository {
  create(question: Question): Promise<Question>
  findById(id: string): Promise<Question>
  findByFilters(filters: QuestionFilters): Promise<Question[]>
  update(id: string, data: Partial<Question>): Promise<Question>
}
```

### 3. Service Layer Pattern
Business logic separated from controllers:
```typescript
class SpacedRepetitionService {
  calculateNextReview(performance: Performance): Date
  determineQuestionDifficulty(studentLevel: number): DifficultyLevel
  updateLearningCurve(attempt: Attempt): void
}
```

### 4. Middleware Chain Pattern
Request processing pipeline:
```
Request → Authentication → Validation → Rate Limiting → Handler → Response
```

## Component Architecture

### Frontend Component Hierarchy
```
App
├── AuthProvider
│   ├── LoginPage
│   └── SignupPage
├── ProtectedRoute
│   ├── Dashboard
│   │   ├── ProgressOverview
│   │   ├── SubjectBreakdown
│   │   └── UpcomingReviews
│   └── StudySession
│       ├── QuestionPanel
│       │   ├── QuestionDisplay
│       │   ├── QuestionTimer
│       │   └── NavigationControls
│       └── TutorPanel
│           ├── ChatInterface
│           ├── MessageList
│           └── InputArea
```

## Data Flow Patterns

### 1. Question Generation Flow
```
Student requests new question
    ↓
DB Backend checks for existing questions (subject + difficulty)
    ↓
If available → Return from DB
If not → AI Backend generates → Save to DB → Return
```

### 2. Adaptive Learning Flow
```
Student answers question
    ↓
DB Backend records attempt with performance data
    ↓
Spaced Repetition Service calculates next review date
    ↓
Adaptive Service adjusts student difficulty level
    ↓
Update student profile
```

### 3. Chat Interaction Flow
```
Student sends message
    ↓
Frontend → AI Backend with context
    ↓
AI Backend constructs prompt with:
  - Current question
  - Student difficulty level
  - Chat history
  - SAT strategies
    ↓
OpenAI API generates response
    ↓
AI Backend returns formatted response
    ↓
Frontend displays in chat
    ↓
DB Backend saves chat message
```

## Key Technical Decisions

### State Management
- **Frontend**: Context API + React Query for server state
- **Why**: Avoids Redux complexity while maintaining efficient data fetching

### Authentication
- **Strategy**: JWT tokens with HTTP-only cookies
- **Why**: Secure, stateless, works well with Vercel deployment

### Database Schema Design
- **Approach**: Embedded documents for related data, references for loosely coupled
- **Why**: Optimizes for read-heavy operations (viewing questions, progress)

### API Design
- **Style**: RESTful with clear resource naming
- **Versioning**: URL-based (/api/v1/)
- **Why**: Standard, predictable, easy to document

### Error Handling
- **Pattern**: Global error boundaries + API error interceptors
- **Why**: Consistent error experience, centralized logging

## Scalability Patterns

### Caching Strategy
1. **Question Cache**: Store generated questions in MongoDB
2. **Response Cache**: Cache common AI responses for frequently missed questions
3. **Client Cache**: React Query for frontend caching

### Rate Limiting
- Per-user limits on AI requests
- Prevents API cost explosion
- Graceful degradation when limits reached

### Database Indexing
- Index on: userId, subject, difficulty, nextReviewDate
- Compound indexes for common query patterns
- Ensures fast query performance at scale

## Security Patterns

### Authentication Flow
```
Login → JWT issued → Stored in HTTP-only cookie → Sent with requests → Verified by middleware
```

### API Key Management
- Environment variables for all secrets
- Separate keys for development/production
- OpenAI key only accessible to AI Backend

### Data Validation
- Frontend: React Hook Form with Zod
- Backend: Express Validator
- Database: Mongoose schemas
- Why: Defense in depth

## Monitoring & Observability

### Logging Strategy
- Structured JSON logs
- Different levels: info, warn, error
- Track: API calls, AI requests, user actions, errors

### Metrics to Track
- AI API usage and costs
- Question generation success rate
- User engagement metrics
- System performance (response times)
- Error rates

## Development Patterns

### Monorepo Structure
```
satcoach/
├── packages/
│   ├── frontend/
│   ├── db-backend/
│   ├── ai-backend/
│   └── shared/          # Shared types, utils
├── .github/
│   └── workflows/       # CI/CD
└── package.json         # Workspace root
```

### Shared TypeScript Types
- Define once, use everywhere
- Ensures type safety across services
- Reduces duplication and errors

### Testing Strategy
- Unit tests: Individual functions and components
- Integration tests: API endpoints
- E2E tests: Critical user flows
- AI tests: Validate prompt quality and responses

