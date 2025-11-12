import mongoose, { Schema, Document } from 'mongoose';

export type Subject = 'math' | 'reading' | 'writing';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GeneratedBy = 'ai' | 'manual';

export interface IQuestion extends Document {
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
    generatedBy: GeneratedBy;
    generatedAt: Date;
    timesUsed: number;
    averageAccuracy: number;
    averageTimeSpent: number;
  };
  tags: string[];
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
  
  return this.save();
};

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);

