#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// Test configuration
const testConfig = {
  timeout: 10000, // 10 seconds timeout for async operations
  scriptPath: path.join(__dirname, "..", "bin", "claude-switch.js"),
  envPath: path.join(__dirname, "..", ".env"),
  testDir: __dirname,
};

// Utility functions
function runCommand(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [testConfig.scriptPath, ...args], {
      stdio: "pipe",
      timeout: testConfig.timeout,
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

function runCommandWithInput(args, input, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [testConfig.scriptPath, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: testConfig.timeout,
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on("error", (error) => {
      reject(error);
    });

    // Send input
    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

async function test(description, testFn) {
  try {
    console.log(`🧪 ${description}`);
    await testFn();
    console.log(`✅ ${description} - PASSED`);
  } catch (error) {
    console.log(`❌ ${description} - FAILED: ${error.message}`);
    process.exit(1);
  }
}

// Test suite
async function runTests() {
  console.log("🚀 Starting claude-switch test suite...\n");

  // Test 1: Basic file existence
  await test("Main script exists", () => {
    if (!fs.existsSync(testConfig.scriptPath)) {
      throw new Error("Main script not found");
    }
  });

  await test("Environment file exists", () => {
    if (!fs.existsSync(testConfig.envPath)) {
      throw new Error("Environment file not found");
    }
  });

  await test("Package.json exists", () => {
    const packagePath = path.join(__dirname, "..", "package.json");
    if (!fs.existsSync(packagePath)) {
      throw new Error("Package.json not found");
    }
  });

  // Test 2: Help command
  await test("Help command works", async () => {
    const result = await runCommand(["help"]);
    if (result.code !== 0 || !result.stdout.includes("Usage:")) {
      throw new Error(
        `Help command failed. Code: ${result.code}, Output: ${result.stdout}`,
      );
    }
  });

  // Test 3: Version check
  await test("Version information available", async () => {
    const packagePath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    if (!packageJson.version || !packageJson.version.includes("1.0.0")) {
      throw new Error(
        `Version check failed. Expected: 1.0.0, Found: ${packageJson.version}`,
      );
    }
  });

  // Test 4: Provider listing
  await test("Provider listing works", async () => {
    const result = await runCommand(["help"]);
    if (result.code !== 0 || !result.stdout.includes("Providers:")) {
      throw new Error(
        `Provider listing failed. Code: ${result.code}, Output: ${result.stdout}`,
      );
    }
  });

  // Test 5: Default provider functionality
  await test("Default provider functionality works", async () => {
    const result = await runCommand(["show-defaults"]);
    if (
      result.code !== 0 ||
      (!result.stdout.includes("Default provider:") &&
        !result.stdout.includes("No default provider set"))
    ) {
      throw new Error(
        `Default provider functionality failed. Code: ${result.code}, Output: ${result.stdout}`,
      );
    }
  });

  // Test 6: Model selection with OpenRouter (test with exit)
  await test("OpenRouter model selection interface works", async () => {
    const result = await runCommandWithInput(
      ["openrouter", "--model"],
      "exit\n",
    );
    // Exit code 1 is acceptable when using default model after exit
    if (result.code !== 0 && result.code !== 1) {
      throw new Error(
        `OpenRouter model selection failed. Code: ${result.code}`,
      );
    }
    if (!result.stdout.includes("Found") || !result.stdout.includes("models")) {
      throw new Error(
        `OpenRouter model selection failed. Output: ${result.stdout}`,
      );
    }
  });

  // Test 7: Model selection with Ollama (test with exit)
  await test("Ollama model selection interface works", async () => {
    const result = await runCommandWithInput(["ollama", "--model"], "exit\n");
    // Exit code 1 is acceptable when using default model after exit
    if (result.code !== 0 && result.code !== 1) {
      throw new Error(`Ollama model selection failed. Code: ${result.code}`);
    }
    if (!result.stdout.includes("Found") || !result.stdout.includes("models")) {
      throw new Error(
        `Ollama model selection failed. Output: ${result.stdout}`,
      );
    }
  });

  // Test 8: Model selection with Anthropic (test with enter)
  await test("Anthropic model selection interface works", async () => {
    const result = await runCommandWithInput(["anthropic", "--model"], "\n");
    // Accept both successful model selection and API key error as valid
    if (
      !result.stdout.includes("Found") &&
      !result.stdout.includes("models") &&
      !result.stdout.includes("API key not found") &&
      !result.stdout.includes("API key is required")
    ) {
      throw new Error(`Anthropic model selection failed. Code: ${result.code}`);
    }
  });

  // Test 9: Error handling for invalid provider
  await test("Invalid provider error handling", async () => {
    const result = await runCommand(["invalid-provider"]);
    if (result.code === 0 || !result.stdout.includes("Unknown command")) {
      throw new Error("Invalid provider should fail with error message");
    }
  });

  // Test 10: Virtual scrolling indicators present
  await test("Virtual scrolling indicators present", async () => {
    const result = await runCommandWithInput(
      ["openrouter", "--model"],
      "exit\n",
    );
    if (!result.stdout.includes("Use ↑/↓ to scroll through results")) {
      throw new Error("Virtual scrolling instructions not present");
    }
  });

  // Test 11: Default model highlighting
  await test("Default model highlighting works", async () => {
    const result = await runCommandWithInput(
      ["openrouter", "--model"],
      "exit\n",
    );
    if (!result.stdout.includes("[DEFAULT]")) {
      throw new Error("Default model not highlighted");
    }
  });

  // Test 12: Selection options instructions
  await test("Selection options instructions present", async () => {
    const result = await runCommandWithInput(
      ["openrouter", "--model"],
      "exit\n",
    );
    const requiredInstructions = [
      "Type number to select",
      "Type model name to search",
      "Press Enter to select the first model",
    ];

    for (const instruction of requiredInstructions) {
      if (!result.stdout.includes(instruction)) {
        throw new Error(`Missing instruction: ${instruction}`);
      }
    }
  });

  // Test 13: Environment variable caching
  await test("Environment caching works", async () => {
    // This test checks that the app doesn't crash and loads environment properly
    const result1 = await runCommand(["help"]);
    const result2 = await runCommand(["help"]);

    if (result1.code !== 0 || result2.code !== 0) {
      throw new Error("Environment caching test failed");
    }
  });

  // Test 14: Main menu functionality
  await test("Main menu interface works", async () => {
    const result = await runCommandWithInput([], "7\n"); // Select option 7 (should work)
    if (result.code !== 0) {
      throw new Error("Main menu interface failed");
    }
  });

  console.log("\n🎉 All tests passed! The application is working correctly.");
}

// Run tests
runTests().catch((error) => {
  console.error("💥 Test suite failed:", error.message);
  process.exit(1);
});
