import mongoose from 'mongoose';

// Cache the connection for serverless environments
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached: MongooseCache = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export const connectDatabase = async (): Promise<typeof mongoose> => {
  // If already connected, reuse the connection
  if (cached.conn) {
    console.log('✅ Using cached MongoDB connection');
    return cached.conn;
  }

  // If connection is in progress, wait for it
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI not defined in environment variables');
    }

    const opts = {
      bufferCommands: false,
      // Increased timeouts for better reliability in serverless cold starts
      serverSelectionTimeoutMS: 15000, // 15 seconds to handle cold starts
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 15000, // 15 seconds for initial connection
      // Connection pool settings optimized for serverless
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 10000, // Close idle connections after 10s
    };

    console.log('🔄 Creating new MongoDB connection...');
    
    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      const dbName = mongoose.connection.db?.databaseName || 'unknown';
      console.log('✅ MongoDB connected:', dbName);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }

  return cached.conn;
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (cached.conn) {
      await mongoose.connection.close();
      cached.conn = null;
      cached.promise = null;
      console.log('✅ MongoDB connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
    throw error;
  }
};

