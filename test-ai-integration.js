/**
 * AI Backend Integration Test
 * Tests all AI endpoints to verify full functionality
 */

const axios = require('axios');

const AI_API_URL = 'http://localhost:3002/api/v1';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
};

async function testHealthCheck() {
  log.section('Testing Health Check...');
  try {
    const response = await axios.get(`${AI_API_URL.replace('/api/v1', '')}/health`);
    log.success(`Health check passed: ${response.data.service}`);
    log.info(`Model: ${response.data.model}`);
    return true;
  } catch (error) {
    log.error(`Health check failed: ${error.message}`);
    return false;
  }
}

async function testQuestionGeneration() {
  log.section('Testing Question Generation...');
  try {
    const response = await axios.post(`${AI_API_URL}/questions/generate`, {
      subject: 'math',
      difficulty: 'medium',
      topic: 'algebra',
    });

    const question = response.data.question;
    log.success('Question generated successfully');
    log.info(`Question: ${question.content.questionText.substring(0, 60)}...`);
    log.info(`Options: ${question.content.options.length} choices`);
    log.info(`Correct Answer: ${question.content.correctAnswer}`);
    log.info(`Tags: ${question.tags.join(', ')}`);
    return question;
  } catch (error) {
    log.error(`Question generation failed: ${error.message}`);
    return null;
  }
}

async function testHintGeneration(question) {
  log.section('Testing Hint Generation...');
  try {
    const response = await axios.post(`${AI_API_URL}/chat/hint`, {
      questionContext: {
        questionText: question.content.questionText,
        subject: question.subject,
        difficulty: question.difficulty,
        correctAnswer: question.content.correctAnswer,
        explanation: question.content.explanation,
        tags: question.tags,
      },
      studentContext: {
        level: 5,
      },
    });

    log.success('Hint generated successfully');
    log.info(`Hint: ${response.data.hint}`);
    return true;
  } catch (error) {
    log.error(`Hint generation failed: ${error.message}`);
    return false;
  }
}

async function testCoachingResponse(question) {
  log.section('Testing Coaching Response...');
  try {
    const response = await axios.post(`${AI_API_URL}/chat/coach`, {
      userMessage: 'How do I approach this problem?',
      questionContext: {
        questionText: question.content.questionText,
        subject: question.subject,
        difficulty: question.difficulty,
        correctAnswer: question.content.correctAnswer,
        explanation: question.content.explanation,
        tags: question.tags,
      },
      studentContext: {
        level: 6,
        accuracyRate: 0.75,
        recentPerformance: 'average',
      },
      chatHistory: [],
    });

    log.success('Coaching response generated successfully');
    log.info(`Response length: ${response.data.response.length} characters`);
    log.info(`Preview: ${response.data.response.substring(0, 100)}...`);
    return true;
  } catch (error) {
    log.error(`Coaching response failed: ${error.message}`);
    return false;
  }
}

async function testExplanation(question) {
  log.section('Testing Explanation Generation...');
  try {
    const response = await axios.post(`${AI_API_URL}/chat/explain`, {
      questionContext: {
        questionText: question.content.questionText,
        subject: question.subject,
        difficulty: question.difficulty,
        correctAnswer: question.content.correctAnswer,
        explanation: question.content.explanation,
        tags: question.tags,
      },
      studentContext: {
        level: 5,
      },
    });

    log.success('Explanation generated successfully');
    log.info(`Explanation length: ${response.data.explanation.length} characters`);
    return true;
  } catch (error) {
    log.error(`Explanation generation failed: ${error.message}`);
    return false;
  }
}

async function testConceptClarification() {
  log.section('Testing Concept Clarification...');
  try {
    const response = await axios.post(`${AI_API_URL}/chat/clarify`, {
      concept: 'quadratic equations',
      subject: 'math',
      studentContext: {
        level: 6,
      },
    });

    log.success('Concept clarification generated successfully');
    log.info(`Clarification: ${response.data.clarification.substring(0, 100)}...`);
    return true;
  } catch (error) {
    log.error(`Concept clarification failed: ${error.message}`);
    return false;
  }
}

async function testBatchGeneration() {
  log.section('Testing Batch Question Generation...');
  try {
    const response = await axios.post(`${AI_API_URL}/questions/generate-batch`, {
      subject: 'reading',
      difficulty: 'easy',
      count: 3,
    });

    log.success(`Batch generation successful: ${response.data.count} questions generated`);
    return true;
  } catch (error) {
    log.error(`Batch generation failed: ${error.message}`);
    return false;
  }
}

async function testAdaptiveLevels() {
  log.section('Testing Adaptive Difficulty Levels...');
  
  const testQuestion = {
    content: {
      questionText: 'If 2x + 3 = 11, what is x?',
      correctAnswer: '4',
      explanation: 'Subtract 3 from both sides, then divide by 2',
      options: ['4', '5', '6', '7'],
    },
    subject: 'math',
    difficulty: 'easy',
    tags: ['algebra'],
  };

  const levels = [
    { level: 2, description: 'Beginner' },
    { level: 5, description: 'Intermediate' },
    { level: 9, description: 'Advanced' },
  ];

  for (const { level, description } of levels) {
    try {
      const response = await axios.post(`${AI_API_URL}/chat/coach`, {
        userMessage: 'Can you explain this?',
        questionContext: {
          questionText: testQuestion.content.questionText,
          subject: testQuestion.subject,
          difficulty: testQuestion.difficulty,
          correctAnswer: testQuestion.content.correctAnswer,
          explanation: testQuestion.content.explanation,
          tags: testQuestion.tags,
        },
        studentContext: {
          level,
        },
      });

      log.success(`${description} level (${level}/10) response generated`);
      log.info(`Response length: ${response.data.response.length} chars`);
    } catch (error) {
      log.error(`${description} level failed: ${error.message}`);
      return false;
    }
  }

  return true;
}

async function runAllTests() {
  console.log(`${colors.yellow}
╔════════════════════════════════════════╗
║   SAT Coach AI Integration Test        ║
╚════════════════════════════════════════╝${colors.reset}
`);

  const results = {
    passed: 0,
    failed: 0,
  };

  // Test 1: Health Check
  if (await testHealthCheck()) results.passed++;
  else results.failed++;

  // Test 2: Question Generation
  const question = await testQuestionGeneration();
  if (question) {
    results.passed++;

    // Test 3: Hint Generation (using generated question)
    if (await testHintGeneration(question)) results.passed++;
    else results.failed++;

    // Test 4: Coaching Response (using generated question)
    if (await testCoachingResponse(question)) results.passed++;
    else results.failed++;

    // Test 5: Explanation (using generated question)
    if (await testExplanation(question)) results.passed++;
    else results.failed++;
  } else {
    results.failed += 4; // Skip dependent tests
  }

  // Test 6: Concept Clarification
  if (await testConceptClarification()) results.passed++;
  else results.failed++;

  // Test 7: Batch Generation
  if (await testBatchGeneration()) results.passed++;
  else results.failed++;

  // Test 8: Adaptive Levels
  if (await testAdaptiveLevels()) results.passed++;
  else results.failed++;

  // Summary
  console.log(`\n${colors.yellow}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}Test Summary:${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`  Total: ${results.passed + results.failed}`);
  console.log(`${colors.yellow}═══════════════════════════════════════${colors.reset}\n`);

  if (results.failed === 0) {
    log.success('All tests passed! AI backend is fully functional. 🎉');
    process.exit(0);
  } else {
    log.error(`${results.failed} test(s) failed. Please check the errors above.`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  log.error(`Test suite failed: ${error.message}`);
  process.exit(1);
});






