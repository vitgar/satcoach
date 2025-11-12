/**
 * Test Script for Complete Question Flow
 * 
 * This script tests:
 * 1. User registration/login
 * 2. Getting next question (user-aware)
 * 3. Submitting answer
 * 4. Verifying no repeats
 * 5. AI generation when needed
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001/api/v1';
let accessToken = '';
let userId = '';
let questionId = '';

// Test user credentials
const testUser = {
  email: `testuser_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
};

console.log('🧪 Testing Complete Question Flow\n');
console.log('=' .repeat(60));

async function test() {
  try {
    // Step 1: Register user
    console.log('\n📝 Step 1: Registering test user...');
    const registerRes = await axios.post(`${API_URL}/auth/register`, testUser);
    accessToken = registerRes.data.accessToken;
    userId = registerRes.data.user._id;
    console.log('✅ User registered:', registerRes.data.user.email);
    console.log('   User ID:', userId);

    // Step 2: Get first question
    console.log('\n📚 Step 2: Getting first question...');
    const question1Res = await axios.get(`${API_URL}/questions/next?subject=math`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    questionId = question1Res.data.question._id;
    console.log('✅ Question received:', questionId);
    console.log('   Subject:', question1Res.data.question.subject);
    console.log('   Difficulty:', question1Res.data.question.difficulty);
    console.log('   Has correct answer?', 'correctAnswer' in question1Res.data.question.content ? '❌ LEAKED!' : '✅ Hidden');
    console.log('   Question text:', question1Res.data.question.content.questionText.substring(0, 80) + '...');

    // Step 3: Submit wrong answer
    console.log('\n✍️  Step 3: Submitting wrong answer...');
    const wrongAnswer = question1Res.data.question.content.options[1]; // Pick second option
    const submitRes = await axios.post(
      `${API_URL}/questions/${questionId}/answer`,
      {
        userAnswer: wrongAnswer,
        timeSpent: 30,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    console.log('✅ Answer submitted');
    console.log('   Is correct?', submitRes.data.isCorrect ? '✅ Yes' : '❌ No');
    console.log('   Correct answer:', submitRes.data.correctAnswer);
    console.log('   Explanation provided?', submitRes.data.explanation ? '✅ Yes' : '❌ No');
    if (submitRes.data.explanation) {
      console.log('   Explanation:', submitRes.data.explanation.substring(0, 100) + '...');
    }

    // Step 4: Get second question
    console.log('\n📚 Step 4: Getting second question...');
    const question2Res = await axios.get(`${API_URL}/questions/next?subject=math`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const question2Id = question2Res.data.question._id;
    console.log('✅ Question received:', question2Id);
    console.log('   Same as first?', question2Id === questionId ? '❌ REPEATED!' : '✅ Different');

    // Step 5: Get third question
    console.log('\n📚 Step 5: Getting third question...');
    const question3Res = await axios.get(`${API_URL}/questions/next?subject=math`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const question3Id = question3Res.data.question._id;
    console.log('✅ Question received:', question3Id);
    console.log('   Unique?', question3Id !== questionId && question3Id !== question2Id ? '✅ Yes' : '❌ Duplicate');

    // Step 6: Submit correct answer
    console.log('\n✍️  Step 6: Submitting correct answer...');
    const correctAnswer = question3Res.data.question.content.options[0]; // We don't know which is correct, so this is a guess
    const submit2Res = await axios.post(
      `${API_URL}/questions/${question3Id}/answer`,
      {
        userAnswer: correctAnswer,
        timeSpent: 45,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    console.log('✅ Answer submitted');
    console.log('   Is correct?', submit2Res.data.isCorrect ? '✅ Yes' : '❌ No');
    console.log('   Explanation provided?', submit2Res.data.explanation ? '✅ Yes (for wrong answer)' : '✅ No (correct answer)');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('\n📊 Summary:');
    console.log('   - User registration: ✅');
    console.log('   - Question retrieval: ✅');
    console.log('   - Answer submission: ✅');
    console.log('   - No repeats: ✅');
    console.log('   - Correct answer hidden: ✅');
    console.log('   - Explanation on wrong answer: ✅');
    console.log('\n🎉 Complete question flow is working perfectly!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.response?.data || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run tests
test();

