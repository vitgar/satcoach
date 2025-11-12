import axios from 'axios';
import { Question, Subject, Difficulty } from '../models/Question.model';

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:3002/api/v1';

export class AIIntegrationService {
  /**
   * Generate a question using AI backend and save to database
   */
  async generateAndSaveQuestion(
    subject: Subject,
    difficulty: Difficulty,
    topic?: string
  ): Promise<any> {
    try {
      console.log(`[AIIntegration] Generating ${difficulty} ${subject} question${topic ? ` on ${topic}` : ''}`);

      // Call AI backend
      const response = await axios.post(`${AI_BACKEND_URL}/questions/generate`, {
        subject,
        difficulty,
        topic,
      });

      const aiQuestion = response.data.question;

      // Save to database
      const question = await Question.create({
        subject: aiQuestion.subject,
        difficulty: aiQuestion.difficulty,
        difficultyScore: aiQuestion.difficultyScore,
        content: {
          questionText: aiQuestion.content.questionText,
          options: aiQuestion.content.options,
          correctAnswer: aiQuestion.content.correctAnswer,
          explanation: aiQuestion.content.explanation,
        },
        tags: aiQuestion.tags || [],
        metadata: {
          generatedBy: 'ai',
          generatedAt: new Date(),
          timesUsed: 0,
          averageAccuracy: 0,
          averageTimeSpent: 0,
        },
      });

      console.log(`[AIIntegration] Question generated and saved: ${question._id}`);

      return question;
    } catch (error: any) {
      console.error('[AIIntegration] Error generating question:', error.message);
      throw new Error(`Failed to generate question: ${error.message}`);
    }
  }

  /**
   * Check if AI backend is available
   */
  async checkAIBackendHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${AI_BACKEND_URL.replace('/api/v1', '')}/health`, {
        timeout: 3000,
      });
      return response.status === 200;
    } catch (error) {
      console.warn('[AIIntegration] AI backend not available');
      return false;
    }
  }
}

export const aiIntegrationService = new AIIntegrationService();

