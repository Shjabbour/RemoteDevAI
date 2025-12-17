#!/usr/bin/env node
/**
 * Test script to verify the desktop agent is working correctly
 * Run with: node test-server.js
 */

import { spawn } from 'child_process';
import http from 'http';
import { io } from 'socket.io-client';

const PORT = process.env.PORT || 3456;
const HOST = 'localhost';
const BASE_URL = `http://${HOST}:${PORT}`;

let serverProcess = null;
let testsPassed = 0;
let testsFailed = 0;

console.log('================================================');
console.log('RemoteDevAI Desktop Agent - Test Suite');
console.log('================================================\n');

// Start the server
async function startServer() {
  return new Promise((resolve, reject) => {
    console.log('[1/6] Starting server...');

    serverProcess = spawn('node', ['src/server.js'], {
      env: { ...process.env, PORT },
      stdio: 'pipe'
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server started on port')) {
        console.log('✅ Server started successfully\n');
        testsPassed++;
        setTimeout(resolve, 1000); // Wait a bit for server to fully initialize
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    serverProcess.on('error', (error) => {
      console.error('❌ Failed to start server:', error.message);
      testsFailed++;
      reject(error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Server failed to start within 10 seconds'));
    }, 10000);
  });
}

// Test health endpoint
async function testHealthEndpoint() {
  console.log('[2/6] Testing health endpoint...');

  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}/api/health`, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const health = JSON.parse(data);

          if (health.status === 'ok' && health.uptime !== undefined) {
            console.log('✅ Health endpoint working');
            console.log(`   Status: ${health.status}`);
            console.log(`   Uptime: ${Math.floor(health.uptime)}s`);
            console.log(`   Platform: ${health.platform}\n`);
            testsPassed++;
            resolve();
          } else {
            console.error('❌ Health endpoint returned invalid data\n');
            testsFailed++;
            reject(new Error('Invalid health data'));
          }
        } catch (error) {
          console.error('❌ Failed to parse health response:', error.message, '\n');
          testsFailed++;
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error('❌ Health endpoint request failed:', error.message, '\n');
      testsFailed++;
      reject(error);
    });
  });
}

// Test WebSocket connection
async function testWebSocketConnection() {
  console.log('[3/6] Testing WebSocket connection...');

  return new Promise((resolve, reject) => {
    const socket = io(BASE_URL, {
      transports: ['websocket']
    });

    const timeout = setTimeout(() => {
      socket.close();
      console.error('❌ WebSocket connection timeout\n');
      testsFailed++;
      reject(new Error('WebSocket connection timeout'));
    }, 5000);

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      testsPassed++;
    });

    socket.on('connected', (data) => {
      console.log(`   Session ID: ${data.sessionId}`);
      console.log(`   Hostname: ${data.hostname}\n`);
      clearTimeout(timeout);
      socket.close();
      resolve();
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      console.error('❌ WebSocket connection error:', error.message, '\n');
      testsFailed++;
      socket.close();
      reject(error);
    });
  });
}

// Test command endpoint
async function testCommandEndpoint() {
  console.log('[4/6] Testing command endpoint...');

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ command: 'test command' });

    const options = {
      hostname: HOST,
      port: PORT,
      path: '/api/send-command',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (response.success) {
            console.log('✅ Command endpoint working');
            console.log(`   Message: ${response.message}\n`);
            testsPassed++;
            resolve();
          } else {
            console.error('❌ Command endpoint returned error\n');
            testsFailed++;
            reject(new Error('Command endpoint error'));
          }
        } catch (error) {
          console.error('❌ Failed to parse command response:', error.message, '\n');
          testsFailed++;
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Command endpoint request failed:', error.message, '\n');
      testsFailed++;
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Test working directory endpoints
async function testWorkingDirectoryEndpoints() {
  console.log('[5/6] Testing working directory endpoints...');

  return new Promise((resolve, reject) => {
    // Test GET /api/cwd
    http.get(`${BASE_URL}/api/cwd`, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (response.cwd && response.home) {
            console.log('✅ Working directory endpoints working');
            console.log(`   CWD: ${response.cwd}`);
            console.log(`   Home: ${response.home}\n`);
            testsPassed++;
            resolve();
          } else {
            console.error('❌ Working directory endpoint returned invalid data\n');
            testsFailed++;
            reject(new Error('Invalid working directory data'));
          }
        } catch (error) {
          console.error('❌ Failed to parse working directory response:', error.message, '\n');
          testsFailed++;
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error('❌ Working directory endpoint request failed:', error.message, '\n');
      testsFailed++;
      reject(error);
    });
  });
}

// Test static file serving
async function testStaticFiles() {
  console.log('[6/6] Testing static file serving...');

  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}/`, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (data.includes('RemoteDevAI Desktop Agent')) {
          console.log('✅ Static files serving correctly\n');
          testsPassed++;
          resolve();
        } else {
          console.error('❌ Static files not serving correctly\n');
          testsFailed++;
          reject(new Error('Static files error'));
        }
      });
    }).on('error', (error) => {
      console.error('❌ Static files request failed:', error.message, '\n');
      testsFailed++;
      reject(error);
    });
  });
}

// Stop the server
function stopServer() {
  if (serverProcess) {
    console.log('Stopping server...');
    serverProcess.kill();
    serverProcess = null;
  }
}

// Run all tests
async function runTests() {
  try {
    await startServer();
    await testHealthEndpoint();
    await testWebSocketConnection();
    await testCommandEndpoint();
    await testWorkingDirectoryEndpoints();
    await testStaticFiles();

    console.log('================================================');
    console.log('Test Results');
    console.log('================================================');
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📊 Total:  ${testsPassed + testsFailed}`);
    console.log('================================================\n');

    if (testsFailed === 0) {
      console.log('🎉 All tests passed! Desktop agent is working correctly.\n');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed. Please check the errors above.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message, '\n');
    process.exit(1);
  } finally {
    stopServer();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\nTests interrupted by user\n');
  stopServer();
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n\nTests terminated\n');
  stopServer();
  process.exit(1);
});

// Run the tests
runTests();
