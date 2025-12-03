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

// Graph types for visual representations
export type GraphType =
  | 'line'
  | 'bar'
  | 'scatter'
  | 'histogram'
  | 'pie'
  | 'area'
  | 'composed'
  | 'fraction-rectangle'
  | 'polygon';

export interface GraphRectangleConfig {
  rows: number;
  cols: number;
  shadedCells: number[]; // zero-based index, row-major
  shadedColor?: string;
  emptyColor?: string;
  outlineColor?: string;
  caption?: string;
}

export interface GraphLabelOffset {
  x?: number;
  y?: number;
}

export interface GraphPolygonPoint {
  label?: string;
  x: number;
  y: number;
  labelOffset?: GraphLabelOffset;
}

export interface GraphAngleLabel {
  text: string;
  x?: number;
  y?: number;
  align?: 'start' | 'middle' | 'end';
  offset?: GraphLabelOffset;
  atVertex?: string;
  radialOffset?: number;
  bisectorOffset?: number;
}

export interface GraphSideLabel {
  text: string;
  x?: number;
  y?: number;
  align?: 'start' | 'middle' | 'end';
  offset?: GraphLabelOffset;
  onSide?: [string, string];
  position?: number;
  preferInside?: boolean;
  insideOffset?: number;
}

export interface GraphPolygonLine {
  from: number;
  to: number;
  dashed?: boolean;
}

export interface GraphPolygonConfig {
  points: GraphPolygonPoint[];
  extraLines?: GraphPolygonLine[];
  angleLabels?: GraphAngleLabel[];
  sideLabels?: GraphSideLabel[];
  pointLabelOffset?: GraphLabelOffset;
  strokeColor?: string;
  fillColor?: string;
  width?: number;
  height?: number;
}

export interface GraphData {
  type: GraphType;
  data?: Array<Record<string, number | string>>;
  config?: {
    title?: string;
    xLabel?: string;
    yLabel?: string;
    xDomain?: [number, number];
    yDomain?: [number, number];
    width?: number;
    height?: number;
    showGrid?: boolean;
    showLegend?: boolean;
    dataKeys?: string[]; // For multiple data series
    rectangleConfig?: GraphRectangleConfig;
    polygonConfig?: GraphPolygonConfig;
  };
}

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
    graph?: GraphData; // NEW: Optional graph data
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

