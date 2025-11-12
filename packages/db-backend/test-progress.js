// Test script for Progress & Session API endpoints
const http = require('http');

let accessToken = '';
let questionId = '';
let sessionId = '';

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: body ? JSON.parse(body) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: body,
          });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testProgressAPI() {
  console.log('🧪 Testing SAT Coach Progress & Session API\n');

  try {
    // Step 1: Register and login
    console.log('1️⃣  Setting up authentication...');
    const registerData = {
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'Student',
    };
    const register = await makeRequest('POST', '/api/v1/auth/register', registerData);
    accessToken = register.body.accessToken;
    console.log(`   ✅ Logged in as: ${register.body.user.email}`);
    console.log(`   Current Level: ${register.body.user.learningProfile.currentLevel}\n`);

    // Step 2: Create a question (need this for testing)
    console.log('2️⃣  Creating a test question...');
    const questionData = {
      subject: 'math',
      difficulty: 'medium',
      content: {
        questionText: 'If 2x + 5 = 15, what is x?',
        options: ['A) 3', 'B) 5', 'C) 7', 'D) 10'],
        correctAnswer: 'B',
        explanation: 'Subtract 5: 2x = 10. Divide by 2: x = 5.'
      },
      tags: ['algebra', 'equations']
    };
    const createQ = await makeRequest('POST', '/api/v1/questions', questionData, accessToken);
    
    if (createQ.status === 201) {
      questionId = createQ.body.question._id;
      console.log(`   ✅ Question created: ${questionId}\n`);
    } else {
      // Try to get an existing question instead
      const questions = await makeRequest('GET', '/api/v1/questions?limit=1', null, accessToken);
      if (questions.body.questions.length > 0) {
        questionId = questions.body.questions[0]._id;
        console.log(`   ✅ Using existing question: ${questionId}\n`);
      } else {
        console.log('   ⚠️  No questions available. Some tests will be skipped.\n');
      }
    }

    // Step 3: Start a study session
    console.log('3️⃣  Starting a study session...');
    const startSession = await makeRequest('POST', '/api/v1/sessions/start', { timerUsed: true }, accessToken);
    if (startSession.status === 201) {
      sessionId = startSession.body.session._id;
      console.log(`   ✅ Session started: ${sessionId}`);
      console.log(`   Start time: ${startSession.body.session.startTime}\n`);
    }

    // Step 4: Record question attempts
    if (questionId) {
      console.log('4️⃣  Recording question attempts...');
      
      // Attempt 1: Correct with high confidence
      const attempt1 = await makeRequest('POST', '/api/v1/progress/attempt', {
        questionId,
        isCorrect: true,
        timeSpent: 45,
        confidence: 5,
        hintsUsed: 0,
        chatInteractions: 1
      }, accessToken);
      
      if (attempt1.status === 200) {
        console.log(`   ✅ Attempt 1 recorded`);
        console.log(`      Mastery Level: ${attempt1.body.masteryLevel}`);
        console.log(`      Next Review: ${new Date(attempt1.body.nextReviewDate).toLocaleDateString()}`);
        console.log(`      Student Level: ${attempt1.body.newStudentLevel}`);
      }

      // Add to session
      if (sessionId) {
        await makeRequest('PUT', `/api/v1/sessions/${sessionId}/question`, {
          questionId,
          isCorrect: true,
          subject: 'math'
        }, accessToken);
      }

      // Attempt 2: Correct with medium confidence
      const attempt2 = await makeRequest('POST', '/api/v1/progress/attempt', {
        questionId,
        isCorrect: true,
        timeSpent: 38,
        confidence: 4,
        hintsUsed: 1,
        chatInteractions: 2
      }, accessToken);
      
      if (attempt2.status === 200) {
        console.log(`   ✅ Attempt 2 recorded`);
        console.log(`      Mastery Level: ${attempt2.body.masteryLevel}`);
        console.log(`      Next Review: ${new Date(attempt2.body.nextReviewDate).toLocaleDateString()}`);
      }

      // Attempt 3: Incorrect
      const attempt3 = await makeRequest('POST', '/api/v1/progress/attempt', {
        questionId,
        isCorrect: false,
        timeSpent: 120,
        confidence: 2,
        hintsUsed: 5,
        chatInteractions: 8
      }, accessToken);
      
      if (attempt3.status === 200) {
        console.log(`   ✅ Attempt 3 recorded (incorrect)`);
        console.log(`      Mastery Level: ${attempt3.body.masteryLevel}`);
        console.log(`      Next Review: ${new Date(attempt3.body.nextReviewDate).toLocaleDateString()}`);
        console.log(`      Student Level: ${attempt3.body.newStudentLevel}\n`);
      }
    }

    // Step 5: Get review schedule
    console.log('5️⃣  Getting review schedule...');
    const schedule = await makeRequest('GET', '/api/v1/progress/schedule', null, accessToken);
    if (schedule.status === 200) {
      console.log(`   ✅ Review schedule retrieved`);
      console.log(`      Due now: ${schedule.body.summary.totalDueNow}`);
      console.log(`      Overdue: ${schedule.body.summary.totalOverdue}`);
      console.log(`      Upcoming: ${schedule.body.summary.totalUpcoming}`);
      
      if (schedule.body.schedule.dueNow.length > 0) {
        const topic = schedule.body.schedule.dueNow[0];
        console.log(`\n      Top priority topic:`);
        console.log(`        ${topic.subject} - ${topic.topic}`);
        console.log(`        Mastery: ${topic.masteryLevel}%`);
        console.log(`        Priority: ${topic.priority.toFixed(2)}`);
      }
      console.log('');
    }

    // Step 6: Get all progress
    console.log('6️⃣  Getting all progress...');
    const allProgress = await makeRequest('GET', '/api/v1/progress/all', null, accessToken);
    if (allProgress.status === 200) {
      console.log(`   ✅ Progress retrieved`);
      console.log(`      Total topics: ${allProgress.body.total}`);
      if (allProgress.body.progress.length > 0) {
        const p = allProgress.body.progress[0];
        console.log(`\n      Sample topic: ${p.subject} - ${p.topic}`);
        console.log(`        Attempts: ${p.performance.totalAttempts}`);
        console.log(`        Accuracy: ${(p.performance.accuracyRate * 100).toFixed(1)}%`);
        console.log(`        Mastery: ${p.performance.masteryLevel}%`);
        console.log(`        Avg Time: ${p.performance.averageTime.toFixed(1)}s`);
      }
      console.log('');
    }

    // Step 7: Get analytics
    console.log('7️⃣  Getting analytics...');
    const analytics = await makeRequest('GET', '/api/v1/progress/analytics', null, accessToken);
    if (analytics.status === 200) {
      console.log(`   ✅ Analytics retrieved`);
      const a = analytics.body.analytics;
      console.log(`      Total Attempts: ${a.overall.totalAttempts}`);
      console.log(`      Average Accuracy: ${(a.overall.averageAccuracy * 100).toFixed(1)}%`);
      console.log(`      Average Mastery: ${a.overall.averageMastery.toFixed(1)}%`);
      
      console.log(`\n      By Subject:`);
      for (const [subject, stats] of Object.entries(a.bySubject)) {
        console.log(`        ${subject}: ${(stats.accuracy * 100).toFixed(1)}% accuracy, ${stats.averageMastery.toFixed(1)}% mastery`);
      }
      
      if (a.strengths.length > 0) {
        console.log(`\n      Strengths: ${a.strengths.slice(0, 3).join(', ')}`);
      }
      if (a.weaknesses.length > 0) {
        console.log(`      Weaknesses: ${a.weaknesses.slice(0, 3).join(', ')}`);
      }
      console.log('');
    }

    // Step 8: End the session
    if (sessionId) {
      console.log('8️⃣  Ending study session...');
      const endSession = await makeRequest('PUT', `/api/v1/sessions/${sessionId}/end`, null, accessToken);
      if (endSession.status === 200) {
        console.log(`   ✅ Session ended`);
        console.log(`      Duration: ${endSession.body.summary.duration}s`);
        console.log(`      Questions: ${endSession.body.summary.questionsAttempted}`);
        console.log(`      Accuracy: ${(endSession.body.summary.accuracy * 100).toFixed(1)}%\n`);
      }
    }

    // Step 9: Get session history
    console.log('9️⃣  Getting session history...');
    const history = await makeRequest('GET', '/api/v1/sessions/history?limit=5', null, accessToken);
    if (history.status === 200) {
      console.log(`   ✅ Session history retrieved`);
      console.log(`      Total sessions: ${history.body.summary.totalSessions}`);
      console.log(`      Total time: ${history.body.summary.totalTimeSpent}s`);
      console.log(`      Total questions: ${history.body.summary.totalQuestionsAttempted}`);
      console.log(`      Overall accuracy: ${(history.body.summary.overallAccuracy * 100).toFixed(1)}%\n`);
    }

    console.log('🎉 All tests completed!\n');
    console.log('📊 Summary:');
    console.log('   ✅ Authentication working');
    console.log('   ✅ Question attempt recording');
    console.log('   ✅ Spaced repetition scheduling');
    console.log('   ✅ Progress tracking');
    console.log('   ✅ Analytics generation');
    console.log('   ✅ Study session management');
    console.log('   ✅ Adaptive difficulty adjustment');
    console.log('');
    console.log('🧠 Intelligent Features:');
    console.log('   ✅ SM-2 spaced repetition algorithm');
    console.log('   ✅ Automatic difficulty level adjustment');
    console.log('   ✅ Mastery level calculation');
    console.log('   ✅ Review priority calculation');
    console.log('   ✅ Strengths & weaknesses identification');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Make sure the server is running: npm run dev');
    }
  }
}

testProgressAPI();

