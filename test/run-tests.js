#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Running claude-switch test suite...\n');

// Run basic tests
console.log('📋 Running basic tests...');
const basicTests = spawn('node', [path.join(__dirname, 'test.js')], {
  stdio: 'inherit'
});

basicTests.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Basic tests passed!\n');
    
    // Run comprehensive tests
    console.log('📋 Running comprehensive tests...');
    const comprehensiveTests = spawn('node', [path.join(__dirname, 'test-comprehensive.js')], {
      stdio: 'inherit'
    });
    
    comprehensiveTests.on('close', (compCode) => {
      if (compCode === 0) {
        console.log('\n🎉 All test suites passed!');
        process.exit(0);
      } else {
        console.log('\n❌ Comprehensive tests failed!');
        process.exit(1);
      }
    });
  } else {
    console.log('\n❌ Basic tests failed!');
    process.exit(1);
  }
});
