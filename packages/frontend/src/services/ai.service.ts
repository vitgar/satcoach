import axios from 'axios';

const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:3002/api/v1';

const aiApi = axios.create({
  baseURL: AI_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface QuestionContext {
  questionText: string;
  subject: string;
  difficulty: string;
  correctAnswer: string;
  explanation: string;
  tags?: string[];
}

export interface StudentContext {
  level: number;
  accuracyRate?: number;
  recentPerformance?: 'struggling' | 'average' | 'excelling';
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CoachingRequest {
  userMessage: string;
  questionContext: QuestionContext;
  studentContext: StudentContext;
  chatHistory?: ChatMessage[];
}

export const aiService = {
  /**
   * Get coaching response from AI
   */
  async getCoachingResponse(request: CoachingRequest): Promise<string> {
    try {
      const response = await aiApi.post('/chat/coach', request);
      return response.data.response;
    } catch (error: any) {
      console.error('[AIService] Coaching error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get AI response');
    }
  },

  /**
   * Get a hint for the current question
   */
  async getHint(questionContext: QuestionContext, studentContext: StudentContext): Promise<string> {
    try {
      const response = await aiApi.post('/chat/hint', {
        questionContext,
        studentContext,
      });
      return response.data.hint;
    } catch (error: any) {
      console.error('[AIService] Hint error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get hint');
    }
  },

  /**
   * Get detailed explanation
   */
  async getExplanation(questionContext: QuestionContext, studentContext: StudentContext): Promise<string> {
    try {
      const response = await aiApi.post('/chat/explain', {
        questionContext,
        studentContext,
      });
      return response.data.explanation;
    } catch (error: any) {
      console.error('[AIService] Explanation error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get explanation');
    }
  },

  /**
   * Clarify a concept
   */
  async clarifyConcept(concept: string, subject: string, studentContext: StudentContext): Promise<string> {
    try {
      const response = await aiApi.post('/chat/clarify', {
        concept,
        subject,
        studentContext,
      });
      return response.data.clarification;
    } catch (error: any) {
      console.error('[AIService] Clarification error:', error);
      throw new Error(error.response?.data?.error || 'Failed to clarify concept');
    }
  },

  /**
   * Generate a new question
   */
  async generateQuestion(subject: string, difficulty: string, topic?: string): Promise<any> {
    try {
      const response = await aiApi.post('/questions/generate', {
        subject,
        difficulty,
        topic,
      });
      return response.data.question;
    } catch (error: any) {
      console.error('[AIService] Question generation error:', error);
      throw new Error(error.response?.data?.error || 'Failed to generate question');
    }
  },
};

