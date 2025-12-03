/**
 * Smart Question Selector Service
 * 
 * Intelligently selects questions with repeat logic:
 * - Prefer unseen questions
 * - Allow repeats after MIN_DAYS_BEFORE_REPEAT (default: 30 days)
 * - Prioritize questions for spaced repetition review
 * - Never repeat back-to-back
 */

import mongoose from 'mongoose';
import { Question, Subject, Difficulty } from '../models/Question.model';
import { UserQuestion, MIN_DAYS_BEFORE_REPEAT } from '../models/UserQuestion.model';
import { StudentProgress } from '../models/StudentProgress.model';
import { flowEngineService } from './flowEngine.service';

export interface QuestionSelectionCriteria {
  userId: mongoose.Types.ObjectId;
  subject?: Subject;
  topic?: string;
  bloomLevel?: number;
  difficulty?: Difficulty;
  excludeQuestionIds?: mongoose.Types.ObjectId[];
  forReview?: boolean;
  limit?: number;
}

export interface SelectedQuestion {
  question: any; // Question document
  selectionReason: string;
  isRepeat: boolean;
  isReview: boolean;
  recommendedBloomLevel: number;
}

export class QuestionSelectorService {
  /**
   * Get next question(s) for a user with smart selection logic
   */
  async getNextQuestionForUser(
    criteria: QuestionSelectionCriteria
  ): Promise<SelectedQuestion | null> {
    const {
      userId,
      subject,
      topic,
      bloomLevel = 3,
      difficulty,
      excludeQuestionIds = [],
      forReview = false,
      limit = 1,
    } = criteria;

    // 1. Get recently seen questions (< 30 days) - exclude these
    const recentlySeenIds = await this.getRecentlySeenQuestionIds(userId);
    const allExcluded = [...excludeQuestionIds, ...recentlySeenIds];

    // 2. Check if this is a review session
    if (forReview) {
      const reviewQuestions = await this.getReviewQuestions(userId, subject);
      if (reviewQuestions.length > 0) {
        const question = reviewQuestions[0];
        return {
          question,
          selectionReason: 'Spaced repetition review due',
          isRepeat: true,
          isReview: true,
          recommendedBloomLevel: bloomLevel,
        };
      }
    }

    // 3. Try to find unseen questions first
    const unseenQuestions = await this.findUnseenQuestions(
      userId,
      subject,
      topic,
      bloomLevel,
      difficulty,
      allExcluded,
      limit
    );

    if (unseenQuestions.length > 0) {
      const question = unseenQuestions[0];
      return {
        question,
        selectionReason: 'New question for this topic',
        isRepeat: false,
        isReview: false,
        recommendedBloomLevel: question.bloomLevel?.primary || bloomLevel,
      };
    }

    // 4. If no unseen questions, find repeatable questions (seen > 30 days ago)
    const repeatableQuestions = await this.getRepeatableQuestions(
      userId,
      subject,
      topic,
      bloomLevel,
      difficulty,
      excludeQuestionIds,
      limit
    );

    if (repeatableQuestions.length > 0) {
      const question = repeatableQuestions[0];
      return {
        question,
        selectionReason: 'Reviewing question from earlier study',
        isRepeat: true,
        isReview: false,
        recommendedBloomLevel: Math.min(6, (question.bloomLevel?.primary || bloomLevel) + 1),
      };
    }

    // 5. LAST RESORT: All questions seen recently - use spaced repetition to pick oldest/weakest
    // This ensures students always have something to practice
    const fallbackQuestion = await this.getFallbackQuestion(
      userId,
      subject,
      topic,
      bloomLevel,
      excludeQuestionIds
    );

    if (fallbackQuestion) {
      return fallbackQuestion;
    }

    // 6. No questions available at all for this subject
    return null;
  }

  /**
   * LAST RESORT: Get a question when all have been seen recently
   * Prioritizes by spaced repetition principles:
   * 1. Questions with lowest mastery/accuracy
   * 2. Questions seen longest ago
   * 3. Questions answered incorrectly
   */
  async getFallbackQuestion(
    userId: mongoose.Types.ObjectId,
    subject?: Subject,
    topic?: string,
    bloomLevel?: number,
    excludeIds: mongoose.Types.ObjectId[] = []
  ): Promise<SelectedQuestion | null> {
    // Get all user's question history for this subject, sorted by spaced repetition priority
    const userQuestions = await UserQuestion.find({
      userId,
      questionId: { $nin: excludeIds },
    })
      .sort({
        // Priority order:
        // 1. Incorrect answers first (need more practice)
        isCorrect: 1,
        // 2. Lower confidence = needs review
        calculatedConfidence: 1,
        // 3. Oldest seen first (natural spacing)
        shownAt: 1,
        // 4. Fewer times seen
        timesSeen: 1,
      })
      .limit(20)
      .lean();

    if (userQuestions.length === 0) {
      return null;
    }

    // Get the actual questions
    const questionIds = userQuestions.map(uq => uq.questionId);
    
    // Build query with subject filter
    const query: any = {
      _id: { $in: questionIds },
    };
    
    if (subject) {
      query.subject = subject;
    }
    if (topic) {
      query.tags = { $in: [topic] };
    }

    const questions = await Question.find(query).lean();

    if (questions.length === 0) {
      return null;
    }

    // Sort questions by the same priority as userQuestions
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));
    const sortedQuestions = userQuestions
      .map(uq => questionMap.get(uq.questionId.toString()))
      .filter(q => q !== undefined);

    if (sortedQuestions.length === 0) {
      return null;
    }

    const question = sortedQuestions[0];
    const userQuestionData = userQuestions.find(
      uq => uq.questionId.toString() === question._id.toString()
    );

    // Determine the reason based on why this question was selected
    let reason = 'Reinforcing previous learning';
    if (userQuestionData && !userQuestionData.isCorrect) {
      reason = 'Practicing a challenging concept';
    } else if (userQuestionData && (userQuestionData.calculatedConfidence || 0) < 0.5) {
      reason = 'Building confidence on this topic';
    }

    // For repeated questions, potentially increase Bloom level for deeper understanding
    const currentBloom = question.bloomLevel?.primary || bloomLevel || 3;
    const recommendedBloom = userQuestionData?.isCorrect 
      ? Math.min(6, currentBloom + 1) // If correct before, try higher level thinking
      : currentBloom; // If incorrect, stay at same level

    return {
      question,
      selectionReason: reason,
      isRepeat: true,
      isReview: true,
      recommendedBloomLevel: recommendedBloom,
    };
  }

  /**
   * Get question IDs seen in the last MIN_DAYS_BEFORE_REPEAT days
   */
  async getRecentlySeenQuestionIds(
    userId: mongoose.Types.ObjectId
  ): Promise<mongoose.Types.ObjectId[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MIN_DAYS_BEFORE_REPEAT);

    const recentQuestions = await UserQuestion.find({
      userId,
      shownAt: { $gte: cutoffDate },
    }).select('questionId');

    return recentQuestions.map(uq => uq.questionId);
  }

  /**
   * Find unseen questions matching criteria
   */
  async findUnseenQuestions(
    userId: mongoose.Types.ObjectId,
    subject?: Subject,
    topic?: string,
    bloomLevel?: number,
    difficulty?: Difficulty,
    excludeIds: mongoose.Types.ObjectId[] = [],
    limit: number = 5
  ): Promise<any[]> {
    // Get all questions the user has seen
    const seenQuestionIds = await UserQuestion.find({
      userId,
    }).select('questionId').lean();

    const seenIds = seenQuestionIds.map(uq => uq.questionId);
    const allExcluded = [...excludeIds, ...seenIds];

    // Build query
    const query: any = {
      _id: { $nin: allExcluded },
    };

    if (subject) {
      query.subject = subject;
    }
    if (topic) {
      // tags is an array, so use $in to match if topic is in the array
      query.tags = { $in: [topic] };
    }
    // Only filter by bloomLevel if specified AND if we want strict matching
    // For now, make it optional to allow questions without bloomLevel
    // if (bloomLevel) {
    //   query['bloomLevel.primary'] = bloomLevel;
    // }
    if (difficulty) {
      query.difficulty = difficulty;
    }

    return Question.find(query)
      .limit(limit)
      .sort({ 'metadata.timesUsed': 1 }) // Prefer less-used questions
      .exec();
  }

  /**
   * Get questions eligible for repeat (seen > 30 days ago)
   */
  async getRepeatableQuestions(
    userId: mongoose.Types.ObjectId,
    subject?: Subject,
    topic?: string,
    bloomLevel?: number,
    difficulty?: Difficulty,
    excludeIds: mongoose.Types.ObjectId[] = [],
    limit: number = 5
  ): Promise<any[]> {
    const now = new Date();

    // Find user questions that can be repeated
    const repeatableUserQuestions = await UserQuestion.find({
      userId,
      answered: true,
      canRepeatAfter: { $lte: now },
      questionId: { $nin: excludeIds },
    }).select('questionId');

    const repeatableIds = repeatableUserQuestions.map(uq => uq.questionId);

    if (repeatableIds.length === 0) {
      return [];
    }

    // Build query for the actual questions
    const query: any = {
      _id: { $in: repeatableIds },
    };

    if (subject) {
      query.subject = subject;
    }
    if (topic) {
      // tags is an array, so use $in to match if topic is in the array
      query.tags = { $in: [topic] };
    }
    // Make bloomLevel optional - don't filter by it for now since existing questions may not have it
    // if (bloomLevel) {
    //   // For repeats, allow same or higher Bloom level
    //   query['bloomLevel.primary'] = { $gte: bloomLevel };
    // }
    if (difficulty) {
      query.difficulty = difficulty;
    }

    return Question.find(query)
      .limit(limit)
      .sort({ 'metadata.timesUsed': 1 })
      .exec();
  }

  /**
   * Get questions due for spaced repetition review
   */
  async getReviewQuestions(
    userId: mongoose.Types.ObjectId,
    subject?: Subject
  ): Promise<any[]> {
    const now = new Date();

    // Find topics due for review
    const query: any = {
      userId,
      'performance.nextReviewDate': { $lte: now },
    };

    if (subject) {
      query.subject = subject;
    }

    const progressDue = await StudentProgress.find(query)
      .sort({ 'performance.nextReviewDate': 1 })
      .limit(5);

    if (progressDue.length === 0) {
      return [];
    }

    // Get questions from due topics
    const topics = progressDue.map(p => p.topic);
    const subjects = progressDue.map(p => p.subject);

    // Find questions for these topics, prioritizing ones seen before
    const userQuestions = await UserQuestion.find({
      userId,
      usedForReview: false, // Haven't been used for review yet
    }).select('questionId');

    const priorityIds = userQuestions.map(uq => uq.questionId);

    const questions = await Question.find({
      tags: { $in: topics },
      subject: { $in: subjects },
      _id: { $in: priorityIds },
    }).limit(5);

    return questions;
  }

  /**
   * Record that a question was shown to a user
   */
  async recordQuestionShown(
    userId: mongoose.Types.ObjectId,
    questionId: mongoose.Types.ObjectId,
    bloomLevel?: number
  ): Promise<void> {
    const existing = await UserQuestion.findOne({ userId, questionId });

    if (existing) {
      // Update existing record
      existing.timesSeen += 1;
      existing.shownAt = new Date();
      existing.canRepeatAfter = new Date();
      existing.canRepeatAfter.setDate(existing.canRepeatAfter.getDate() + MIN_DAYS_BEFORE_REPEAT);
      await existing.save();
    } else {
      // Create new record
      const canRepeatAfter = new Date();
      canRepeatAfter.setDate(canRepeatAfter.getDate() + MIN_DAYS_BEFORE_REPEAT);

      await UserQuestion.create({
        userId,
        questionId,
        shownAt: new Date(),
        timesSeen: 1,
        canRepeatAfter,
        bloomLevel,
      });
    }
  }

  /**
   * Record that a question was answered
   */
  async recordQuestionAnswered(
    userId: mongoose.Types.ObjectId,
    questionId: mongoose.Types.ObjectId,
    answer: {
      isCorrect: boolean;
      userAnswer: string;
      timeSpent: number;
      hintsUsed: number;
      chatInteractions: number;
      calculatedConfidence: number;
    }
  ): Promise<void> {
    await UserQuestion.findOneAndUpdate(
      { userId, questionId },
      {
        answered: true,
        isCorrect: answer.isCorrect,
        userAnswer: answer.userAnswer,
        timeSpent: answer.timeSpent,
        hintsUsed: answer.hintsUsed,
        chatInteractions: answer.chatInteractions,
        calculatedConfidence: answer.calculatedConfidence,
      }
    );
  }

  /**
   * Get optimal difficulty for user
   */
  async getOptimalDifficulty(
    userId: mongoose.Types.ObjectId,
    subject?: Subject,
    topic?: string
  ): Promise<Difficulty> {
    // Get recent performance
    const recentProgress = await StudentProgress.findOne({
      userId,
      ...(subject && { subject }),
      ...(topic && { topic }),
    });

    if (!recentProgress) {
      return 'medium'; // Default for new users
    }

    const { performance } = recentProgress;
    const skill = flowEngineService.estimateSkillLevel(
      performance.masteryLevel,
      performance.accuracyRate,
      performance.bloomProgress?.currentLevel || 1
    );

    // Map skill to difficulty
    if (skill <= 3) {
      return 'easy';
    } else if (skill <= 7) {
      return 'medium';
    } else {
      return 'hard';
    }
  }
}

export const questionSelectorService = new QuestionSelectorService();

