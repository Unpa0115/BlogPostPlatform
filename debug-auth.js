// 認証システムデバッグ用テストスクリプト
// 使用方法: node debug-auth.js

const BASE_URL = process.env.RAILWAY_URL || 'https://blogpostplatform-production.up.railway.app';

async function testDatabaseConnection() {
  console.log('=== Testing Database Connection ===');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'test-db' })
    });
    
    const result = await response.json();
    console.log('Database test result:', JSON.stringify(result, null, 2));
    
    // 詳細なデータベース情報を取得
    if (result.success && result.database) {
      console.log('Database details:', result.database);
    }
    
    return result;
  } catch (error) {
    console.error('Database test failed:', error);
    return null;
  }
}

async function initializeDatabase() {
  console.log('=== Initializing Database ===');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'init-db' })
    });
    
    const result = await response.json();
    console.log('Database initialization result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return null;
  }
}

async function testRegistration(email, password) {
  console.log('=== Testing Registration ===');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });
    
    const result = await response.json();
    console.log('Registration result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Registration test failed:', error);
    return null;
  }
}

async function testLogin(email, password) {
  console.log('=== Testing Login ===');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });
    
    const result = await response.json();
    console.log('Login result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Login test failed:', error);
    return null;
  }
}

async function runTests() {
  console.log('Starting authentication system tests...');
  console.log('Base URL:', BASE_URL);
  
  // 1. データベース接続テスト
  const dbTest = await testDatabaseConnection();
  if (!dbTest || dbTest.status === 'error') {
    console.error('Database connection failed, stopping tests');
    return;
  }
  
  // 2. データベース初期化
  const initResult = await initializeDatabase();
  if (!initResult || !initResult.success) {
    console.error('Database initialization failed, stopping tests');
    return;
  }
  
  // 3. テスト用ユーザー情報
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'testpassword123';
  
  // 4. 登録テスト
  const registrationResult = await testRegistration(testEmail, testPassword);
  if (!registrationResult || !registrationResult.success) {
    console.error('Registration failed');
    return;
  }
  
  // 5. ログインテスト
  const loginResult = await testLogin(testEmail, testPassword);
  if (!loginResult || !loginResult.success) {
    console.error('Login failed');
    return;
  }
  
  console.log('=== All Tests Passed ===');
}

// スクリプト実行
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testDatabaseConnection,
  initializeDatabase,
  testRegistration,
  testLogin,
  runTests
}; 