import dotenv from 'dotenv';
import path from 'path';

// Load environment variables - .env.local takes precedence over .env
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  nodeEnv: string;
  port: number;
  openaiApiKey: string;
  openaiModel: string;
  corsOrigin: string | string[];
  maxTokens: number;
  temperature: number;
}

// Parse CORS origins - supports comma-separated list or single origin
const parseCorsOrigin = (): string | string[] => {
  const corsEnv = process.env.CORS_ORIGIN;
  
  // Default origins for development and production
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://satcoach.vercel.app',
    'https://satcoach-frontend.vercel.app'
  ];
  
  if (!corsEnv) {
    return defaultOrigins;
  }
  
  // If it contains a comma, split into array
  if (corsEnv.includes(',')) {
    return corsEnv.split(',').map(origin => origin.trim());
  }
  
  // Single origin provided
  return corsEnv;
};

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4001', 10),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  corsOrigin: parseCorsOrigin(),
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

