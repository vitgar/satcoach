import api from './api';
import { Question, Subject, Difficulty } from '../types';

interface QuestionFilters {
  subject?: Subject;
  difficulty?: Difficulty;
  tags?: string[];
  limit?: number;
}

interface QuestionsResponse {
  questions: Question[];
  total: number;
  limit: number;
}

interface NextQuestionResponse {
  question: Question;
  studentLevel: number;
  recommendedDifficulty: Difficulty;
}

export const questionService = {
  async getQuestions(filters?: QuestionFilters): Promise<QuestionsResponse> {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await api.get<QuestionsResponse>(`/questions?${params.toString()}`);
    return response.data;
  },

  async getNextQuestion(subject?: Subject, excludeIds?: string[]): Promise<NextQuestionResponse> {
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    if (excludeIds && excludeIds.length > 0) {
      excludeIds.forEach(id => params.append('excludeIds', id));
    }
    
    const response = await api.get<NextQuestionResponse>(`/questions/next?${params.toString()}`);
    return response.data;
  },

  async getQuestion(id: string): Promise<Question> {
    const response = await api.get<{ question: Question }>(`/questions/${id}`);
    return response.data.question;
  },

  async submitAnswer(
    questionId: string,
    userAnswer: string,
    timeSpent: number
  ): Promise<{
    message: string;
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string | null;
  }> {
    const response = await api.post(`/questions/${questionId}/answer`, {
      userAnswer,
      timeSpent,
    });
    return response.data;
  },
};

