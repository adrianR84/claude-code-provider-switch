#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Simple test to verify the script works
console.log('Testing claude-switcher...');

// Test 1: Check if the main script exists
const scriptPath = path.join(__dirname, '..', 'bin', 'claude-switch.js');
if (!fs.existsSync(scriptPath)) {
  console.error('❌ Main script not found');
  process.exit(1);
}
console.log('✅ Main script exists');

// Test 2: Check if .env.openrouter exists
const envPath = path.join(__dirname, '..', '.env.openrouter');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.openrouter file not found');
  process.exit(1);
}
console.log('✅ .env.openrouter file exists');

// Test 3: Test help command
console.log('Testing help command...');
const help = spawn('node', [scriptPath, 'help'], {
  stdio: 'pipe'
});

let helpOutput = '';
help.stdout.on('data', (data) => {
  helpOutput += data.toString();
});

help.on('close', (code) => {
  if (code === 0 && helpOutput.includes('Usage:')) {
    console.log('✅ Help command works');
  } else {
    console.error('❌ Help command failed');
    process.exit(1);
  }
  
  console.log('✅ All tests passed!');
});
