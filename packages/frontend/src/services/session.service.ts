import api from './api';
import { StudySession } from '../types';

interface StartSessionData {
  timerUsed?: boolean;
}

interface SessionSummary {
  duration: number;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracy: number;
}

interface EndSessionResponse {
  message: string;
  session: StudySession;
  summary: SessionSummary;
}

interface SessionHistoryResponse {
  sessions: StudySession[];
  summary: {
    totalSessions: number;
    totalTimeSpent: number;
    totalQuestionsAttempted: number;
    overallAccuracy: number;
  };
}

export const sessionService = {
  async startSession(data?: StartSessionData): Promise<StudySession> {
    const response = await api.post<{ session: StudySession }>('/sessions/start', data);
    return response.data.session;
  },

  async endSession(sessionId: string): Promise<EndSessionResponse> {
    const response = await api.put<EndSessionResponse>(`/sessions/${sessionId}/end`);
    return response.data;
  },

  async addQuestionToSession(sessionId: string, questionId: string, isCorrect: boolean, subject: string): Promise<void> {
    await api.put(`/sessions/${sessionId}/question`, {
      questionId,
      isCorrect,
      subject,
    });
  },

  async getHistory(limit?: number): Promise<SessionHistoryResponse> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await api.get<SessionHistoryResponse>(`/sessions/history${params}`);
    return response.data;
  },

  async getActiveSession(): Promise<StudySession | null> {
    try {
      const response = await api.get<{ session: StudySession }>('/sessions/active');
      return response.data.session;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};

