# 🎓 SAT Coach - AI-Powered SAT Preparation Platform

<div align="center">

**An intelligent, adaptive platform to help high school students master the SAT**

![Status](https://img.shields.io/badge/Status-95%25%20Complete-success)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-blue)
![Backend](https://img.shields.io/badge/Backend-Express%20%2B%20MongoDB-green)
![AI](https://img.shields.io/badge/AI-OpenAI%20GPT--4o--mini-orange)
![Tests](https://img.shields.io/badge/Tests-8%2F8%20Passing-brightgreen)

[Quick Start](#-quick-start) • [Features](#-features) • [Documentation](#-documentation) • [Tech Stack](#-tech-stack)

</div>

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation & Run

```bash
# 1. Install All Dependencies
npm install

# 2. Start DB Backend (Terminal 1)
cd packages/db-backend
npm run dev

# 3. Start AI Backend (Terminal 2)
cd packages/ai-backend
npm run dev

# 4. Start Frontend (Terminal 3)
cd packages/frontend
npm run dev

# 5. Open Browser
# Navigate to http://localhost:5173
```

**That's it!** Create an account and start studying with real AI coaching!

---

## ✨ Features

### ✅ Currently Working

**🔐 Authentication**
- Secure user registration and login
- JWT-based authentication
- Role-based access control

**📚 Study Interface**
- Split-screen layout (Question + AI Chat)
- Subject filtering (Math, Reading, Writing)
- Immediate feedback on answers
- Detailed explanations
- Adaptive question selection

**📊 Progress Tracking**
- SM-2 spaced repetition algorithm
- Automatic mastery level calculation
- Performance analytics
- Review schedule generation
- Strengths & weaknesses analysis

**💬 Chat Interface**
- Question-specific chat sessions
- Quick question buttons
- Message history
- Context-aware greetings
- *AI responses coming soon!*

**📈 Dashboard**
- Performance overview
- Subject-wise progress breakdown
- Review schedule (due, overdue, upcoming)
- User level tracking (1-10 scale)

### 🟡 Coming Soon

- Real AI coaching with OpenAI GPT-4o-mini
- AI-generated SAT questions
- Bookmark functionality
- Practice test timer
- Export progress reports
- Performance charts

---

## 📸 Screenshots

### Dashboard
View your performance, track progress, and see what to study next.

### Study Interface
**Left:** SAT question with multiple choice options  
**Right:** AI chat for personalized coaching and hints

### Analytics
Track your accuracy, mastery level, and identify strengths/weaknesses.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  • Login/Signup        • Dashboard                   │
│  • Study Interface     • Analytics                   │
│  • Chat UI            • Progress Tracking           │
└──────────────────┬──────────────────────────────────┘
                   │ API Calls (Axios)
                   │
┌──────────────────▼──────────────────────────────────┐
│              DB Backend (Express)                    │
│  • Authentication      • Question Management         │
│  • Progress Tracking   • Session Management          │
│  • SM-2 Algorithm     • Adaptive Difficulty         │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                MongoDB Database                      │
│  • users           • studentprogresses               │
│  • questions       • studysessions                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│          AI Backend (Coming Soon)                    │
│  • OpenAI Integration   • Question Generation        │
│  • Chat Coaching       • Adaptive Prompts           │
└─────────────────────────────────────────────────────┘
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[START_HERE.md](./START_HERE.md)** | **👈 Begin here!** Quick overview and setup |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Complete testing scenarios and checklist |
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | Detailed project status and metrics |
| [PROJECT_PLAN.md](./PROJECT_PLAN.md) | Original comprehensive project plan |
| [FRONTEND_COMPLETE.md](./FRONTEND_COMPLETE.md) | Frontend implementation details |
| [Backend README](./packages/db-backend/README.md) | Backend API documentation |
| [Frontend README](./packages/frontend/README.md) | Frontend architecture docs |

---

## 🛠️ Tech Stack

### Frontend
- **React 18.3** - UI library
- **TypeScript 5.2** - Type safety
- **Vite 5.3** - Build tool
- **Tailwind CSS 3.4** - Styling
- **React Router 6.26** - Routing
- **TanStack Query 5.56** - Data fetching
- **Axios 1.7** - HTTP client

### Backend
- **Express 4.21** - Web framework
- **TypeScript 5.6** - Type safety
- **MongoDB + Mongoose 8.7** - Database
- **JWT** - Authentication
- **Bcrypt 5.1** - Password hashing

### AI (Integration Ready)
- **OpenAI API** - GPT-4o-mini
- **Prompt Engineering** - Adaptive responses

---

## 📂 Project Structure

```
satcoach/
├── packages/
│   ├── frontend/               # React application
│   │   ├── src/
│   │   │   ├── pages/         # Login, Signup, Dashboard, Study
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── services/      # API integration
│   │   │   ├── contexts/      # React contexts
│   │   │   └── types/         # TypeScript types
│   │   └── package.json
│   │
│   ├── db-backend/            # Express API
│   │   ├── src/
│   │   │   ├── models/       # Mongoose schemas
│   │   │   ├── services/     # Business logic
│   │   │   ├── controllers/  # Request handlers
│   │   │   ├── routes/       # API routes
│   │   │   └── middleware/   # Auth, validation
│   │   └── package.json
│   │
│   └── ai-backend/            # Coming next
│
├── memory-bank/               # Project context
├── docs/                      # Documentation
└── [Root config files]
```

---

## 🧪 Testing

### Run Backend Tests
```bash
cd packages/db-backend

# Test authentication
node test-api.js

# Test questions
node test-questions.js

# Test progress tracking
node test-progress.js
```

### Manual Testing
1. Register a new account
2. Answer 5-10 questions
3. Check dashboard analytics
4. Test chat interface
5. Verify progress tracking

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for complete scenarios.

---

## 🔐 Environment Setup

### Backend (.env)
```bash
MONGODB_URI=mongodb://localhost:27017/satcoach-dev
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
PORT=3001
NODE_ENV=development
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3001/api/v1
```

**Note:** `.env` files are gitignored. Copy from `.env.example` files.

---

## 📊 Current Status

**Overall Progress:** 85% Complete

✅ **Complete:**
- Authentication system
- Question management
- Progress tracking with SM-2
- Session management
- Frontend application
- Dashboard & analytics
- Study interface
- Chat UI

🟡 **In Progress:**
- AI Backend integration

⏳ **Planned:**
- Production deployment
- Additional features (bookmarks, timer)

---

## 🎯 API Endpoints

### Authentication
```
POST   /api/v1/auth/register    # Create account
POST   /api/v1/auth/login       # Login
GET    /api/v1/auth/me          # Get current user
```

### Questions
```
GET    /api/v1/questions        # List questions
GET    /api/v1/questions/next   # Get next question (adaptive)
GET    /api/v1/questions/:id    # Get specific question
POST   /api/v1/questions        # Create question (admin)
```

### Progress
```
POST   /api/v1/progress/attempt    # Record answer attempt
GET    /api/v1/progress/schedule   # Get review schedule
GET    /api/v1/progress/analytics  # Get performance analytics
```

### Sessions
```
POST   /api/v1/sessions/start      # Start study session
PUT    /api/v1/sessions/:id/end    # End session
GET    /api/v1/sessions/history    # Get session history
GET    /api/v1/sessions/active     # Get active session
```

---

## 🤝 Contributing

This is a personal project, but feedback is welcome!

1. Test the application
2. Report bugs or suggest features
3. Review code and provide feedback

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **SM-2 Algorithm** - Piotr Wozniak's spaced repetition research
- **OpenAI** - GPT-4o-mini API
- **React Team** - Amazing framework
- **MongoDB** - Flexible database solution

---

## 📞 Support

**Documentation:**
- Start with [START_HERE.md](./START_HERE.md)
- Follow [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- Check [PROJECT_STATUS.md](./PROJECT_STATUS.md)

**Issues:**
- Check browser console (F12)
- Review backend logs
- Verify MongoDB connection
- See troubleshooting in START_HERE.md

---

## 🚀 Next Steps

1. **For Users:** Start testing! See [START_HERE.md](./START_HERE.md)
2. **For Developers:** Build AI backend (see PROJECT_PLAN.md)
3. **For Deployment:** Set up Vercel + MongoDB Atlas

---

<div align="center">

**Built with ❤️ using React, TypeScript, MongoDB, and Express**

**Model Used:** Claude Sonnet 4.5

[Get Started](./START_HERE.md) • [Report Bug](#) • [Request Feature](#)

</div>

