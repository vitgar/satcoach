/**
 * Guided Chat Service
 * 
 * Provides conversational tutoring for guided review sessions.
 * Can embed practice questions inline in the conversation.
 */

import { openaiService, ChatMessage } from './openai.service';
import { topicRecommenderService } from './topicRecommender.service';

export interface SessionContext {
  subject: string;
  topic: string;
  studentLevel: number;
  learningStyle?: 'visual' | 'verbal' | 'procedural' | 'conceptual' | 'mixed';
  weakAreas?: string[];
  masteryLevel?: number;
  chatHistory?: ChatMessage[];
  questionsAttempted?: number;
  questionsCorrect?: number;
}

export interface EmbeddedQuestion {
  id: string;
  text: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

export interface GuidedChatResponse {
  response: string;
  embeddedQuestion: EmbeddedQuestion | null;
  conceptsCovered: string[];
  suggestedFollowUp: string | null;
}

export interface SessionSummary {
  summary: string;
  conceptsMastered: string[];
  conceptsNeedingWork: string[];
  recommendedNextSteps: string[];
  overallProgress: string;
}

const GUIDED_REVIEW_SYSTEM_PROMPT = `You are an expert SAT tutor conducting a guided review session.

CONTEXT:
- Subject: {subject}
- Topic: {topic}
- Student Level: {level}/10
- Weak Areas: {weakAreas}
- Learning Style: {learningStyle}

YOUR GOALS:
1. Help the student understand concepts they're struggling with
2. Present practice questions when appropriate to check understanding
3. Build confidence through scaffolded learning
4. Identify gaps and misconceptions

QUESTION PRESENTATION:
When you want to present a practice question to check understanding, use this EXACT format:

<question>
{
  "text": "Question text here",
  "options": [
    {"label": "A", "text": "Option A text"},
    {"label": "B", "text": "Option B text"},
    {"label": "C", "text": "Option C text"},
    {"label": "D", "text": "Option D text"}
  ],
  "correctAnswer": "A",
  "explanation": "Brief explanation of why A is correct"
}
</question>

After presenting a question, wait for the student's answer before continuing.

TEACHING APPROACH:
- Start with conceptual understanding
- Use Socratic questioning to guide discovery
- Present questions to check understanding (not too frequently - every 3-4 exchanges)
- Provide immediate, constructive feedback
- Adapt difficulty based on responses
- Be encouraging and supportive

RESPONSE GUIDELINES:
- Keep responses focused and concise (under 150 words unless explaining a complex concept)
- Use simple language appropriate for the student's level
- Include examples when helpful
- End responses with an engaging follow-up or question to continue the conversation`;

export class GuidedChatService {
  /**
   * Generate a response for the guided review chat
   */
  async generateGuidedResponse(
    userMessage: string,
    context: SessionContext
  ): Promise<GuidedChatResponse> {
    const systemPrompt = this.buildSystemPrompt(context);
    
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add chat history if provided
    if (context.chatHistory && context.chatHistory.length > 0) {
      messages.push(...context.chatHistory.slice(-8)); // Last 8 messages for context
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    try {
      const rawResponse = await openaiService.generateChatCompletion({
        messages,
        temperature: 0.7,
        maxTokens: 800,
      });

      // Parse response for embedded questions
      const { cleanResponse, embeddedQuestion } = this.parseQuestionFromResponse(rawResponse);

      // Extract concepts mentioned in the response
      const conceptsCovered = this.extractConcepts(cleanResponse, context.topic);

      // Generate a follow-up suggestion if appropriate
      const suggestedFollowUp = this.generateFollowUpSuggestion(cleanResponse, context);

      return {
        response: cleanResponse,
        embeddedQuestion,
        conceptsCovered,
        suggestedFollowUp,
      };
    } catch (error: any) {
      console.error('[GuidedChat] Error generating response:', error);
      throw new Error(`Failed to generate guided response: ${error.message}`);
    }
  }

  /**
   * Generate an introduction message when starting a topic
   */
  async generateTopicIntroduction(context: SessionContext): Promise<GuidedChatResponse> {
    const introduction = await topicRecommenderService.generateTopicIntroduction(
      context.topic,
      context.subject,
      {
        level: context.studentLevel,
        learningStyle: context.learningStyle,
      },
      context.masteryLevel || 0
    );

    return {
      response: introduction,
      embeddedQuestion: null,
      conceptsCovered: [context.topic],
      suggestedFollowUp: null,
    };
  }

  /**
   * Generate a response for when a student answers an embedded question
   */
  async generateQuestionFeedback(
    studentAnswer: string,
    question: EmbeddedQuestion,
    isCorrect: boolean,
    context: SessionContext
  ): Promise<GuidedChatResponse> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an SAT tutor providing feedback on a practice question.
Be encouraging regardless of whether the answer is correct or not.
If incorrect, explain the mistake without being discouraging.
Keep feedback concise (2-3 sentences) and offer to explain further if needed.`
      },
      {
        role: 'user',
        content: `The student answered "${studentAnswer}" to this question:

Question: ${question.text}
Options: ${question.options.map(o => `${o.label}) ${o.text}`).join(', ')}
Correct Answer: ${question.correctAnswer}
Student's Answer: ${studentAnswer}
Is Correct: ${isCorrect}

${question.explanation}

Provide brief, encouraging feedback. If they got it wrong, explain why in a supportive way.`
      },
    ];

    try {
      const response = await openaiService.generateChatCompletion({
        messages,
        temperature: 0.7,
        maxTokens: 200,
      });

      return {
        response,
        embeddedQuestion: null,
        conceptsCovered: this.extractConcepts(response, context.topic),
        suggestedFollowUp: isCorrect 
          ? 'Want to try another question or explore a related concept?'
          : 'Would you like me to explain this concept in more detail?',
      };
    } catch (error: any) {
      console.error('[GuidedChat] Error generating feedback:', error);
      
      // Fallback feedback
      const fallback = isCorrect
        ? `Great job! ${question.correctAnswer} is correct. ${question.explanation}`
        : `Not quite - the correct answer is ${question.correctAnswer}. ${question.explanation} Would you like to try another one?`;

      return {
        response: fallback,
        embeddedQuestion: null,
        conceptsCovered: [],
        suggestedFollowUp: null,
      };
    }
  }

  /**
   * Generate a session summary when ending the guided review
   */
  async generateSessionSummary(context: SessionContext & {
    questionsAttempted: number;
    questionsCorrect: number;
    conceptsCovered: string[];
    sessionDurationMinutes: number;
  }): Promise<SessionSummary> {
    const accuracy = context.questionsAttempted > 0
      ? Math.round((context.questionsCorrect / context.questionsAttempted) * 100)
      : 0;

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an SAT tutor summarizing a guided review session.
Provide a brief, encouraging summary that:
1. Acknowledges their effort
2. Highlights what they did well
3. Identifies areas for continued focus
4. Suggests next steps

Return a JSON object with the summary.`
      },
      {
        role: 'user',
        content: `Summarize this guided review session:

Topic: ${context.topic}
Subject: ${context.subject}
Duration: ${context.sessionDurationMinutes} minutes
Questions Attempted: ${context.questionsAttempted}
Questions Correct: ${context.questionsCorrect}
Accuracy: ${accuracy}%
Concepts Covered: ${context.conceptsCovered.join(', ') || 'General review'}
Weak Areas Going In: ${context.weakAreas?.join(', ') || 'None identified'}

Return JSON: {
  "summary": "2-3 sentence summary",
  "conceptsMastered": ["concepts they showed strong understanding of"],
  "conceptsNeedingWork": ["concepts that need more practice"],
  "recommendedNextSteps": ["1-2 specific next steps"],
  "overallProgress": "encouraging statement about progress"
}`
      },
    ];

    try {
      const response = await openaiService.generateStructuredData<SessionSummary>({
        messages,
        temperature: 0.7,
        maxTokens: 400,
      }, {
        name: 'generate_session_summary',
        description: 'Generate a session summary for guided review',
        parameters: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            conceptsMastered: { type: 'array', items: { type: 'string' } },
            conceptsNeedingWork: { type: 'array', items: { type: 'string' } },
            recommendedNextSteps: { type: 'array', items: { type: 'string' } },
            overallProgress: { type: 'string' },
          },
          required: ['summary', 'conceptsMastered', 'conceptsNeedingWork', 'recommendedNextSteps', 'overallProgress'],
        },
      });

      return response;
    } catch (error: any) {
      console.error('[GuidedChat] Error generating summary:', error);
      
      // Fallback summary
      return {
        summary: `You spent ${context.sessionDurationMinutes} minutes reviewing ${context.topic} and answered ${context.questionsCorrect} of ${context.questionsAttempted} questions correctly.`,
        conceptsMastered: accuracy >= 70 ? [context.topic] : [],
        conceptsNeedingWork: accuracy < 70 ? [context.topic] : [],
        recommendedNextSteps: [`Continue practicing ${context.topic}`, 'Try related topics'],
        overallProgress: 'Keep up the good work! Consistent practice leads to improvement.',
      };
    }
  }

  // Private helper methods

  private buildSystemPrompt(context: SessionContext): string {
    return GUIDED_REVIEW_SYSTEM_PROMPT
      .replace('{subject}', context.subject)
      .replace('{topic}', context.topic)
      .replace('{level}', String(context.studentLevel))
      .replace('{weakAreas}', context.weakAreas?.join(', ') || 'None identified')
      .replace('{learningStyle}', context.learningStyle || 'mixed');
  }

  /**
   * Parse embedded question from AI response
   */
  parseQuestionFromResponse(response: string): {
    cleanResponse: string;
    embeddedQuestion: EmbeddedQuestion | null;
  } {
    const questionMatch = response.match(/<question>([\s\S]*?)<\/question>/);

    if (!questionMatch) {
      return { cleanResponse: response.trim(), embeddedQuestion: null };
    }

    // Remove question tag from response
    const cleanResponse = response.replace(/<question>[\s\S]*?<\/question>/g, '').trim();

    try {
      const questionJson = questionMatch[1].trim();
      const parsed = JSON.parse(questionJson);

      const embeddedQuestion: EmbeddedQuestion = {
        id: `q_${Date.now()}`,
        text: parsed.text,
        options: parsed.options || [],
        correctAnswer: parsed.correctAnswer,
        explanation: parsed.explanation || '',
      };

      return { cleanResponse, embeddedQuestion };
    } catch (parseError) {
      console.warn('[GuidedChat] Failed to parse question JSON:', parseError);
      return { cleanResponse: response.trim(), embeddedQuestion: null };
    }
  }

  private extractConcepts(response: string, topic: string): string[] {
    const concepts: string[] = [];

    // Always include the main topic
    concepts.push(topic);

    // Look for common SAT concept keywords
    const mathConcepts = [
      'quadratic', 'linear', 'equation', 'function', 'slope', 'intercept',
      'vertex', 'parabola', 'factor', 'polynomial', 'ratio', 'proportion',
      'percentage', 'algebra', 'geometry', 'triangle', 'circle', 'area',
    ];

    const readingConcepts = [
      'main idea', 'inference', 'evidence', 'tone', 'author', 'purpose',
      'argument', 'claim', 'support', 'context', 'vocabulary',
    ];

    const writingConcepts = [
      'grammar', 'punctuation', 'comma', 'semicolon', 'sentence structure',
      'parallel', 'modifier', 'pronoun', 'verb', 'tense', 'agreement',
    ];

    const allConcepts = [...mathConcepts, ...readingConcepts, ...writingConcepts];
    const lowerResponse = response.toLowerCase();

    for (const concept of allConcepts) {
      if (lowerResponse.includes(concept) && !concepts.includes(concept)) {
        concepts.push(concept);
      }
    }

    return concepts.slice(0, 5); // Limit to 5 concepts
  }

  private generateFollowUpSuggestion(
    _response: string,
    context: SessionContext
  ): string | null {
    // Generate contextual follow-up based on session state
    const questionsAttempted = context.questionsAttempted || 0;

    if (questionsAttempted === 0) {
      return 'Would you like to try a practice question to test your understanding?';
    }

    if (questionsAttempted > 0 && questionsAttempted % 3 === 0) {
      return 'You\'ve answered a few questions. Want to discuss any concepts or try a different approach?';
    }

    return null;
  }
}

export const guidedChatService = new GuidedChatService();

