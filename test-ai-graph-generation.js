/**
 * Test Script: Generate Questions with Graphs via AI
 * 
 * This script calls the AI backend to generate questions with graphs.
 * Much easier than manually creating test data!
 * 
 * Usage: node test-ai-graph-generation.js
 */

const axios = require('axios');

const AI_API_URL = 'http://localhost:3002/api/v1';
const DB_API_URL = 'http://localhost:3001/api/v1';

// Topics that should definitely have graphs
const GRAPH_TOPICS = [
  'quadratic functions',
  'linear functions',
  'exponential growth',
  'data analysis and statistics',
  'coordinate geometry',
  'function graphs',
  'parabolas',
  'slope and intercepts'
];

async function testGraphGeneration() {
  console.log('🧪 Testing AI Graph Generation\n');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Generate a question that SHOULD have a graph
    console.log('\n📊 Test 1: Generating question with graph...');
    console.log('Topic: Quadratic Functions\n');
    
    const response = await axios.post(`${AI_API_URL}/questions/generate`, {
      subject: 'math',
      difficulty: 'medium',
      topic: 'quadratic functions - include a graph showing the parabola'
    });
    
    const question = response.data;
    
    console.log('✅ Question generated!\n');
    console.log('📝 Question Text:');
    console.log('  ', question.content.questionText.substring(0, 100) + '...\n');
    
    if (question.content.graph) {
      console.log('🎉 SUCCESS! Question includes a graph!');
      console.log('   Type:', question.content.graph.type);
      console.log('   Data Points:', question.content.graph.data?.length || 0);
      console.log('   Config:', JSON.stringify(question.content.graph.config, null, 2));
      
      // Save to database
      console.log('\n💾 Saving question to database...');
      const saveResponse = await axios.post(`${DB_API_URL}/questions`, question, {
        headers: {
          'Authorization': 'Bearer YOUR_AUTH_TOKEN' // You'll need a valid token
        }
      });
      console.log('✅ Question saved! ID:', saveResponse.data._id);
      
    } else {
      console.log('⚠️  Question generated but NO GRAPH included');
      console.log('   This might happen sometimes. Try running again.');
      console.log('   The AI prompt can be improved for better consistency.');
    }
    
    console.log('\n' + '─'.repeat(60));
    console.log('\n🎯 Next Steps:');
    console.log('   1. Go to http://localhost:5173/study');
    console.log('   2. Look for the question about quadratic functions');
    console.log('   3. Check if the graph displays!');
    console.log('\n💡 Tip: Try different topics from this list:');
    GRAPH_TOPICS.forEach(topic => console.log(`   - ${topic}`));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure the AI backend is running:');
      console.error('   cd packages/ai-backend && npm run dev');
    } else if (error.response) {
      console.error('   Response:', error.response.data);
    }
    
    process.exit(1);
  }
}

// Alternative: Direct generation with explicit graph request
async function generateWithExplicitGraphRequest() {
  console.log('\n📊 Alternative Method: Explicit Graph Request\n');
  
  try {
    const customPrompt = `Generate a MEDIUM difficulty MATH question about quadratic functions.

IMPORTANT: This question MUST include a graph showing the parabola.

Include a "graph" object with:
- type: "line"
- data: Array of {x, y} points showing the parabola shape
- config: title, xLabel, yLabel, xDomain, yDomain

Example format:
{
  "questionText": "...",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "B",
  "explanation": "...",
  "tags": ["quadratic-functions", "graphs"],
  "graph": {
    "type": "line",
    "data": [{"x": -3, "y": 9}, {"x": -2, "y": 4}, ...],
    "config": {
      "title": "Graph of f(x)",
      "xLabel": "x",
      "yLabel": "f(x)",
      "xDomain": [-5, 5],
      "yDomain": [0, 30]
    }
  }
}`;

    // This would need a custom endpoint or direct OpenAI call
    console.log('Custom prompt created (would need implementation)');
    console.log('For now, use the standard endpoint with descriptive topics');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the test
console.log('🚀 Starting AI Graph Generation Test\n');
console.log('Prerequisites:');
console.log('  ✓ AI Backend running on http://localhost:3002');
console.log('  ✓ DB Backend running on http://localhost:3001');
console.log('  ✓ OpenAI API key configured\n');

testGraphGeneration();

