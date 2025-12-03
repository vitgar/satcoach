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
   * Generate a chat completion using OpenAI
   */
  async generateChatCompletion(options: ChatCompletionOptions): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: options.model || config.openaiModel,
        messages: options.messages,
        temperature: options.temperature ?? config.temperature,
        max_tokens: options.maxTokens || config.maxTokens,
      });

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
      const stream = await openai.chat.completions.create({
        model: options.model || config.openaiModel,
        messages: options.messages,
        temperature: options.temperature ?? config.temperature,
        max_tokens: options.maxTokens || config.maxTokens,
        stream: true,
      });

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
      const response = await openai.chat.completions.create({
        model: options.model || config.openaiModel,
        messages: options.messages,
        temperature: options.temperature ?? config.temperature,
        max_tokens: options.maxTokens || 2000, // Increased for graph data
        functions: [functionSchema],
        function_call: { name: functionSchema.name },
      });

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

