import { openaiService, ChatMessage } from './openai.service';
import { QUESTION_GENERATION_PROMPT } from '../prompts/system-prompts';

export type Subject = 'math' | 'reading' | 'writing';
export type Difficulty = 'easy' | 'medium' | 'hard';

// Graph types for visual representations
export type GraphType = 'line' | 'bar' | 'scatter' | 'histogram' | 'pie' | 'area' | 'composed';

export interface GraphData {
  type: GraphType;
  data: Array<Record<string, number | string>>;
  config?: {
    title?: string;
    xLabel?: string;
    yLabel?: string;
    xDomain?: [number, number];
    yDomain?: [number, number];
    width?: number;
    height?: number;
    showGrid?: boolean;
    showLegend?: boolean;
    dataKeys?: string[];
  };
}

export interface GeneratedQuestion {
  subject: Subject;
  difficulty: Difficulty;
  difficultyScore: number;
  content: {
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    graph?: GraphData; // NEW: Optional graph data
  };
  tags: string[];
}

export class QuestionGeneratorService {
  /**
   * Generate a new SAT question using function calling for guaranteed structure
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
      // Use function calling with JSON schema enforcement
      const functionSchema = this.getQuestionSchema(subject);
      
      const response = await openaiService.generateStructuredData(
        {
          messages,
          temperature: 0.8,
          maxTokens: 2000,
        },
        functionSchema
      );

      // Response is already validated by the schema
      return {
        subject,
        difficulty,
        difficultyScore,
        content: {
          questionText: response.questionText,
          options: response.options,
          correctAnswer: response.correctAnswer,
          explanation: response.explanation,
          graph: response.graph, // Now guaranteed to be present for function questions
        },
        tags: response.tags || [],
      };
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
  "tags": ["tag1", "tag2", "tag3"],
  "graph": {
    "type": "line",
    "data": [{"x": -3, "y": 9}, ...],
    "config": {"xLabel": "x", "yLabel": "y", "title": "Graph Title"}
  }
}

Important:
- correctAnswer must be ONLY the letter (A, B, C, or D)
- options must be an array of exactly 4 strings
- tags should be 2-3 relevant topic keywords
- ⚠️ TESTING: graph is REQUIRED for ALL function-related questions (quadratic, linear, exponential, etc.) - include 7-10 data points
- Make the question authentic to the official SAT format`;

    return prompt;
  }


  /**
   * Get JSON schema for function calling based on subject
   */
  private getQuestionSchema(subject: Subject) {
    // For math questions about functions, make graph REQUIRED
    const isMathFunctionQuestion = subject === 'math';

    return {
      name: 'generate_sat_question',
      description: 'Generate an SAT practice question with all required fields',
      parameters: {
        type: 'object',
        properties: {
          questionText: {
            type: 'string',
            description: 'The question text',
          },
          options: {
            type: 'array',
            description: 'Four answer options',
            items: { type: 'string' },
            minItems: 4,
            maxItems: 4,
          },
          correctAnswer: {
            type: 'string',
            description: 'The correct answer letter (A, B, C, or D)',
            enum: ['A', 'B', 'C', 'D'],
          },
          explanation: {
            type: 'string',
            description: 'Step-by-step explanation of the correct answer',
          },
          tags: {
            type: 'array',
            description: '2-3 relevant topic tags',
            items: { type: 'string' },
            minItems: 2,
            maxItems: 3,
          },
          graph: {
            type: 'object',
            description: 'Graph data for visual representation (REQUIRED for math function questions)',
            properties: {
              type: {
                type: 'string',
                description: 'Type of graph',
                enum: ['line', 'bar', 'scatter', 'area', 'pie'],
              },
              data: {
                type: 'array',
                description: 'Data points for the graph (7-10 points)',
                items: {
                  type: 'object',
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                  },
                },
                minItems: 7,
              },
              config: {
                type: 'object',
                description: 'Graph configuration',
                properties: {
                  title: { type: 'string' },
                  xLabel: { type: 'string' },
                  yLabel: { type: 'string' },
                  xDomain: {
                    type: 'array',
                    items: { type: 'number' },
                    minItems: 2,
                    maxItems: 2,
                  },
                  yDomain: {
                    type: 'array',
                    items: { type: 'number' },
                    minItems: 2,
                    maxItems: 2,
                  },
                  showGrid: { type: 'boolean' },
                },
                required: ['title', 'xLabel', 'yLabel'],
              },
            },
            required: ['type', 'data', 'config'],
          },
        },
        required: isMathFunctionQuestion 
          ? ['questionText', 'options', 'correctAnswer', 'explanation', 'tags', 'graph'] // GRAPH REQUIRED for math
          : ['questionText', 'options', 'correctAnswer', 'explanation', 'tags'], // Optional for other subjects
      },
    };
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

