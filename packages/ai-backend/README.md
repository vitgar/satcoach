# SAT Coach AI Backend

OpenAI-powered AI coaching and question generation for SAT preparation.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Question Generation

**Generate Single Question**
```
POST /api/v1/questions/generate

Body:
{
  "subject": "math" | "reading" | "writing",
  "difficulty": "easy" | "medium" | "hard",
  "topic": "optional topic string"
}

Response:
{
  "message": "Question generated successfully",
  "question": {
    "subject": "math",
    "difficulty": "medium",
    "difficultyScore": 6,
    "content": {
      "questionText": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "B",
      "explanation": "..."
    },
    "tags": ["algebra", "equations"]
  }
}
```

**Generate Multiple Questions**
```
POST /api/v1/questions/generate-batch

Body:
{
  "subject": "math",
  "difficulty": "medium",
  "count": 5,
  "topic": "optional"
}
```

### AI Coaching

**Get Coaching Response**
```
POST /api/v1/chat/coach

Body:
{
  "userMessage": "How do I approach this problem?",
  "questionContext": {
    "questionText": "...",
    "subject": "math",
    "difficulty": "medium",
    "correctAnswer": "B",
    "explanation": "...",
    "tags": ["algebra"]
  },
  "studentContext": {
    "level": 7,
    "accuracyRate": 0.75,
    "recentPerformance": "excelling"
  },
  "chatHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}

Response:
{
  "message": "Coaching response generated",
  "response": "AI coaching response here...",
  "timestamp": "2024-11-11T..."
}
```

**Get Hint**
```
POST /api/v1/chat/hint

Body:
{
  "questionContext": { ... },
  "studentContext": { ... }
}

Response:
{
  "message": "Hint generated",
  "hint": "Try looking at the relationship between..."
}
```

**Get Explanation**
```
POST /api/v1/chat/explain

Body:
{
  "questionContext": { ... },
  "studentContext": { ... }
}

Response:
{
  "message": "Explanation generated",
  "explanation": "Step-by-step explanation..."
}
```

**Clarify Concept**
```
POST /api/v1/chat/clarify

Body:
{
  "concept": "quadratic equations",
  "subject": "math",
  "studentContext": { ... }
}

Response:
{
  "message": "Concept clarified",
  "clarification": "Quadratic equations are..."
}
```

## 🧠 AI Features

### Adaptive Coaching
The AI adapts its teaching style based on student level (1-10):
- **Beginner (1-3)**: Simple language, step-by-step, lots of examples
- **Intermediate (4-7)**: Standard explanations with strategic insights
- **Advanced (8-10)**: Concise, sophisticated, advanced strategies

### SAT Expertise
Built-in knowledge of:
- SAT Math (Algebra, Problem Solving, Advanced Math, Geometry, Trigonometry)
- SAT Reading (Close reading, evidence-based answers, vocabulary, inference)
- SAT Writing (Grammar, sentence structure, punctuation, rhetoric)
- Test-taking strategies and time management

### Context-Aware Responses
The AI considers:
- Current question details
- Student performance history
- Chat conversation history
- Student's learning level
- Question difficulty and subject

## 🔧 Configuration

### Environment Variables
```bash
# Required
OPENAI_API_KEY=your-api-key-here

# Optional
NODE_ENV=development
PORT=3002
OPENAI_MODEL=gpt-4o-mini
MAX_TOKENS=1000
TEMPERATURE=0.7
CORS_ORIGIN=http://localhost:5173
```

### OpenAI Settings
- **Model**: gpt-4o-mini (fast, cost-effective)
- **Temperature**: 0.7 (balanced creativity)
- **Max Tokens**: 1000 (concise responses)

## 📁 Project Structure

```
src/
├── config/
│   └── environment.ts       # Environment configuration
├── controllers/
│   ├── question.controller.ts  # Question generation endpoints
│   └── chat.controller.ts      # Chat coaching endpoints
├── services/
│   ├── openai.service.ts       # OpenAI client wrapper
│   ├── question-generator.service.ts  # Question generation logic
│   └── chat-coach.service.ts   # Coaching logic
├── prompts/
│   └── system-prompts.ts       # AI system prompts
├── routes/
│   ├── question.routes.ts      # Question routes
│   └── chat.routes.ts          # Chat routes
├── middleware/
│   └── errorHandler.middleware.ts  # Error handling
└── index.ts                    # Server entry point
```

## 🧪 Testing

### Test Question Generation
```bash
curl -X POST http://localhost:3002/api/v1/questions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "math",
    "difficulty": "medium",
    "topic": "algebra"
  }'
```

### Test Coaching
```bash
curl -X POST http://localhost:3002/api/v1/chat/coach \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "How do I solve this?",
    "questionContext": {
      "questionText": "What is 2+2?",
      "subject": "math",
      "difficulty": "easy",
      "correctAnswer": "4",
      "explanation": "Add the numbers"
    },
    "studentContext": {
      "level": 5
    }
  }'
```

## 🔐 Security

- API key stored in `.env` (gitignored)
- CORS configured for frontend origin
- Helmet.js for HTTP security headers
- Input validation on all endpoints
- Error messages don't expose sensitive data

## 📊 Monitoring

The service logs:
- All API requests (in development)
- OpenAI API errors
- Question generation attempts
- Chat coaching requests

## 🚀 Deployment

### Vercel
1. Set environment variables in Vercel dashboard
2. Deploy from Git repository
3. Vercel automatically detects Express app

### Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## 📝 Notes

- Keep OpenAI API key secure
- Monitor token usage for cost control
- Adjust temperature for different response styles
- Use batch generation for efficiency
- Cache common questions to reduce API calls

## 🔗 Integration

This backend integrates with:
- **DB Backend** (port 3001): Question storage, user data
- **Frontend** (port 5173): Chat interface, question display

## 📚 Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [SAT Test Format](https://collegereadiness.collegeboard.org/sat)
- [Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)

---

**Model Used:** OpenAI GPT-4o-mini  
**Port:** 3002  
**Status:** Production Ready

