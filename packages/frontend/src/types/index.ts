// User types
export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'admin';
  learningProfile: {
    currentLevel: number;
    preferredDifficulty: 'easy' | 'medium' | 'hard';
    adaptiveSettings: {
      autoAdjust: boolean;
      adjustmentSpeed: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}

// Question types
export type Subject = 'math' | 'reading' | 'writing';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  _id: string;
  subject: Subject;
  difficulty: Difficulty;
  difficultyScore: number;
  content: {
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  };
  metadata: {
    generatedBy: 'ai' | 'manual';
    generatedAt: string;
    timesUsed: number;
    averageAccuracy: number;
    averageTimeSpent: number;
  };
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Progress types
export interface QuestionAttempt {
  questionId: string;
  attemptDate: string;
  isCorrect: boolean;
  timeSpent: number;
  hintsUsed: number;
  confidence: number;
  chatInteractions: number;
}

export interface Performance {
  totalAttempts: number;
  correctAttempts: number;
  accuracyRate: number;
  averageTime: number;
  lastAttemptDate: string;
  nextReviewDate: string;
  masteryLevel: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
}

export interface StudentProgress {
  _id: string;
  userId: string;
  subject: string;
  topic: string;
  attempts: QuestionAttempt[];
  performance: Performance;
  createdAt: string;
  updatedAt: string;
}

// Session types
export interface StudySession {
  _id: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  questionsAttempted: string[];
  questionsCorrect: string[];
  totalTimeSpent: number;
  subjects: string[];
  averageConfidence: number;
  timerUsed: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  error: string;
  stack?: string;
}

// Analytics types
export interface Analytics {
  overall: {
    totalAttempts: number;
    averageAccuracy: number;
    averageMastery: number;
  };
  bySubject: Record<string, {
    accuracy: number;
    averageMastery: number;
    attempts: number;
  }>;
  strengths: string[];
  weaknesses: string[];
  reviewSchedule: {
    dueNow: number;
    overdue: number;
    upcoming: number;
  };
}

export interface ReviewSchedule {
  dueNow: ReviewItem[];
  overdue: ReviewItem[];
  upcoming: ReviewItem[];
}

export interface ReviewItem {
  subject: string;
  topic: string;
  nextReviewDate: string;
  masteryLevel: number;
  totalAttempts: number;
  accuracyRate: number;
  priority: number;
  daysUntil: number;
}

