import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  nodeEnv: string;
  port: number;
  openaiApiKey: string;
  openaiModel: string;
  corsOrigin: string;
  maxTokens: number;
  temperature: number;
}

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  maxTokens: parseInt(process.env.MAX_TOKENS || '1000', 10),
  temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
};

export const validateEnv = (): void => {
  const required = ['OPENAI_API_KEY'];
  
  const missing = required.filter((key) => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
  
  console.log('✅ Environment variables validated');
};

