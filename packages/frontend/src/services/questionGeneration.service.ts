/**
 * Question Generation Service
 * 
 * Frontend service for generating questions via the AI backend
 */

import axios from 'axios';
import { Question } from '../types';

// Get base URL - normalize to ensure /api/v1 is included exactly once
const getBaseUrl = (url: string | undefined, defaultUrl: string): string => {
  const baseUrl = url || defaultUrl;
  const normalized = baseUrl.replace(/\/api\/v1\/?$/, '');
  return `${normalized}/api/v1`;
};

const aiApi = axios.create({
  baseURL: getBaseUrl(import.meta.env.VITE_AI_API_URL, 'http://localhost:4001'),
});

export interface GenerationParams {
  subject: 'math' | 'reading' | 'writing';
  difficulty?: 'easy' | 'medium' | 'hard';
  count: number;
  topic?: string;
  includeGraph?: boolean; // For Math only
}

interface GeneratedQuestion {
  subject: string;
  difficulty: string;
  difficultyScore: number;
  content: {
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    graph?: {
      type: string;
      data: any[];
      config?: Record<string, any>;
    };
  };
  tags: string[];
}

class QuestionGenerationService {
  /**
   * Generate questions using the AI backend
   */
  async generateQuestions(params: GenerationParams): Promise<Question[]> {
    const { subject, difficulty, count, topic, includeGraph } = params;

    // Build the request body
    const requestBody: Record<string, any> = {
      subject,
      count: Math.min(count, 10), // API limit is 10 per batch
      difficulty,
    };

    // For Math with includeGraph, add instruction to topic
    if (subject === 'math' && includeGraph) {
      requestBody.topic = topic 
        ? `${topic} (IMPORTANT: This question MUST include graph/chart data for visual representation)`
        : 'Questions that require visual graphs or charts for data interpretation';
      requestBody.includeGraph = true;
    } else if (topic) {
      requestBody.topic = topic;
    }

    try {
      // If count > 10, make multiple requests
      const totalBatches = Math.ceil(count / 10);
      const allQuestions: Question[] = [];

      for (let batch = 0; batch < totalBatches; batch++) {
        const batchCount = Math.min(10, count - batch * 10);
        
        console.log(`[QuestionGeneration] Generating batch ${batch + 1}/${totalBatches} (${batchCount} questions)`);
        
        const response = await aiApi.post('/questions/generate-batch', {
          ...requestBody,
          count: batchCount,
        });

        if (response.data.questions) {
          const questions = this.transformQuestions(response.data.questions);
          allQuestions.push(...questions);
        }
      }

      console.log(`[QuestionGeneration] Generated ${allQuestions.length} questions total`);
      return allQuestions;
    } catch (error: any) {
      console.error('[QuestionGeneration] Error:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate questions');
    }
  }

  /**
   * Generate a single question
   */
  async generateSingleQuestion(params: Omit<GenerationParams, 'count'>): Promise<Question> {
    const questions = await this.generateQuestions({ ...params, count: 1 });
    if (questions.length === 0) {
      throw new Error('No question was generated');
    }
    return questions[0];
  }

  /**
   * Transform generated questions to match frontend Question type
   */
  private transformQuestions(generatedQuestions: GeneratedQuestion[]): Question[] {
    const now = new Date().toISOString();
    return generatedQuestions.map((q, index) => ({
      _id: `generated_${Date.now()}_${index}`,
      subject: q.subject as 'math' | 'reading' | 'writing',
      difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
      difficultyScore: q.difficultyScore || 5,
      content: {
        questionText: q.content.questionText,
        options: q.content.options,
        correctAnswer: q.content.correctAnswer,
        explanation: q.content.explanation,
        graph: q.content.graph ? {
          type: q.content.graph.type as any,
          data: q.content.graph.data,
          config: q.content.graph.config,
        } : undefined,
      },
      tags: q.tags || [],
      metadata: {
        generatedBy: 'ai' as const,
        generatedAt: now,
        timesUsed: 0,
        averageAccuracy: 0,
        averageTimeSpent: 0,
      },
      bloomLevel: {
        primary: 3,
        description: 'Apply',
      },
      flowMetrics: {
        expectedChallenge: q.difficultyScore || 5,
        expectedTime: 90,
        typicalHintsNeeded: 0,
      },
      createdAt: now,
      updatedAt: now,
    }));
  }
}

export const questionGenerationService = new QuestionGenerationService();

