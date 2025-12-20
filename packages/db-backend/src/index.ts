import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateEnv } from './config/environment';
import { connectDatabase } from './config/database';
import authRoutes from './routes/auth.routes';
import questionRoutes from './routes/question.routes';
import progressRoutes from './routes/progress.routes';
import sessionRoutes from './routes/session.routes';
import learningRoutes from './routes/learning.routes';
import validationRoutes from './routes/validation.routes';
import { errorHandler, notFound } from './middleware/errorHandler.middleware';

// Validate environment variables
validateEnv();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ 
  origin: config.corsOrigin,
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// For serverless: ensure DB connection on first request BEFORE routes
if (process.env.VERCEL === '1') {
  app.use(async (req, res, next) => {
    try {
      await connectDatabase();
      next();
    } catch (error) {
      console.error('Database connection failed:', error);
      res.status(503).json({ error: 'Database connection failed. Please try again.' });
    }
  });
}

// Request logging (development only)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'SAT Coach DB Backend',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/learning', learningRoutes);
app.use('/api/v1/validation', validationRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server only if not in serverless environment
if (process.env.VERCEL !== '1') {
  const startServer = async () => {
    try {
      // Connect to database
      await connectDatabase();

      // Start listening
      app.listen(config.port, () => {
        console.log('');
        console.log('🚀 ================================');
        console.log(`   SAT Coach DB Backend`);
        console.log(`   Environment: ${config.nodeEnv}`);
        console.log(`   Port: ${config.port}`);
        console.log(`   URL: http://localhost:${config.port}`);
        console.log('================================');
        console.log('');
        console.log('📍 Available endpoints:');
        console.log(`   GET  /health`);
        console.log(`   POST /api/v1/auth/register`);
        console.log(`   POST /api/v1/auth/login`);
        console.log(`   GET  /api/v1/auth/me`);
        console.log('');
        console.log(`   GET  /api/v1/questions`);
        console.log(`   GET  /api/v1/questions/next`);
        console.log(`   GET  /api/v1/questions/:id`);
        console.log(`   POST /api/v1/questions (admin)`);
        console.log('');
        console.log(`   POST /api/v1/progress/attempt`);
        console.log(`   GET  /api/v1/progress/schedule`);
        console.log(`   GET  /api/v1/progress/analytics`);
        console.log('');
        console.log(`   POST /api/v1/sessions/start`);
        console.log(`   PUT  /api/v1/sessions/:id/end`);
        console.log(`   GET  /api/v1/sessions/history`);
        console.log('');
        console.log(`   GET  /api/v1/learning/state`);
        console.log(`   GET  /api/v1/learning/question`);
        console.log(`   POST /api/v1/learning/attempt`);
        console.log(`   POST /api/v1/learning/explain`);
        console.log('');
        console.log(`   GET  /api/v1/validation/questions`);
        console.log(`   POST /api/v1/validation/validate-question`);
        console.log(`   POST /api/v1/validation/apply-changes`);
        console.log(`   GET  /api/v1/validation/stats`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  };

  // Handle shutdown gracefully
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
  });

  startServer();
}

// Export app for serverless functions
export default app;

