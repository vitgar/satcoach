import mongoose, { Schema, Document } from 'mongoose';

/**
 * Bloom's Taxonomy Levels:
 * 1 = Remember - Recall facts, definitions
 * 2 = Understand - Explain concepts, interpret
 * 3 = Apply - Use in new situations, solve problems
 * 4 = Analyze - Break down, compare, contrast
 * 5 = Evaluate - Judge, critique, justify
 * 6 = Create - Design, construct, produce
 */
export const BLOOM_LEVELS = {
  REMEMBER: 1,
  UNDERSTAND: 2,
  APPLY: 3,
  ANALYZE: 4,
  EVALUATE: 5,
  CREATE: 6,
} as const;

export const BLOOM_LEVEL_NAMES: Record<number, string> = {
  1: 'remember',
  2: 'understand',
  3: 'apply',
  4: 'analyze',
  5: 'evaluate',
  6: 'create',
};

export interface BloomLevelInfo {
  description: string;
  exampleQuestions: mongoose.Types.ObjectId[];
  masteredThreshold: number; // 0-100, default 80
}

export interface ConceptExplanation {
  level: number; // 1-10 complexity
  text: string;
  visuals?: string[]; // Image URLs
  analogies?: string[];
}

export interface CommonMisconception {
  misconception: string;
  correction: string;
}

export interface IConcept extends Document {
  name: string;
  subject: 'math' | 'reading' | 'writing';
  parentConcept?: mongoose.Types.ObjectId;
  tags: string[];
  
  // Bloom Taxonomy Mapping
  bloomLevels: {
    remember: BloomLevelInfo;
    understand: BloomLevelInfo;
    apply: BloomLevelInfo;
    analyze: BloomLevelInfo;
    evaluate: BloomLevelInfo;
    create: BloomLevelInfo;
  };
  
  // Content Resources
  content: {
    explanations: ConceptExplanation[];
    realWorldApplications: string[];
    commonMisconceptions: CommonMisconception[];
  };
  
  // Relationships
  prerequisiteConcepts: mongoose.Types.ObjectId[];
  relatedConcepts: mongoose.Types.ObjectId[];
  
  createdAt: Date;
  updatedAt: Date;
}

const BloomLevelInfoSchema = new Schema<BloomLevelInfo>({
  description: {
    type: String,
    required: true,
    default: '',
  },
  exampleQuestions: [{
    type: Schema.Types.ObjectId,
    ref: 'Question',
  }],
  masteredThreshold: {
    type: Number,
    default: 80,
    min: 0,
    max: 100,
  },
}, { _id: false });

const ConceptSchema = new Schema<IConcept>(
  {
    name: {
      type: String,
      required: [true, 'Concept name is required'],
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      enum: ['math', 'reading', 'writing'],
      index: true,
    },
    parentConcept: {
      type: Schema.Types.ObjectId,
      ref: 'Concept',
    },
    tags: [{
      type: String,
      trim: true,
    }],
    
    bloomLevels: {
      remember: {
        type: BloomLevelInfoSchema,
        default: () => ({ description: 'Recall basic facts and definitions', exampleQuestions: [], masteredThreshold: 80 }),
      },
      understand: {
        type: BloomLevelInfoSchema,
        default: () => ({ description: 'Explain concepts and interpret meaning', exampleQuestions: [], masteredThreshold: 80 }),
      },
      apply: {
        type: BloomLevelInfoSchema,
        default: () => ({ description: 'Solve problems in new situations', exampleQuestions: [], masteredThreshold: 80 }),
      },
      analyze: {
        type: BloomLevelInfoSchema,
        default: () => ({ description: 'Break down and compare concepts', exampleQuestions: [], masteredThreshold: 80 }),
      },
      evaluate: {
        type: BloomLevelInfoSchema,
        default: () => ({ description: 'Judge and critique approaches', exampleQuestions: [], masteredThreshold: 80 }),
      },
      create: {
        type: BloomLevelInfoSchema,
        default: () => ({ description: 'Design and produce new solutions', exampleQuestions: [], masteredThreshold: 80 }),
      },
    },
    
    content: {
      explanations: [{
        level: { type: Number, min: 1, max: 10 },
        text: { type: String },
        visuals: [{ type: String }],
        analogies: [{ type: String }],
      }],
      realWorldApplications: [{ type: String }],
      commonMisconceptions: [{
        misconception: { type: String },
        correction: { type: String },
      }],
    },
    
    prerequisiteConcepts: [{
      type: Schema.Types.ObjectId,
      ref: 'Concept',
    }],
    relatedConcepts: [{
      type: Schema.Types.ObjectId,
      ref: 'Concept',
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
ConceptSchema.index({ subject: 1, name: 1 }, { unique: true });
ConceptSchema.index({ tags: 1 });
ConceptSchema.index({ prerequisiteConcepts: 1 });

export const Concept = mongoose.model<IConcept>('Concept', ConceptSchema);

