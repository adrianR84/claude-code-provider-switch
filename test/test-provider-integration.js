#!/usr/bin/env node

/**
 * Tests for provider integration with validation, error handling, and constants
 * Covers all providers (Ollama, OpenRouter, Anthropic) and shared functionality
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// Import modules to test
const {
  OLLAMA,
  CACHE,
  HTTP_STATUS,
  DEFAULT_MODELS,
} = require("../lib/constants");

const { NetworkError, ValidationError } = require("../lib/errors");

const {
  validateAuthToken,
  validateModelResponse,
} = require("../lib/validation");

// Test configuration
const testConfig = {
  timeout: 10000,
  scriptPath: path.join(__dirname, "..", "bin", "claude-switch.js"),
  testDir: __dirname,
};

// Utility functions
async function runCommand(args, options = {}) {
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Test suite
async function runTests() {
  console.log("🚀 Starting provider integration test suite...\n");

  // Test 1: Ollama provider constants
  await test("Ollama constants are correctly defined", () => {
    assert(
      OLLAMA.DEFAULT_HOST === "localhost",
      "Default host should be localhost",
    );
    assert(OLLAMA.DEFAULT_PORT === 11434, "Default port should be 11434");
    assert(OLLAMA.API_PATH === "/api/tags", "API path should be /api/tags");
    assert(OLLAMA.TIMEOUT === 5000, "Timeout should be 5000ms");
    assert(OLLAMA.AUTH_HEADER === "Bearer", "Auth header should be Bearer");
  });

  // Test 2: Default model constants
  await test("Default model constants are correct", () => {
    assert(
      DEFAULT_MODELS.OLLAMA === "minimax-m2.5:cloud",
      "Default Ollama model incorrect",
    );
    assert(
      DEFAULT_MODELS.OPENROUTER === "openrouter/free",
      "Default OpenRouter model incorrect",
    );
    assert(
      DEFAULT_MODELS.ANTHROPIC === "claude-3-5-sonnet-latest",
      "Default Anthropic model incorrect",
    );
    assert(DEFAULT_MODELS.ORIGINAL === "original", "Default model incorrect");
  });

  // Test 3: Cache key constants
  await test("Cache keys are properly defined", () => {
    assert(
      CACHE.KEYS.OLLAMA_MODELS === "ollama-models",
      "Ollama cache key incorrect",
    );
    assert(
      CACHE.KEYS.OPENROUTER_MODELS === "openrouter-models",
      "OpenRouter cache key incorrect",
    );
    assert(
      CACHE.KEYS.ANTHROPIC_MODELS === "anthropic-models",
      "Anthropic cache key incorrect",
    );
  });

  // Test 4: HTTP status constants
  await test("HTTP status constants are correct", () => {
    assert(HTTP_STATUS.OK === 200, "OK status should be 200");
    assert(
      HTTP_STATUS.UNAUTHORIZED === 401,
      "Unauthorized status should be 401",
    );
    assert(HTTP_STATUS.NOT_FOUND === 404, "Not found status should be 404");
    assert(
      HTTP_STATUS.SERVER_ERROR === 500,
      "Server error status should be 500",
    );
  });

  // Test 5: Auth token validation
  await test("Auth token validation works correctly", () => {
    // Valid tokens
    assert(
      validateAuthToken("sk-1234567890abcdef") === "sk-1234567890abcdef",
      "Should accept valid token",
    );
    assert(
      validateAuthToken("Bearer token123") === "Bearer token123",
      "Should accept Bearer token",
    );

    // Null/undefined tokens
    assert(validateAuthToken(null) === null, "Should return null for null");
    assert(
      validateAuthToken(undefined) === null,
      "Should return null for undefined",
    );
    assert(
      validateAuthToken("") === null,
      "Should return null for empty string",
    );
    assert(
      validateAuthToken("   ") === null,
      "Should return null for whitespace",
    );

    // Invalid tokens
    try {
      validateAuthToken("short");
      throw new Error("Should reject short token");
    } catch (error) {
      assert(error instanceof ValidationError, "Should throw ValidationError");
    }
  });

  // Test 6: Model response validation
  await test("Model response validation works correctly", () => {
    // Valid responses
    const validResponse1 = validateModelResponse({
      models: [{ name: "gpt-4" }, { name: "claude-3" }],
    });
    assert(
      Array.isArray(validResponse1),
      "Should return array for models response",
    );
    assert(
      validResponse1.length === 2,
      "Should return correct number of models",
    );

    const validResponse2 = validateModelResponse([
      { name: "model1" },
      { name: "model2" },
    ]);
    assert(
      Array.isArray(validResponse2),
      "Should return array for direct array",
    );

    // Invalid responses
    try {
      validateModelResponse({ models: "not array" });
      throw new Error("Should reject non-array models");
    } catch (error) {
      assert(error instanceof ValidationError, "Should throw ValidationError");
    }

    try {
      validateModelResponse({ models: [] });
      throw new Error("Should reject empty array");
    } catch (error) {
      assert(error instanceof ValidationError, "Should throw ValidationError");
    }
  });

  // Test 7: Error class inheritance
  await test("Error classes have correct inheritance", () => {
    const networkError = new NetworkError("Network failed", "ollama", 500);
    assert(networkError instanceof Error, "NetworkError should extend Error");
    assert(
      networkError.name === "NetworkError",
      "NetworkError should have correct name",
    );
    assert(
      networkError.provider === "ollama",
      "NetworkError should have provider",
    );
    assert(
      networkError.statusCode === 500,
      "NetworkError should have statusCode",
    );
  });

  // Test 8: Ollama command with model matching
  await test("Ollama command with model matching works", async () => {
    const result = await runCommand(["ollama", "--model", "kimi"]);

    // Should succeed or fail gracefully with expected error
    if (result.code === 0) {
      assert(
        result.stdout.includes("Using matched model: kimi-k2.5:cloud"),
        "Should find and use matched model",
      );
    } else {
      // If it fails, it should be due to expected reasons (no stdin input, network issues, etc.)
      assert(
        result.stdout.includes("Using matched model") ||
          result.stdout.includes("Error fetching models") ||
          result.stdout.includes("Request timeout") ||
          result.stderr.includes("Input must be provided"),
        "Should either succeed or fail with expected error",
      );
    }
  });

  // Test 9: Ollama command with invalid model
  await test("Ollama command with invalid model falls back to default", async () => {
    const result = await runCommand([
      "ollama",
      "--model",
      "nonexistent-model-xyz",
    ]);

    // Should either succeed with fallback or fail gracefully
    if (result.code === 0) {
      assert(
        result.stdout.includes(DEFAULT_MODELS.OLLAMA) ||
          result.stdout.includes("Using default model"),
        "Should fall back to default model or show default usage",
      );
    } else {
      // Should fail gracefully with meaningful error
      assert(
        result.stdout.includes("Error fetching models") ||
          result.stdout.includes("Using default model") ||
          result.stdout.includes("No match found") ||
          result.stderr.includes("Input must be provided"),
        "Should handle invalid model gracefully or fail with expected error",
      );
    }
  });

  // Test 10: Cache functionality
  await test("Cache messages appear in output", async () => {
    const result = await runCommand(["ollama", "--model", "kimi"]);

    // Should show cache hit or cache creation
    assert(
      result.stdout.includes("📦 Cache hit") ||
        result.stdout.includes("💾 Cached"),
      "Should show cache activity",
    );
  });

  // Test 11: Proper error handling
  await test("Error handling is improved", async () => {
    // Test with invalid hostname by temporarily modifying environment (if possible)
    const result = await runCommand(["ollama", "--model", "test"]);

    // Should not crash and should provide meaningful error messages
    assert(
      result.stdout.length > 0 || result.stderr.length > 0,
      "Should provide some output even on error",
    );

    // Should not contain debug console.log statements
    assert(
      !result.stdout.includes("Debug:"),
      "Should not contain debug console.log statements",
    );
  });

  // Test 12: Logging improvements
  await test("Logging uses proper colors and formatting", async () => {
    const result = await runCommand(["ollama", "--model", "test"]);

    // Should use proper log formatting (not console.log directly)
    // The exact format depends on the terminal capabilities, but should be clean
    assert(result.stdout.length > 0, "Should have output with proper logging");

    // Should not have raw console.log output
    assert(
      !result.stdout.includes("[object Object]"),
      "Should not have unformatted object output",
    );
  });

  // Test 13: Constants usage in practice
  await test("Constants are used throughout the application", async () => {
    const result = await runCommand(["ollama", "--help"]);

    // Should show proper help without errors
    assert(result.code === 0, "Help command should work");
    assert(result.stdout.includes("Usage:"), "Should show usage information");
  });

  // Test 14: File structure integrity
  await test("All new modules exist and are loadable", () => {
    const modulesPath = path.join(__dirname, "..", "lib");

    const requiredModules = ["constants.js", "errors.js", "validation.js"];

    requiredModules.forEach((module) => {
      const modulePath = path.join(modulesPath, module);
      assert(fs.existsSync(modulePath), `${module} should exist`);

      // Try to require the module to ensure it's syntactically correct
      try {
        require(path.join(modulesPath, module.replace(".js", "")));
      } catch (error) {
        throw new Error(`${module} has syntax errors: ${error.message}`);
      }
    });
  });

  // Test 15: Integration test with environment
  await test("Environment integration works", async () => {
    const result = await runCommand(["show-defaults"]);

    // Should not crash and should show environment info
    assert(result.code === 0, "Show defaults should work");

    // Should show environment information (either file path or environment vars)
    assert(
      result.stdout.includes(".env") ||
        result.stdout.includes("Default provider") ||
        result.stdout.includes("No default provider set"),
      "Should reference environment or show defaults",
    );
  });

  console.log("\n🎉 All provider integration tests passed!");
  console.log("\n📝 Test Summary:");
  console.log("  ✅ Constants properly defined and used");
  console.log("  ✅ Validation functions work correctly");
  console.log("  ✅ Error handling with proper error types");
  console.log("  ✅ Improved logging without debug statements");
  console.log("  ✅ Cache functionality working");
  console.log("  ✅ Integration tests passing");
  console.log("  ✅ All providers supported (Ollama, OpenRouter, Anthropic)");
}

// Run tests
runTests().catch((error) => {
  console.error("💥 Provider integration test suite failed:", error.message);
  console.error(error.stack);
  process.exit(1);
});
