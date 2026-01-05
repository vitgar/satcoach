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

export interface GenerationOptions {
  topic?: string;
  includeGraph?: boolean; // Only applicable for math
}

export class QuestionGeneratorService {
  /**
   * Generate a new SAT question using function calling for guaranteed structure
   * @param includeGraph - If true (and subject is math), force graph data to be included
   */
  async generateQuestion(
    subject: Subject,
    difficulty?: Difficulty,
    topic?: string,
    includeGraph?: boolean
  ): Promise<GeneratedQuestion> {
    // If no difficulty specified, pick a random one
    const actualDifficulty = difficulty || this.getRandomDifficulty();
    const difficultyScore = this.mapDifficultyToScore(actualDifficulty);
    
    const userPrompt = this.buildQuestionPrompt(subject, actualDifficulty, difficultyScore, topic, includeGraph);
    
    const messages: ChatMessage[] = [
      { role: 'system', content: QUESTION_GENERATION_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    try {
      // Use function calling with JSON schema enforcement
      // Pass includeGraph to schema builder for math questions
      const functionSchema = this.getQuestionSchema(subject, includeGraph);
      
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
        difficulty: actualDifficulty,
        difficultyScore,
        content: {
          questionText: response.questionText,
          options: response.options,
          correctAnswer: response.correctAnswer,
          explanation: response.explanation,
          graph: response.graph, // Present if includeGraph was true
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
   * @param includeGraph - If true (and subject is math), force graph data in all questions
   */
  async generateQuestions(
    subject: Subject,
    difficulty: Difficulty | undefined,
    count: number,
    topic?: string,
    includeGraph?: boolean
  ): Promise<GeneratedQuestion[]> {
    const questions: GeneratedQuestion[] = [];
    const coveredTopics = new Set<string>();
    
    // Generate questions sequentially to ensure variety
    for (let i = 0; i < count; i++) {
      // Build variety instruction
      let varietyInstruction = '';
      
      if (topic) {
        // If topic is specified, vary subtopics and problem types
        varietyInstruction = `\n\nIMPORTANT VARIETY REQUIREMENT (Question ${i + 1} of ${count}):
- This question must cover a DIFFERENT aspect, subtopic, or problem type within "${topic}" than any previous questions
- Vary the specific concept, application, or scenario
- Use a different real-world context or problem setup
- Ensure this question feels distinct from previous ones`;
        
        if (coveredTopics.size > 0) {
          varietyInstruction += `\n- Already covered: ${Array.from(coveredTopics).join(', ')}`;
        }
      } else {
        // If no topic specified, vary topics entirely
        varietyInstruction = `\n\nIMPORTANT VARIETY REQUIREMENT (Question ${i + 1} of ${count}):
- This question must cover a DIFFERENT topic or concept than any previous questions
- Vary the mathematical concept, problem type, or subject area
- Use a different real-world context or scenario
- Ensure this question feels distinct from previous ones`;
        
        if (coveredTopics.size > 0) {
          varietyInstruction += `\n- Already covered topics: ${Array.from(coveredTopics).join(', ')}`;
        }
      }
      
      // Generate question with variety instruction
      // Combine topic and variety instruction if topic exists, otherwise just use variety instruction
      const fullTopic = topic 
        ? `${topic}${varietyInstruction}` 
        : varietyInstruction.trim();
      
      const question = await this.generateQuestion(
        subject,
        difficulty,
        fullTopic || undefined, // Pass undefined if empty
        includeGraph
      );
      
      questions.push(question);
      
      // Track covered topics from tags
      question.tags.forEach(tag => coveredTopics.add(tag.toLowerCase()));
    }
    
    return questions;
  }

  /**
   * Build the prompt for question generation
   * @param includeGraph - If true, explicitly require graph data in the question
   */
  private buildQuestionPrompt(
    subject: Subject,
    difficulty: Difficulty,
    difficultyScore: number,
    topic?: string,
    includeGraph?: boolean
  ): string {
    // Check if topic contains variety instruction
    const hasVarietyInstruction = topic?.includes('IMPORTANT VARIETY REQUIREMENT');
    
    let baseTopic: string | undefined;
    let varietyInstruction: string | undefined;
    
    if (hasVarietyInstruction && topic) {
      // Extract base topic and variety instruction
      const parts = topic.split('\n\nIMPORTANT VARIETY REQUIREMENT');
      baseTopic = parts[0].trim() || undefined;
      varietyInstruction = 'IMPORTANT VARIETY REQUIREMENT' + parts[1];
    } else {
      baseTopic = topic;
    }
    
    let prompt = `Generate a ${difficulty} difficulty ${subject} SAT question`;
    
    if (baseTopic) {
      prompt += ` focused on the topic: "${baseTopic}"`;
    }
    
    prompt += `.\n\nDifficulty Score: ${difficultyScore}/10\n\n`;
    
    // Add variety instruction if present
    if (varietyInstruction) {
      prompt += varietyInstruction + '\n\n';
    }
    
    // Build JSON format example based on graph requirement
    if (subject === 'math' && includeGraph) {
      prompt += `Return the question in this exact JSON format:
{
  "questionText": "The question text here (must reference the graph/chart)...",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "A",
  "explanation": "Step-by-step explanation of why A is correct...",
  "tags": ["tag1", "tag2", "tag3"],
  "graph": {
    "type": "line",
    "data": [{"x": -3, "y": 9}, {"x": -2, "y": 4}, {"x": -1, "y": 1}, {"x": 0, "y": 0}, {"x": 1, "y": 1}, {"x": 2, "y": 4}, {"x": 3, "y": 9}],
    "config": {"xLabel": "x", "yLabel": "y", "title": "Graph of f(x)"}
  }
}

CRITICAL REQUIREMENTS:
- correctAnswer must be ONLY the letter (A, B, C, or D)
- options must be an array of exactly 4 strings
- tags should be 2-3 relevant topic keywords
- ⚠️ graph is REQUIRED - This question MUST include visual graph/chart data
- The question text MUST reference the graph (e.g., "According to the graph shown...", "Based on the function graphed above...")
- Include 7-10 accurate data points that correspond to the mathematical function
- Graph types: line (for functions), bar (for data comparison), scatter (for correlations), area (for cumulative data)
- Make the question authentic to the official SAT format`;
    } else {
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
    }

    return prompt;
  }


  /**
   * Get JSON schema for function calling based on subject and graph requirement
   * @param includeGraph - If true (and subject is math), make graph field REQUIRED
   */
  private getQuestionSchema(subject: Subject, includeGraph?: boolean) {
    // Graph is required only if explicitly requested for math questions
    const requireGraph = subject === 'math' && includeGraph === true;

    const baseSchema = {
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
            description: requireGraph 
              ? 'Graph data for visual representation (REQUIRED - question must reference this graph)'
              : 'Optional graph data for visual representation',
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
        required: requireGraph 
          ? ['questionText', 'options', 'correctAnswer', 'explanation', 'tags', 'graph'] // GRAPH REQUIRED when requested
          : ['questionText', 'options', 'correctAnswer', 'explanation', 'tags'], // Graph optional otherwise
      },
    };

    return baseSchema;
  }

  /**
   * Get a random difficulty level
   */
  private getRandomDifficulty(): Difficulty {
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    return difficulties[Math.floor(Math.random() * difficulties.length)];
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

