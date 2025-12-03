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
    let contextPrompt = this.buildContextPrompt(request.questionContext);
    
    // Check if this is an approach question - add Socratic guidance
    if (this.isApproachQuestion(request.userMessage)) {
      contextPrompt += this.buildSocraticPrompt();
    }
    
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
    
    // Default to beginner level if not provided or if level seems too high for a first explanation
    const effectiveLevel = studentContext.level || 3;
    const levelDescription = this.getStudentLevelDescription(effectiveLevel);
    
    prompt += `\n\n**Current Student Context:**\n`;
    prompt += `- Level: ${effectiveLevel}/10 (${levelDescription})\n`;
    
    if (studentContext.accuracyRate !== undefined) {
      prompt += `- Accuracy Rate: ${Math.round(studentContext.accuracyRate * 100)}%\n`;
    }
    
    if (studentContext.recentPerformance) {
      prompt += `- Recent Performance: ${studentContext.recentPerformance}\n`;
      // If struggling, force simpler explanations
      if (studentContext.recentPerformance === 'struggling') {
        prompt += `\n**CRITICAL:** Student is struggling - use EXTREMELY simple language, break everything into tiny steps, avoid all jargon.`;
      }
    }
    
    // Add adaptive instruction - START SIMPLE by default
    if (effectiveLevel <= 3 || studentContext.recentPerformance === 'struggling') {
      prompt += `\n**Teaching Approach (CRITICAL):** This student needs foundational support. Use VERY simple language, break concepts into tiny steps, provide lots of examples, avoid ALL jargon, and be very encouraging. Start with the absolute basics. Explain like they're seeing this for the first time.`;
    } else if (effectiveLevel <= 5) {
      prompt += `\n**Teaching Approach:** This student is developing. Start with simple explanations, then add detail if they ask. Use clear language with minimal jargon. Provide examples.`;
    } else if (effectiveLevel <= 7) {
      prompt += `\n**Teaching Approach:** This student has a solid foundation. Provide clear explanations with strategic insights. You can use moderate complexity, but still start simple.`;
    } else {
      prompt += `\n**Teaching Approach:** This student is advanced. Provide concise, sophisticated explanations. Focus on advanced strategies and edge cases.`;
    }
    
    // Always remind to start simple and clear - this is the key instruction
    prompt += `\n\n**CRITICAL INSTRUCTIONS FOR CLARITY:**
1. **Answer directly first** - Give the answer in 1-2 clear sentences
2. **Then add details** - Use bullet points or 1-2 short paragraphs
3. **Connect to current question** - After explaining a concept generally, ALWAYS show how it applies to the specific question/function/example the student is working on
4. **Keep it brief** - Aim for under 150 words unless student asks for more
5. **Use simple words** - Replace jargon with everyday language
6. **One idea per sentence** - Break complex thoughts into simple statements
7. **Show with examples** - Don't just define, demonstrate
8. **When explaining ANY concept for the FIRST time:** 
   - Start with the absolute simplest explanation
   - Use everyday language
   - Avoid technical terms
   - Then immediately connect it to their specific problem
   - Example: "In your function $f(x) = 2x^2 + 3x + 1$, the value of $a$ is 2, which is positive, so the graph opens upward"
   - If the student wants more detail, they will ask.
9. **When showing substitutions or transformations:**
   - ALWAYS show both the original and the transformed equation side by side
   - Format: "so $f(x) = 2x + 1$ becomes $f(2) = 2(2) + 1$"
   - This makes it clear what changed and how
   - Example: "You replaced $x$ with 2: so $f(x) = 2x + 1$ becomes $f(2) = 2(2) + 1$"`;
    
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
    
    prompt += `\n**CRITICAL INSTRUCTION:** When explaining concepts, ALWAYS connect them back to this specific question. After giving a general explanation, show how it applies to THIS question. For example, if explaining a formula, show the values from THIS question. If explaining a concept, relate it to the specific numbers/functions/expressions in THIS problem.`;
    
    prompt += `\n**When Showing Substitutions:** ALWAYS show the original equation and substituted equation side by side. Format: "so $f(x) = 2x + 1$ becomes $f(2) = 2(2) + 1$". This makes the transformation clear.`;
    
    prompt += `\n**Important:** Do NOT reveal the correct answer (${questionContext.correctAnswer}) unless the student explicitly asks for the full solution. Guide them to discover it themselves.`;
    
    return prompt;
  }

  /**
   * Detect if the user is asking for approach/guidance (use Socratic method)
   */
  private isApproachQuestion(message: string): boolean {
    const approachPhrases = [
      'how do i approach',
      'how should i',
      'how do i solve',
      'how do i find',
      'what should i do',
      'where do i start',
      'how do i start',
      'what\'s the approach',
      'how would you approach',
      'can you help me approach',
      'i don\'t know where to start',
      'i\'m stuck',
      'what do i do first',
    ];
    const lowerMessage = message.toLowerCase();
    return approachPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  /**
   * Build Socratic guidance prompt for approach questions
   */
  private buildSocraticPrompt(): string {
    return `\n\n**SOCRATIC GUIDANCE MODE (CRITICAL):**
The student is asking for guidance on HOW to approach the problem. Use the Socratic method:

1. **DO NOT** give all the steps immediately
2. **DO NOT** solve the problem for them
3. **DO** ask guiding questions:
   - "What do you already know about [this topic]?"
   - "Can you identify the key information in the problem?"
   - "Have you seen a formula or method for this before?"
   - "What do you think the first step might be?"

4. **Give ONE hint or guiding question at a time**
5. **Wait for them to respond** before giving more guidance
6. **Connect to their problem:** Use the specific numbers/values from THEIR question

Example response:
"Let's think through this together! 

First, what do you know about finding the vertex of a quadratic function? 

Looking at your function $f(x) = x^2 - 4x + 3$, can you identify the values of $a$, $b$, and $c$? 

Once you have those, we can talk about what formula might help us find the vertex."

**Remember:** Guide them to discover the answer, don't just give it to them.`;
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

