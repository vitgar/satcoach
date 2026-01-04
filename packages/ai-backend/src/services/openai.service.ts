import OpenAI from 'openai';
import { config } from '../config/environment';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export class OpenAIService {
  /**
   * Check if model requires max_completion_tokens instead of max_tokens
   */
  private requiresMaxCompletionTokens(model: string): boolean {
    // Models that require max_completion_tokens (o1 series, gpt-5.2, etc.)
    return model.startsWith('o1') || model.includes('gpt-5');
  }

  /**
   * Generate a chat completion using OpenAI
   */
  async generateChatCompletion(options: ChatCompletionOptions): Promise<string> {
    try {
      const model = options.model || config.openaiModel;
      const maxTokens = options.maxTokens || config.maxTokens;
      
      const requestParams: any = {
        model,
        messages: options.messages,
        temperature: options.temperature ?? config.temperature,
      };

      // Use max_completion_tokens for models that require it (o1, gpt-5.x)
      if (this.requiresMaxCompletionTokens(model)) {
        requestParams.max_completion_tokens = maxTokens;
      } else {
        requestParams.max_tokens = maxTokens;
      }

      const response = await openai.chat.completions.create(requestParams);

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      return content.trim();
    } catch (error: any) {
      console.error('OpenAI API Error:', error.message);
      throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }

  /**
   * Generate a streaming chat completion
   */
  async *generateStreamingCompletion(options: ChatCompletionOptions): AsyncGenerator<string> {
    try {
      const model = options.model || config.openaiModel;
      const maxTokens = options.maxTokens || config.maxTokens;
      
      const requestParams: any = {
        model,
        messages: options.messages,
        temperature: options.temperature ?? config.temperature,
        stream: true,
      };

      // Use max_completion_tokens for models that require it (o1, gpt-5.x)
      if (this.requiresMaxCompletionTokens(model)) {
        requestParams.max_completion_tokens = maxTokens;
      } else {
        requestParams.max_tokens = maxTokens;
      }

      const stream = await openai.chat.completions.create(requestParams);

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error: any) {
      console.error('OpenAI Streaming Error:', error.message);
      throw new Error(`Failed to generate streaming response: ${error.message}`);
    }
  }

  /**
   * Generate structured data using function calling with JSON schema enforcement
   */
  async generateStructuredData<T = any>(
    options: ChatCompletionOptions,
    functionSchema: {
      name: string;
      description: string;
      parameters: any;
    }
  ): Promise<T> {
    try {
      const model = options.model || config.openaiModel;
      const maxTokens = options.maxTokens || 2000; // Increased for graph data
      
      const requestParams: any = {
        model,
        messages: options.messages,
        temperature: options.temperature ?? config.temperature,
        functions: [functionSchema],
        function_call: { name: functionSchema.name },
      };

      // Use max_completion_tokens for models that require it (o1, gpt-5.x)
      if (this.requiresMaxCompletionTokens(model)) {
        requestParams.max_completion_tokens = maxTokens;
      } else {
        requestParams.max_tokens = maxTokens;
      }

      const response = await openai.chat.completions.create(requestParams);

      const functionCall = response.choices[0]?.message?.function_call;
      
      if (!functionCall || !functionCall.arguments) {
        throw new Error('No function call in OpenAI response');
      }

      const result = JSON.parse(functionCall.arguments);
      return result as T;
    } catch (error: any) {
      console.error('OpenAI Function Calling Error:', error.message);
      throw new Error(`Failed to generate structured data: ${error.message}`);
    }
  }

  /**
   * Count tokens in a message (approximate)
   */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

export const openaiService = new OpenAIService();

