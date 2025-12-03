import mongoose, { Schema, Document } from 'mongoose';

export type Subject = 'math' | 'reading' | 'writing';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GeneratedBy = 'ai' | 'manual';

// Graph types for visual representations
export type GraphType = 'line' | 'bar' | 'scatter' | 'histogram' | 'pie' | 'area' | 'composed';

export interface GraphData {
  type: GraphType;
  data: Array<Record<string, number | string>>;
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
    dataKeys?: string[];
  };
}

/**
 * Bloom's Taxonomy Level:
 * 1 = Remember - Recall facts, definitions
 * 2 = Understand - Explain concepts, interpret
 * 3 = Apply - Use in new situations, solve problems
 * 4 = Analyze - Break down, compare, contrast
 * 5 = Evaluate - Judge, critique, justify
 * 6 = Create - Design, construct, produce
 */
export interface BloomLevel {
  primary: number; // 1-6 (primary Bloom level)
  secondary?: number[]; // Additional levels tested
  description: string; // What this question tests
}

export interface FeynmanPrompts {
  explanationPrompt: string; // "Explain how to solve this..."
  analogyPrompt?: string; // "Create an analogy for..."
  teachingPrompt?: string; // "Teach a peer how to..."
}

export interface FlowMetrics {
  expectedChallenge: number; // 1-10
  expectedTime: number; // seconds (for automatic confidence calculation)
  typicalHintsNeeded: number;
}

export interface IQuestion extends Document {
  subject: Subject;
  difficulty: Difficulty;
  difficultyScore: number;
  content: {
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    graph?: GraphData;
  };
  metadata: {
    generatedBy: GeneratedBy;
    generatedAt: Date;
    timesUsed: number;
    averageAccuracy: number;
    averageTimeSpent: number;
  };
  tags: string[];
  
  // NEW: Bloom Taxonomy Level
  bloomLevel: BloomLevel;
  
  // NEW: Feynman Prompts
  feynmanPrompts?: FeynmanPrompts;
  
  // NEW: Flow Metrics
  flowMetrics: FlowMetrics;
  
  // NEW: Concept reference
  conceptId?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
  incrementUsage: () => Promise<IQuestion>;
  updateStatistics: (isCorrect: boolean, timeSpent: number) => Promise<IQuestion>;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      enum: ['math', 'reading', 'writing'],
      index: true,
    },
    difficulty: {
      type: String,
      required: [true, 'Difficulty is required'],
      enum: ['easy', 'medium', 'hard'],
      index: true,
    },
    difficultyScore: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      default: function() {
        // Map difficulty to score: easy=3, medium=6, hard=9
        const scoreMap = { easy: 3, medium: 6, hard: 9 };
        return scoreMap[this.difficulty as Difficulty] || 5;
      },
    },
    content: {
      questionText: {
        type: String,
        required: [true, 'Question text is required'],
        trim: true,
      },
      options: {
        type: [String],
        required: [true, 'Options are required'],
        validate: {
          validator: (v: string[]) => v.length === 4,
          message: 'Must provide exactly 4 options',
        },
      },
      correctAnswer: {
        type: String,
        required: [true, 'Correct answer is required'],
        enum: ['A', 'B', 'C', 'D'],
      },
      explanation: {
        type: String,
        required: [true, 'Explanation is required'],
        trim: true,
      },
      graph: {
        type: {
          type: String,
          enum: ['line', 'bar', 'scatter', 'histogram', 'pie', 'area', 'composed'],
        },
        data: Schema.Types.Mixed,
        config: Schema.Types.Mixed,
      },
    },
    metadata: {
      generatedBy: {
        type: String,
        enum: ['ai', 'manual'],
        default: 'manual',
      },
      generatedAt: {
        type: Date,
        default: Date.now,
      },
      timesUsed: {
        type: Number,
        default: 0,
        min: 0,
      },
      averageAccuracy: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
      },
      averageTimeSpent: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    
    // NEW: Bloom Taxonomy Level
    bloomLevel: {
      primary: {
        type: Number,
        min: 1,
        max: 6,
        default: 3, // Default to Apply level
        index: true,
      },
      secondary: [{
        type: Number,
        min: 1,
        max: 6,
      }],
      description: {
        type: String,
        default: '',
      },
    },
    
    // NEW: Feynman Prompts
    feynmanPrompts: {
      explanationPrompt: { type: String },
      analogyPrompt: { type: String },
      teachingPrompt: { type: String },
    },
    
    // NEW: Flow Metrics
    flowMetrics: {
      expectedChallenge: {
        type: Number,
        min: 1,
        max: 10,
        default: function() {
          // Map difficulty to expected challenge
          const challengeMap = { easy: 3, medium: 6, hard: 9 };
          return challengeMap[this.difficulty as Difficulty] || 5;
        },
      },
      expectedTime: {
        type: Number,
        default: 90, // 90 seconds default
        min: 0,
      },
      typicalHintsNeeded: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    
    // NEW: Concept reference
    conceptId: {
      type: Schema.Types.ObjectId,
      ref: 'Concept',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
QuestionSchema.index({ subject: 1, difficulty: 1 });
QuestionSchema.index({ subject: 1, difficulty: 1, 'metadata.timesUsed': 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ 'metadata.timesUsed': 1 });
QuestionSchema.index({ subject: 1, 'bloomLevel.primary': 1 }); // NEW: For Bloom-level queries
QuestionSchema.index({ subject: 1, difficulty: 1, 'bloomLevel.primary': 1 }); // NEW: Combined query

// Instance method to increment usage
QuestionSchema.methods.incrementUsage = async function (this: IQuestion) {
  this.metadata.timesUsed += 1;
  return this.save();
};

// Instance method to update statistics
QuestionSchema.methods.updateStatistics = async function (
  this: IQuestion,
  isCorrect: boolean,
  timeSpent: number
) {
  const timesUsed = this.metadata.timesUsed;
  
  // Update average accuracy
  const currentAccuracy = this.metadata.averageAccuracy;
  const newAccuracy = (currentAccuracy * timesUsed + (isCorrect ? 1 : 0)) / (timesUsed + 1);
  this.metadata.averageAccuracy = newAccuracy;
  
  // Update average time spent
  const currentTime = this.metadata.averageTimeSpent;
  const newTime = (currentTime * timesUsed + timeSpent) / (timesUsed + 1);
  this.metadata.averageTimeSpent = newTime;
  
  // Update flow metrics based on actual performance
  if (this.flowMetrics) {
    this.flowMetrics.expectedTime = Math.round(
      (this.flowMetrics.expectedTime * 0.9) + (timeSpent * 0.1)
    );
  }
  
  return this.save();
};

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);
