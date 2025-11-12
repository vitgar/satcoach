import { openaiService, ChatMessage } from './openai.service';
import {
  SAT_COACH_SYSTEM_PROMPT,
  HINT_GENERATION_PROMPT,
  EXPLANATION_PROMPT,
  CONCEPT_CLARIFICATION_PROMPT,
} from '../prompts/system-prompts';

export interface QuestionContext {
  questionText: string;
  subject: string;
  difficulty: string;
  correctAnswer: string;
  explanation: string;
  tags?: string[];
}

export interface StudentContext {
  level: number; // 1-10
  accuracyRate?: number;
  recentPerformance?: 'struggling' | 'average' | 'excelling';
}

export interface ChatRequest {
  userMessage: string;
  questionContext: QuestionContext;
  studentContext: StudentContext;
  chatHistory?: ChatMessage[];
}

export class ChatCoachService {
  /**
   * Generate a coaching response
   */
  async generateCoachingResponse(request: ChatRequest): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(request.studentContext);
    const contextPrompt = this.buildContextPrompt(request.questionContext);
    
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: contextPrompt },
    ];

    // Add chat history if provided
    if (request.chatHistory && request.chatHistory.length > 0) {
      messages.push(...request.chatHistory.slice(-6)); // Last 6 messages for context
    }

    // Add current user message
    messages.push({ role: 'user', content: request.userMessage });

    try {
      const response = await openaiService.generateChatCompletion({
        messages,
        temperature: 0.7,
        maxTokens: 800,
      });

      return response;
    } catch (error: any) {
      console.error('Chat coaching error:', error);
      throw new Error(`Failed to generate coaching response: ${error.message}`);
    }
  }

  /**
   * Generate a hint for the current question
   */
  async generateHint(
    questionContext: QuestionContext,
    _studentContext: StudentContext
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: HINT_GENERATION_PROMPT },
      {
        role: 'user',
        content: `Question: ${questionContext.questionText}\n\nSubject: ${questionContext.subject}\nDifficulty: ${questionContext.difficulty}\n\nProvide a helpful hint without giving away the answer.`,
      },
    ];

    try {
      const response = await openaiService.generateChatCompletion({
        messages,
        temperature: 0.6,
        maxTokens: 200,
      });

      return response;
    } catch (error: any) {
      console.error('Hint generation error:', error);
      throw new Error(`Failed to generate hint: ${error.message}`);
    }
  }

  /**
   * Generate a detailed explanation
   */
  async generateExplanation(
    questionContext: QuestionContext,
    studentContext: StudentContext
  ): Promise<string> {
    const levelDescription = this.getStudentLevelDescription(studentContext.level);
    
    const messages: ChatMessage[] = [
      { role: 'system', content: EXPLANATION_PROMPT },
      {
        role: 'user',
        content: `Question: ${questionContext.questionText}\n\nCorrect Answer: ${questionContext.correctAnswer}\n\nOfficial Explanation: ${questionContext.explanation}\n\nStudent Level: ${levelDescription}\n\nProvide a clear, step-by-step explanation adapted for this student's level.`,
      },
    ];

    try {
      const response = await openaiService.generateChatCompletion({
        messages,
        temperature: 0.5,
        maxTokens: 1000,
      });

      return response;
    } catch (error: any) {
      console.error('Explanation generation error:', error);
      throw new Error(`Failed to generate explanation: ${error.message}`);
    }
  }

  /**
   * Clarify a concept
   */
  async clarifyConcept(
    concept: string,
    subject: string,
    _studentContext: StudentContext
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: CONCEPT_CLARIFICATION_PROMPT },
      {
        role: 'user',
        content: `Concept: ${concept}\nSubject: ${subject}\n\nExplain this concept clearly for an SAT student.`,
      },
    ];

    try {
      const response = await openaiService.generateChatCompletion({
        messages,
        temperature: 0.6,
        maxTokens: 600,
      });

      return response;
    } catch (error: any) {
      console.error('Concept clarification error:', error);
      throw new Error(`Failed to clarify concept: ${error.message}`);
    }
  }

  /**
   * Build adaptive system prompt based on student level
   */
  private buildSystemPrompt(studentContext: StudentContext): string {
    let prompt = SAT_COACH_SYSTEM_PROMPT;
    
    const levelDescription = this.getStudentLevelDescription(studentContext.level);
    
    prompt += `\n\n**Current Student Context:**\n`;
    prompt += `- Level: ${studentContext.level}/10 (${levelDescription})\n`;
    
    if (studentContext.accuracyRate !== undefined) {
      prompt += `- Accuracy Rate: ${Math.round(studentContext.accuracyRate * 100)}%\n`;
    }
    
    if (studentContext.recentPerformance) {
      prompt += `- Recent Performance: ${studentContext.recentPerformance}\n`;
    }
    
    // Add adaptive instruction
    if (studentContext.level <= 3) {
      prompt += `\n**Teaching Approach:** This student needs foundational support. Use simple language, break concepts into small steps, provide lots of examples, and be very encouraging.`;
    } else if (studentContext.level <= 7) {
      prompt += `\n**Teaching Approach:** This student has a solid foundation. Provide clear explanations with strategic insights. Challenge them appropriately.`;
    } else {
      prompt += `\n**Teaching Approach:** This student is advanced. Provide concise, sophisticated explanations. Focus on advanced strategies and edge cases.`;
    }
    
    return prompt;
  }

  /**
   * Build context prompt with question details
   */
  private buildContextPrompt(questionContext: QuestionContext): string {
    let prompt = `**Current Question Context:**\n\n`;
    prompt += `Subject: ${questionContext.subject}\n`;
    prompt += `Difficulty: ${questionContext.difficulty}\n`;
    prompt += `Question: ${questionContext.questionText}\n`;
    
    if (questionContext.tags && questionContext.tags.length > 0) {
      prompt += `Topics: ${questionContext.tags.join(', ')}\n`;
    }
    
    prompt += `\n**Important:** Do NOT reveal the correct answer (${questionContext.correctAnswer}) unless the student explicitly asks for the full solution. Guide them to discover it themselves.`;
    
    return prompt;
  }

  /**
   * Get student level description
   */
  private getStudentLevelDescription(level: number): string {
    if (level <= 3) return 'Beginner - Building foundations';
    if (level <= 5) return 'Developing - Grasping core concepts';
    if (level <= 7) return 'Proficient - Solid understanding';
    if (level <= 9) return 'Advanced - Strong mastery';
    return 'Expert - Exceptional performance';
  }
}

export const chatCoachService = new ChatCoachService();

