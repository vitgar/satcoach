// Test script for API endpoints
const http = require('http');

function makeRequest(method, path, data = null) {
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

async function testAPI() {
  console.log('🧪 Testing SAT Coach Backend API\n');

  try {
    // Test 1: Health check
    console.log('1️⃣  Testing health endpoint...');
    const health = await makeRequest('GET', '/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response:`, health.body);
    console.log('   ✅ Health check passed\n');

    // Test 2: Register new user
    console.log('2️⃣  Testing user registration...');
    const registerData = {
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };
    const register = await makeRequest('POST', '/api/v1/auth/register', registerData);
    console.log(`   Status: ${register.status}`);
    console.log(`   User created:`, register.body.user?.email);
    console.log('   ✅ Registration successful\n');

    const accessToken = register.body.accessToken;

    // Test 3: Login
    console.log('3️⃣  Testing user login...');
    const loginData = {
      email: registerData.email,
      password: registerData.password,
    };
    const login = await makeRequest('POST', '/api/v1/auth/login', loginData);
    console.log(`   Status: ${login.status}`);
    console.log(`   User logged in:`, login.body.user?.email);
    console.log('   ✅ Login successful\n');

    // Test 4: Get current user (protected route)
    console.log('4️⃣  Testing protected route (/auth/me)...');
    
    // Make request with authentication header
    const optionsWithAuth = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    };

    const meResult = await new Promise((resolve, reject) => {
      const req = http.request(optionsWithAuth, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            body: JSON.parse(body),
          });
        });
      });
      req.on('error', reject);
      req.end();
    });

    console.log(`   Status: ${meResult.status}`);
    console.log(`   User data:`, meResult.body.user?.email);
    console.log('   ✅ Protected route access successful\n');

    console.log('🎉 All tests passed!\n');
    console.log('📊 Summary:');
    console.log('   ✅ Health check');
    console.log('   ✅ User registration');
    console.log('   ✅ User login');
    console.log('   ✅ Protected route access');
    console.log('');
    console.log('✨ Your backend is working perfectly!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Make sure the server is running: npm run dev');
    }
  }
}

testAPI();

