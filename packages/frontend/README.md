# SAT Coach Frontend

React + TypeScript frontend for the SAT Coach application.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏗️ Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── Layout.tsx
│   ├── ProtectedRoute.tsx
│   ├── QuestionPanel.tsx
│   └── ChatPanel.tsx
├── contexts/          # React contexts
│   └── AuthContext.tsx
├── pages/            # Page components
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   ├── DashboardPage.tsx
│   └── StudyPage.tsx
├── services/         # API services
│   ├── api.ts
│   ├── auth.service.ts
│   ├── question.service.ts
│   ├── progress.service.ts
│   └── session.service.ts
├── types/            # TypeScript types
│   └── index.ts
├── styles/           # Global styles
│   └── index.css
├── App.tsx           # Main app component
└── main.tsx          # Entry point
```

## 🎨 Features

### Authentication
- User registration and login
- JWT token management
- Protected routes
- Automatic token refresh

### Dashboard
- Performance analytics
- Subject-wise progress tracking
- Review schedule
- Strengths and weaknesses analysis

### Study Interface
- Split-screen layout (Question + AI Chat)
- Subject filtering
- Adaptive question selection
- Real-time progress tracking
- Session management

### AI Coach Chat
- Context-aware assistance
- Question-specific guidance
- Quick question suggestions
- Chat history per question

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```bash
VITE_API_URL=http://localhost:3001/api/v1
```

### API Proxy

Vite is configured to proxy `/api` requests to the backend server during development. See `vite.config.ts`.

## 🎨 Styling

This project uses:
- **Tailwind CSS** for utility-first styling
- **Custom components** defined in `src/styles/index.css`
- **Responsive design** that works on all screen sizes

## 📦 Dependencies

### Core
- React 18.3
- TypeScript 5.2
- Vite 5.3

### Routing & State
- React Router 6.26
- TanStack Query 5.56

### HTTP & Forms
- Axios 1.7
- React Hook Form 7.53
- Zod 3.23

### Styling
- Tailwind CSS 3.4
- PostCSS 8.4
- Autoprefixer 10.4

## 🔌 API Integration

All API calls are handled through services in `src/services/`:

- `authService` - User authentication
- `questionService` - Question management
- `progressService` - Progress tracking
- `sessionService` - Study sessions

## 🏃 Development

The development server includes:
- Hot Module Replacement (HMR)
- Fast refresh for React components
- TypeScript type checking
- ESLint for code quality

## 🚀 Production Build

```bash
npm run build
```

The build output will be in the `dist/` directory, ready for deployment to Vercel or any static hosting service.

## 📝 Notes

- The chat feature currently uses placeholder responses. Full AI integration will be added in the next phase.
- Ensure the backend server is running on `http://localhost:3001` for API calls to work.
- All API requests include JWT tokens automatically via Axios interceptors.

