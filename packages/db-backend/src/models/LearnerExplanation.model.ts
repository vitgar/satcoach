import mongoose, { Schema, Document } from 'mongoose';

/**
 * Stores Feynman-style explanations from learners for AI evaluation
 * This tracks how well students can explain concepts in their own words
 */

export interface ExplanationEvaluation {
  clarity: number; // 0-100
  completeness: number; // 0-100
  accuracy: number; // 0-100
  jargonCount: number;
  jargonTerms: string[];
  misconceptions: string[];
  strengths: string[];
  gaps: string[];
  feedback: string;
  suggestedRefinements: string[];
  bloomLevel: number; // 1-6, which level demonstrated
}

export interface ILearnerExplanation extends Document {
  userId: mongoose.Types.ObjectId;
  conceptId?: mongoose.Types.ObjectId;
  questionId?: mongoose.Types.ObjectId;
  topic: string; // Fallback if no conceptId
  
  // Explanation Content
  explanation: string;
  audioTranscript?: string;
  
  // AI Evaluation
  evaluation: ExplanationEvaluation;
  
  // Iteration Tracking
  iteration: number; // 1st, 2nd, 3rd explanation
  isRefinement: boolean;
  previousExplanationId?: mongoose.Types.ObjectId;
  
  // Metadata
  timeSpent: number; // seconds
  hintsUsed: number;
  chatInteractions: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const ExplanationEvaluationSchema = new Schema<ExplanationEvaluation>({
  clarity: { type: Number, default: 0, min: 0, max: 100 },
  completeness: { type: Number, default: 0, min: 0, max: 100 },
  accuracy: { type: Number, default: 0, min: 0, max: 100 },
  jargonCount: { type: Number, default: 0, min: 0 },
  jargonTerms: [{ type: String }],
  misconceptions: [{ type: String }],
  strengths: [{ type: String }],
  gaps: [{ type: String }],
  feedback: { type: String, default: '' },
  suggestedRefinements: [{ type: String }],
  bloomLevel: { type: Number, default: 1, min: 1, max: 6 },
}, { _id: false });

const LearnerExplanationSchema = new Schema<ILearnerExplanation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conceptId: {
      type: Schema.Types.ObjectId,
      ref: 'Concept',
      index: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      index: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    
    explanation: {
      type: String,
      required: [true, 'Explanation is required'],
      trim: true,
    },
    audioTranscript: {
      type: String,
      trim: true,
    },
    
    evaluation: {
      type: ExplanationEvaluationSchema,
      default: () => ({
        clarity: 0,
        completeness: 0,
        accuracy: 0,
        jargonCount: 0,
        jargonTerms: [],
        misconceptions: [],
        strengths: [],
        gaps: [],
        feedback: '',
        suggestedRefinements: [],
        bloomLevel: 1,
      }),
    },
    
    iteration: {
      type: Number,
      default: 1,
      min: 1,
    },
    isRefinement: {
      type: Boolean,
      default: false,
    },
    previousExplanationId: {
      type: Schema.Types.ObjectId,
      ref: 'LearnerExplanation',
    },
    
    timeSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    hintsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    chatInteractions: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
LearnerExplanationSchema.index({ userId: 1, topic: 1 });
LearnerExplanationSchema.index({ userId: 1, conceptId: 1 });
LearnerExplanationSchema.index({ userId: 1, createdAt: -1 });
LearnerExplanationSchema.index({ 'evaluation.clarity': 1 });
LearnerExplanationSchema.index({ 'evaluation.bloomLevel': 1 });

export const LearnerExplanation = mongoose.model<ILearnerExplanation>(
  'LearnerExplanation',
  LearnerExplanationSchema
);

