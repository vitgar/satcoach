// Test MongoDB connection
// Run with: node test-connection.js

require('dotenv').config();

// Simple test without mongoose to check basic connectivity
const { MongoClient } = require('mongodb');

async function testConnection() {
  console.log('🔍 Testing MongoDB Connection...\n');
  
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env file');
    console.log('\nPlease add your MongoDB connection string to packages/db-backend/.env');
    console.log('Example:');
    console.log('MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/satcoach-dev?retryWrites=true&w=majority');
    process.exit(1);
  }
  
  console.log('Connection URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
  console.log('');
  
  const client = new MongoClient(uri);
  
  try {
    // Connect
    console.log('⏳ Connecting...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!\n');
    
    // Get database
    const db = client.db();
    console.log('📁 Database:', db.databaseName);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('\n📊 Collections:');
    if (collections.length === 0) {
      console.log('  (No collections yet - they will be created when you add data)');
    } else {
      collections.forEach(col => {
        console.log(`  ✓ ${col.name}`);
      });
    }
    
    // Test write/read
    console.log('\n🧪 Testing write/read operations...');
    const testCollection = db.collection('_test');
    
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    const doc = await testCollection.findOne({ test: true });
    await testCollection.deleteOne({ test: true });
    
    if (doc) {
      console.log('✅ Write/Read operations successful!');
    }
    
    // Connection stats
    const stats = await db.stats();
    console.log('\n📈 Database Stats:');
    console.log(`  Collections: ${stats.collections}`);
    console.log(`  Data Size: ${(stats.dataSize / 1024).toFixed(2)} KB`);
    console.log(`  Storage Size: ${(stats.storageSize / 1024).toFixed(2)} KB`);
    
    console.log('\n✅ All tests passed! Your database is ready to use.');
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your connection string in .env');
    console.log('2. Verify username and password are correct');
    console.log('3. Ensure your IP is whitelisted in MongoDB Atlas');
    console.log('4. Check if special characters in password are URL-encoded');
    console.log('\nSee docs/DATABASE_SETUP.md for detailed help');
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed.');
  }
}

// Run the test
testConnection().catch(console.error);

