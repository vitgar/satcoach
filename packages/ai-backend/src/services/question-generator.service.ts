import { openaiService, ChatMessage } from './openai.service';
import { QUESTION_GENERATION_PROMPT } from '../prompts/system-prompts';

export type Subject = 'math' | 'reading' | 'writing';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GeneratedQuestion {
  subject: Subject;
  difficulty: Difficulty;
  difficultyScore: number;
  content: {
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  };
  tags: string[];
}

export class QuestionGeneratorService {
  /**
   * Generate a new SAT question
   */
  async generateQuestion(
    subject: Subject,
    difficulty: Difficulty,
    topic?: string
  ): Promise<GeneratedQuestion> {
    const difficultyScore = this.mapDifficultyToScore(difficulty);
    
    const userPrompt = this.buildQuestionPrompt(subject, difficulty, difficultyScore, topic);
    
    const messages: ChatMessage[] = [
      { role: 'system', content: QUESTION_GENERATION_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    try {
      const response = await openaiService.generateChatCompletion({
        messages,
        temperature: 0.8, // Higher creativity for question generation
        maxTokens: 1500,
      });

      const question = this.parseQuestionResponse(response, subject, difficulty, difficultyScore);
      
      return question;
    } catch (error: any) {
      console.error('Question generation error:', error);
      throw new Error(`Failed to generate question: ${error.message}`);
    }
  }

  /**
   * Generate multiple questions in batch
   */
  async generateQuestions(
    subject: Subject,
    difficulty: Difficulty,
    count: number,
    topic?: string
  ): Promise<GeneratedQuestion[]> {
    const promises = Array(count)
      .fill(null)
      .map(() => this.generateQuestion(subject, difficulty, topic));

    return Promise.all(promises);
  }

  /**
   * Build the prompt for question generation
   */
  private buildQuestionPrompt(
    subject: Subject,
    difficulty: Difficulty,
    difficultyScore: number,
    topic?: string
  ): string {
    let prompt = `Generate a ${difficulty} difficulty ${subject} SAT question`;
    
    if (topic) {
      prompt += ` focused on the topic: "${topic}"`;
    }
    
    prompt += `.\n\nDifficulty Score: ${difficultyScore}/10\n\n`;
    
    prompt += `Return the question in this exact JSON format:
{
  "questionText": "The question text here...",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "A",
  "explanation": "Step-by-step explanation of why A is correct...",
  "tags": ["tag1", "tag2", "tag3"]
}

Important:
- correctAnswer must be ONLY the letter (A, B, C, or D)
- options must be an array of exactly 4 strings
- tags should be 2-3 relevant topic keywords
- Make the question authentic to the official SAT format`;

    return prompt;
  }

  /**
   * Parse the AI response into a structured question
   */
  private parseQuestionResponse(
    response: string,
    subject: Subject,
    difficulty: Difficulty,
    difficultyScore: number
  ): GeneratedQuestion {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(jsonStr);
      
      // Validate required fields
      if (!parsed.questionText || !parsed.options || !parsed.correctAnswer || !parsed.explanation) {
        throw new Error('Missing required fields in generated question');
      }
      
      // Validate options array
      if (!Array.isArray(parsed.options) || parsed.options.length !== 4) {
        throw new Error('Options must be an array of exactly 4 items');
      }
      
      // Validate correct answer
      if (!['A', 'B', 'C', 'D'].includes(parsed.correctAnswer)) {
        throw new Error('correctAnswer must be A, B, C, or D');
      }
      
      return {
        subject,
        difficulty,
        difficultyScore,
        content: {
          questionText: parsed.questionText,
          options: parsed.options,
          correctAnswer: parsed.correctAnswer,
          explanation: parsed.explanation,
        },
        tags: parsed.tags || [],
      };
    } catch (error: any) {
      console.error('Failed to parse question response:', response);
      throw new Error(`Invalid question format: ${error.message}`);
    }
  }

  /**
   * Map difficulty string to numeric score
   */
  private mapDifficultyToScore(difficulty: Difficulty): number {
    const map: Record<Difficulty, number> = {
      easy: 3,
      medium: 6,
      hard: 9,
    };
    return map[difficulty];
  }
}

export const questionGeneratorService = new QuestionGeneratorService();

