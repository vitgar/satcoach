import api from './api';
import { StudentProgress, Analytics, ReviewSchedule } from '../types';

interface RecordAttemptData {
  questionId: string;
  isCorrect: boolean;
  timeSpent: number;
  confidence?: number;
  hintsUsed?: number;
  chatInteractions?: number;
}

interface RecordAttemptResponse {
  message: string;
  nextReviewDate: string;
  masteryLevel: number;
  newStudentLevel: number;
  progress: StudentProgress;
}

export const progressService = {
  async recordAttempt(data: RecordAttemptData): Promise<RecordAttemptResponse> {
    const response = await api.post<RecordAttemptResponse>('/progress/attempt', data);
    return response.data;
  },

  async getSchedule(): Promise<ReviewSchedule> {
    const response = await api.get<{ schedule: ReviewSchedule }>('/progress/schedule');
    return response.data.schedule;
  },

  async getAllProgress(): Promise<StudentProgress[]> {
    const response = await api.get<{ progress: StudentProgress[] }>('/progress/all');
    return response.data.progress;
  },

  async getAnalytics(): Promise<Analytics> {
    const response = await api.get<{ analytics: Analytics }>('/progress/analytics');
    return response.data.analytics;
  },

  async getTopicProgress(subject: string, topic: string): Promise<StudentProgress> {
    const response = await api.get<{ progress: StudentProgress }>(`/progress/topic/${subject}/${topic}`);
    return response.data.progress;
  },
};

