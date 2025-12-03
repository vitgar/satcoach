import { Question, IQuestion, Subject, Difficulty } from '../models/Question.model';
import { UserQuestion } from '../models/UserQuestion.model';
import { aiIntegrationService } from './ai-integration.service';
import { Types } from 'mongoose';

export interface QuestionFilters {
  subject?: Subject;
  difficulty?: Difficulty;
  tags?: string[];
  excludeIds?: string[];
}

export interface CreateQuestionData {
  subject: Subject;
  difficulty: Difficulty;
  difficultyScore?: number;
  content: {
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  };
  tags?: string[];
  generatedBy?: 'ai' | 'manual';
}

export class QuestionService {
  /**
   * Get questions with optional filters
   */
  async getQuestions(filters: QuestionFilters = {}, limit = 20): Promise<IQuestion[]> {
    const query: any = {};

    if (filters.subject) {
      query.subject = filters.subject;
    }

    if (filters.difficulty) {
      query.difficulty = filters.difficulty;
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters.excludeIds && filters.excludeIds.length > 0) {
      query._id = { $nin: filters.excludeIds.map(id => new Types.ObjectId(id)) };
    }

    return Question.find(query)
      .limit(limit)
      .sort({ 'metadata.timesUsed': 1, createdAt: -1 })
      .exec();
  }

  /**
   * Get a single question by ID
   */
  async getQuestionById(id: string): Promise<IQuestion | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid question ID');
    }
    return Question.findById(id);
  }

  /**
   * Create a new question
   */
  async createQuestion(data: CreateQuestionData): Promise<IQuestion> {
    const question = await Question.create(data);
    return question;
  }

  /**
   * Get next question for a student based on their level and history
   * This is the adaptive selection algorithm
   */
  async getNextQuestion(
    subject: Subject | undefined,
    studentLevel: number,
    attemptedQuestionIds: string[] = []
  ): Promise<IQuestion | null> {
    // Map student level (1-10) to difficulty
    const difficulty = this.mapLevelToDifficulty(studentLevel);

    // Try to find a question the student hasn't attempted
    const filters: QuestionFilters = {
      subject,
      difficulty,
      excludeIds: attemptedQuestionIds,
    };

    const questions = await this.getQuestions(filters, 10);

    if (questions.length === 0) {
      // If no questions available at this difficulty, try medium
      filters.difficulty = 'medium';
      const fallbackQuestions = await this.getQuestions(filters, 10);
      
      if (fallbackQuestions.length === 0) {
        return null;
      }
      
      // Return least used question
      return this.selectLeastUsedQuestion(fallbackQuestions);
    }

    // Select the least used question from the results
    return this.selectLeastUsedQuestion(questions);
  }

  /**
   * Record that a question was used and update statistics
   */
  async recordQuestionAttempt(
    questionId: string,
    isCorrect: boolean,
    timeSpent: number
  ): Promise<void> {
    const question = await this.getQuestionById(questionId);
    
    if (!question) {
      throw new Error('Question not found');
    }

    await question.incrementUsage();
    await question.updateStatistics(isCorrect, timeSpent);
  }

  /**
   * Get questions by subject for review/practice
   */
  async getQuestionsBySubject(
    subject: Subject,
    limit = 20
  ): Promise<IQuestion[]> {
    return Question.find({ subject })
      .limit(limit)
      .sort({ 'metadata.timesUsed': 1 })
      .exec();
  }

  /**
   * Get question statistics
   */
  async getQuestionStatistics(questionId: string) {
    const question = await this.getQuestionById(questionId);
    
    if (!question) {
      throw new Error('Question not found');
    }

    return {
      questionId: question._id,
      subject: question.subject,
      difficulty: question.difficulty,
      timesUsed: question.metadata.timesUsed,
      averageAccuracy: question.metadata.averageAccuracy,
      averageTimeSpent: question.metadata.averageTimeSpent,
    };
  }

  /**
   * Helper: Map student level (1-10) to difficulty
   */
  private mapLevelToDifficulty(level: number): Difficulty {
    if (level <= 3) return 'easy';
    if (level <= 7) return 'medium';
    return 'hard';
  }

  /**
   * Helper: Select the question that has been used the least
   */
  private selectLeastUsedQuestion(questions: IQuestion[]): IQuestion {
    return questions.reduce((least, current) => {
      return current.metadata.timesUsed < least.metadata.timesUsed ? current : least;
    });
  }

  /**
   * Count questions by filters
   */
  async countQuestions(filters: QuestionFilters = {}): Promise<number> {
    const query: any = {};

    if (filters.subject) {
      query.subject = filters.subject;
    }

    if (filters.difficulty) {
      query.difficulty = filters.difficulty;
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    return Question.countDocuments(query);
  }

  /**
   * Get next question for a specific user (checks what they've seen)
   */
  async getNextQuestionForUser(
    userId: string,
    subject?: Subject,
    topic?: string,
    requireGraph: boolean = false
  ): Promise<IQuestion> {
    console.log(`[QuestionService] Getting next question for user ${userId}, subject: ${subject}, topic: ${topic}`);

    // Get IDs of questions this user has already seen
    const seenQuestions = await UserQuestion.find({ userId }).select('questionId');
    const seenQuestionIds = seenQuestions.map(uq => uq.questionId.toString());

    console.log(`[QuestionService] User has seen ${seenQuestionIds.length} questions`);

    // Try to find an unseen question
    const query: any = {
      _id: { $nin: seenQuestionIds.map(id => new Types.ObjectId(id)) },
    };

    if (subject) {
      query.subject = subject;
    }

    if (topic) {
      query.tags = topic;
    }

    // If graph is required (for testing graph rendering), filter to questions that include a graph
    if (requireGraph) {
      query['content.graph'] = { $exists: true };
    }

    let question = await Question.findOne(query)
      .sort({ 'metadata.timesUsed': 1 })
      .exec();

    // If no unseen question found, generate one with AI
    if (!question) {
      console.log('[QuestionService] No unseen questions found, generating with AI...');
      
      // Determine difficulty based on user (for now use medium, can be enhanced later)
      const difficulty: Difficulty = 'medium';
      
      question = await aiIntegrationService.generateAndSaveQuestion(
        subject || 'math',
        difficulty,
        topic
      );

      // If graph was required but AI returned none (shouldn't happen with function-calling),
      // try one more generation with a graph-focused topic hint
      if (requireGraph && question && !(question.content as any).graph) {
        const graphTopic = topic ? `${topic} with graph` : 'function with graph visualization';
        question = await aiIntegrationService.generateAndSaveQuestion(
          subject || 'math',
          difficulty,
          graphTopic
        );
      }
    }

    // TypeScript null check (should never be null at this point)
    if (!question) {
      throw new Error('Failed to get or generate question');
    }

    // Mark this question as shown to the user
    await this.markQuestionAsShown(userId, (question._id as any).toString());

    return question;
  }

  /**
   * Mark a question as shown to a user
   */
  async markQuestionAsShown(userId: string, questionId: string): Promise<void> {
    await UserQuestion.create({
      userId: new Types.ObjectId(userId),
      questionId: new Types.ObjectId(questionId),
      shownAt: new Date(),
      answered: false,
    });

    console.log(`[QuestionService] Marked question ${questionId} as shown to user ${userId}`);
  }

  /**
   * Submit answer for a question
   */
  async submitAnswer(
    userId: string,
    questionId: string,
    userAnswer: string,
    timeSpent: number
  ): Promise<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
  }> {
    // Get the question
    const question = await this.getQuestionById(questionId);
    
    if (!question) {
      throw new Error('Question not found');
    }

    // Check if answer is correct
    const isCorrect = userAnswer === question.content.correctAnswer;

    // Update UserQuestion record
    await UserQuestion.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        questionId: new Types.ObjectId(questionId),
      },
      {
        answered: true,
        isCorrect,
        userAnswer,
        timeSpent,
      }
    );

    // Update question statistics
    await this.recordQuestionAttempt(questionId, isCorrect, timeSpent);

    console.log(`[QuestionService] User ${userId} answered question ${questionId}: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);

    return {
      isCorrect,
      correctAnswer: question.content.correctAnswer,
      explanation: question.content.explanation,
    };
  }
}

export const questionService = new QuestionService();

