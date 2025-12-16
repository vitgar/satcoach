/**
 * Test Script: Create a Question with Graph
 * 
 * This script creates a test question with a quadratic function graph
 * to test the graph rendering feature.
 * 
 * Usage: node test-graph-question.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './packages/db-backend/.env' });

// Question Schema (matches the one in db-backend)
const questionSchema = new mongoose.Schema({
  subject: String,
  difficulty: String,
  difficultyScore: Number,
  content: {
    questionText: String,
    options: [String],
    correctAnswer: String,
    explanation: String,
    graph: {
      type: { type: String },
      data: mongoose.Schema.Types.Mixed,
      config: mongoose.Schema.Types.Mixed,
    }
  },
  metadata: {
    generatedBy: String,
    generatedAt: Date,
    timesUsed: Number,
    averageAccuracy: Number,
    averageTimeSpent: Number,
  },
  tags: [String]
}, { timestamps: true });

const Question = mongoose.model('Question', questionSchema);

async function createTestQuestion() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📝 Creating test questions with graphs...');
    
    // Test Question 1: Linear function
    const linearQuestion = new Question({
      subject: 'math',
      difficulty: 'medium',
      difficultyScore: 6,
      content: {
        questionText: `The graph below shows a linear function f(x) = 2x + 3.

What is the y-intercept of this line?`,
        options: [
          '2',
          '3',
          '-3',
          '1'
        ],
        correctAnswer: 'B',
        explanation: 'The y-intercept is the point where the line crosses the y-axis (where x = 0). From the equation f(x) = 2x + 3, when x = 0, f(0) = 3. So the y-intercept is 3.',
        graph: {
          type: 'line',
          data: [
            { x: -3, y: -3 },
            { x: -2, y: -1 },
            { x: -1, y: 1 },
            { x: 0, y: 3 },
            { x: 1, y: 5 },
            { x: 2, y: 7 },
            { x: 3, y: 9 }
          ],
          config: {
            title: 'Graph of f(x) = 2x + 3',
            xLabel: 'x',
            yLabel: 'f(x)',
            xDomain: [-4, 4],
            yDomain: [-5, 11],
            showGrid: true
          }
        }
      },
      metadata: {
        generatedBy: 'manual',
        generatedAt: new Date(),
        timesUsed: 0,
        averageAccuracy: 0,
        averageTimeSpent: 0,
      },
      tags: ['linear-functions', 'y-intercept', 'graphs', 'TEST-GRAPH-FEATURE']
    });

    // Test Question 2: Quadratic function
    const testQuestion = new Question({
      subject: 'math',
      difficulty: 'medium',
      difficultyScore: 6,
      content: {
        questionText: `The graph below shows a quadratic function f(x) = x² - 2x.

Based on the graph, what is the vertex (minimum point) of the parabola?`,
        options: [
          '(0, 0)',
          '(1, -1)',
          '(-1, 3)',
          '(2, 0)'
        ],
        correctAnswer: 'B',
        explanation: 'The vertex is the lowest point on the parabola, which occurs at (1, -1). You can see this is where the function reaches its minimum value before increasing again.',
        graph: {
          type: 'line',
          data: [
            { x: -2, y: 8 },
            { x: -1, y: 3 },
            { x: 0, y: 0 },
            { x: 1, y: -1 },
            { x: 2, y: 0 },
            { x: 3, y: 3 },
            { x: 4, y: 8 }
          ],
          config: {
            title: 'Graph of f(x) = x² - 2x',
            xLabel: 'x',
            yLabel: 'f(x)',
            xDomain: [-3, 5],
            yDomain: [-2, 10],
            showGrid: true
          }
        }
      },
      metadata: {
        generatedBy: 'manual',
        generatedAt: new Date(),
        timesUsed: 0,
        averageAccuracy: 0,
        averageTimeSpent: 0,
      },
      tags: ['quadratic-functions', 'vertex', 'graphs', 'parabola', 'TEST-GRAPH-FEATURE']
    });

    await linearQuestion.save();
    await testQuestion.save();
    
    console.log('✅ Test questions created successfully!\n');
    console.log('📊 Question 1 (Linear):');
    console.log('   ID:', linearQuestion._id);
    console.log('   Title:', linearQuestion.content.graph?.config?.title);
    console.log('   Graph Type:', linearQuestion.content.graph?.type);
    console.log('   Data Points:', linearQuestion.content.graph?.data?.length);
    console.log('\n📊 Question 2 (Quadratic):');
    console.log('   ID:', testQuestion._id);
    console.log('   Title:', testQuestion.content.graph?.config?.title);
    console.log('   Graph Type:', testQuestion.content.graph?.type);
    console.log('   Data Points:', testQuestion.content.graph?.data?.length);
    console.log('\n🎯 Next Steps:');
    console.log('   1. Go to http://localhost:5173/study');
    console.log('   2. You should see a beautiful linear graph with y-intercept at (0, 3)!');
    console.log('   3. Click "Next" to see the quadratic parabola with vertex at (1, -1)');
    console.log('   4. Hover over the graph points to see values');
    console.log('   5. Notice how (0, 0) is now visible in both graphs!');
    
    await mongoose.disconnect();
    console.log('\n✅ Done! Database connection closed.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('MONGODB_URI')) {
      console.error('\n💡 Make sure you have a .env file in packages/db-backend/ with MONGODB_URI');
    }
    process.exit(1);
  }
}

// Run the script
console.log('🧪 Test Script: Create Question with Graph\n');
console.log('=' .repeat(50));
createTestQuestion();

