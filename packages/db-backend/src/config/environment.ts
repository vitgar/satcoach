import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  corsOrigin: string | string[];
  bcryptRounds: number;
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
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  corsOrigin: parseCorsOrigin(),
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
};

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

export const validateEnv = (): void => {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

