import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateEnv } from './config/environment';
import questionRoutes from './routes/question.routes';
import chatRoutes from './routes/chat.routes';
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

// Request logging (development only)
if (config.nodeEnv === 'development') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'SAT Coach AI Backend',
    model: config.openaiModel,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/chat', chatRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server
const startServer = () => {
  try {
    app.listen(config.port, () => {
      console.log('');
      console.log('🤖 ================================');
      console.log(`   SAT Coach AI Backend`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Port: ${config.port}`);
      console.log(`   URL: http://localhost:${config.port}`);
      console.log(`   Model: ${config.openaiModel}`);
      console.log('================================');
      console.log('');
      console.log('📍 Available endpoints:');
      console.log(`   GET  /health`);
      console.log('');
      console.log(`   POST /api/v1/questions/generate`);
      console.log(`   POST /api/v1/questions/generate-batch`);
      console.log('');
      console.log(`   POST /api/v1/chat/coach`);
      console.log(`   POST /api/v1/chat/hint`);
      console.log(`   POST /api/v1/chat/explain`);
      console.log(`   POST /api/v1/chat/clarify`);
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

