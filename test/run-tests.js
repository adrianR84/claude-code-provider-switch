#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

console.log("🧪 Running complete claude-switch test suite...\n");

// Test files in order
const testFiles = [
  { name: "Validation & Error Tests", file: "test-validation-errors.js" },
  { name: "Ollama Provider Tests", file: "test-ollama-provider.js" },
  { name: "Comprehensive Integration Tests", file: "test-comprehensive.js" },
];

let currentTest = 0;

function runNextTest() {
  if (currentTest >= testFiles.length) {
    console.log("\n🎉 All test suites passed!");
    console.log("\n📊 Test Coverage Summary:");
    console.log("  ✅ Constants and configuration");
    console.log("  ✅ Error handling and validation");
    console.log("  ✅ Provider-specific functionality");
    console.log("  ✅ Integration and end-to-end tests");
    console.log("  ✅ Cache and performance tests");
    console.log("  ✅ Environment and configuration tests");
    process.exit(0);
    return;
  }

  const test = testFiles[currentTest];
  console.log(`📋 Running ${test.name}...`);

  const testProcess = spawn("node", [path.join(__dirname, test.file)], {
    stdio: "inherit",
  });

  testProcess.on("close", (code) => {
    if (code === 0) {
      console.log(`✅ ${test.name} passed!\n`);
      currentTest++;
      runNextTest();
    } else {
      console.log(`\n❌ ${test.name} failed!`);
      process.exit(1);
    }
  });

  testProcess.on("error", (error) => {
    console.log(`\n💥 Failed to run ${test.name}: ${error.message}`);
    process.exit(1);
  });
}

// Start running tests
runNextTest();
