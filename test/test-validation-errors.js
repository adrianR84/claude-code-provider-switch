#!/usr/bin/env node

/**
 * Comprehensive tests for validation, error handling, and constants
 */

const fs = require("fs");
const path = require("path");

// Import modules to test
const {
  OLLAMA,
  OPENROUTER,
  ANTHROPIC,
  CACHE,
  ENV_VARS,
  DEFAULT_MODELS,
  HTTP_STATUS,
} = require("../lib/constants");

const {
  ProviderError,
  NetworkError,
  AuthenticationError,
  ValidationError,
  CacheError,
} = require("../lib/errors");

const {
  validateModelName,
  validateAuthToken,
  validateModelResponse,
  validateHostname,
  validatePort,
} = require("../lib/validation");

const { loadEnvFile } = require("../lib/config");

// Test configuration
const testConfig = {
  testDir: __dirname,
};

// Utility functions
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

function assertThrows(fn, expectedErrorType, message) {
  try {
    fn();
    throw new Error(`Expected ${expectedErrorType.name} to be thrown`);
  } catch (error) {
    if (error.constructor !== expectedErrorType) {
      throw new Error(
        `Expected ${expectedErrorType.name}, got ${error.constructor.name}: ${error.message}`,
      );
    }
  }
}

// Test suite
async function runTests() {
  console.log("🚀 Starting validation, errors, and constants test suite...\n");

  // ========== CONSTANTS TESTS ==========

  await test("Constants module exports all required objects", () => {
    assert(OLLAMA, "OLLAMA constants not exported");
    assert(OPENROUTER, "OPENROUTER constants not exported");
    assert(ANTHROPIC, "ANTHROPIC constants not exported");
    assert(CACHE, "CACHE constants not exported");
    assert(ENV_VARS, "ENV_VARS constants not exported");
    assert(DEFAULT_MODELS, "DEFAULT_MODELS constants not exported");
    assert(HTTP_STATUS, "HTTP_STATUS constants not exported");
  });

  await test("OLLAMA constants have correct values", () => {
    assert(
      OLLAMA.DEFAULT_HOST === "localhost",
      "OLLAMA.DEFAULT_HOST incorrect",
    );
    assert(OLLAMA.DEFAULT_PORT === 11434, "OLLAMA.DEFAULT_PORT incorrect");
    assert(OLLAMA.API_PATH === "/api/tags", "OLLAMA.API_PATH incorrect");
    assert(OLLAMA.TIMEOUT === 5000, "OLLAMA.TIMEOUT incorrect");
    assert(OLLAMA.AUTH_HEADER === "Bearer", "OLLAMA.AUTH_HEADER incorrect");
  });

  await test("Cache constants are properly defined", () => {
    assert(CACHE.TTL === 5 * 60 * 1000, "CACHE.TTL incorrect");
    assert(CACHE.MAX_SIZE === 50, "CACHE.MAX_SIZE incorrect");
    assert(CACHE.MAX_MEMORY === 10 * 1024 * 1024, "CACHE.MAX_MEMORY incorrect");
    assert(
      CACHE.KEYS.OLLAMA_MODELS === "ollama-models",
      "CACHE.KEYS.OLLAMA_MODELS incorrect",
    );
    assert(
      CACHE.KEYS.OPENROUTER_MODELS === "openrouter-models",
      "CACHE.KEYS.OPENROUTER_MODELS incorrect",
    );
    assert(
      CACHE.KEYS.ANTHROPIC_MODELS === "anthropic-models",
      "CACHE.KEYS.ANTHROPIC_MODELS incorrect",
    );
  });

  await test("HTTP status constants are correct", () => {
    assert(HTTP_STATUS.OK === 200, "HTTP_STATUS.OK incorrect");
    assert(
      HTTP_STATUS.UNAUTHORIZED === 401,
      "HTTP_STATUS.UNAUTHORIZED incorrect",
    );
    assert(HTTP_STATUS.FORBIDDEN === 403, "HTTP_STATUS.FORBIDDEN incorrect");
    assert(HTTP_STATUS.NOT_FOUND === 404, "HTTP_STATUS.NOT_FOUND incorrect");
    assert(
      HTTP_STATUS.SERVER_ERROR === 500,
      "HTTP_STATUS.SERVER_ERROR incorrect",
    );
  });

  // ========== ERROR CLASSES TESTS ==========

  await test("ProviderError creates correct error", () => {
    const cause = new Error("Original error");
    const error = new ProviderError("Test message", "test-provider", cause);

    assert(error instanceof Error, "ProviderError should extend Error");
    assert(error.name === "ProviderError", "ProviderError name incorrect");
    assert(error.message === "Test message", "ProviderError message incorrect");
    assert(
      error.provider === "test-provider",
      "ProviderError provider incorrect",
    );
    assert(error.cause === cause, "ProviderError cause incorrect");
  });

  await test("NetworkError creates correct error", () => {
    const error = new NetworkError("Network failed", "ollama", 500);

    assert(
      error instanceof ProviderError,
      "NetworkError should extend ProviderError",
    );
    assert(error.name === "NetworkError", "NetworkError name incorrect");
    assert(error.statusCode === 500, "NetworkError statusCode incorrect");
  });

  await test("ValidationError creates correct error", () => {
    const error = new ValidationError("Invalid input", "model");

    assert(error instanceof Error, "ValidationError should extend Error");
    assert(error.name === "ValidationError", "ValidationError name incorrect");
    assert(error.field === "model", "ValidationError field incorrect");
  });

  await test("AuthenticationError creates correct error", () => {
    const error = new AuthenticationError("Auth failed", "openrouter");

    assert(
      error instanceof ProviderError,
      "AuthenticationError should extend ProviderError",
    );
    assert(
      error.name === "AuthenticationError",
      "AuthenticationError name incorrect",
    );
    assert(
      error.provider === "openrouter",
      "AuthenticationError provider incorrect",
    );
  });

  await test("CacheError creates correct error", () => {
    const error = new CacheError("Cache operation failed", "set");

    assert(error instanceof Error, "CacheError should extend Error");
    assert(error.name === "CacheError", "CacheError name incorrect");
    assert(error.operation === "set", "CacheError operation incorrect");
  });

  // ========== VALIDATION TESTS ==========

  await test("validateModelName accepts valid model names", () => {
    const validModels = [
      "gpt-4",
      "claude-3-5-sonnet-latest",
      "llama-2-7b-chat",
      "minimax-m2.5:cloud",
    ];

    validModels.forEach((model) => {
      const result = validateModelName(model);
      assert(result === model, `validateModelName should return ${model}`);
    });
  });

  await test("validateModelName rejects invalid model names", () => {
    assertThrows(
      () => validateModelName(null),
      ValidationError,
      "Should reject null",
    );
    assertThrows(
      () => validateModelName(123),
      ValidationError,
      "Should reject number",
    );
    assertThrows(
      () => validateModelName(""),
      ValidationError,
      "Should reject empty string",
    );
    assertThrows(
      () => validateModelName("   "),
      ValidationError,
      "Should reject whitespace",
    );
    assertThrows(
      () => validateModelName("a".repeat(101)),
      ValidationError,
      "Should reject too long string",
    );
  });

  await test("validateAuthToken accepts valid tokens", () => {
    const validTokens = [
      "sk-1234567890abcdef",
      "Bearer token123456789",
      "12345678901234567890",
    ];

    validTokens.forEach((token) => {
      const result = validateAuthToken(token);
      assert(result === token, `validateAuthToken should return ${token}`);
    });
  });

  await test("validateAuthToken handles null/undefined", () => {
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
  });

  await test("validateAuthToken rejects invalid tokens", () => {
    assertThrows(
      () => validateAuthToken(123),
      ValidationError,
      "Should reject number",
    );
    assertThrows(
      () => validateAuthToken("short"),
      ValidationError,
      "Should reject too short token",
    );
    assertThrows(
      () => validateAuthToken("a".repeat(1001)),
      ValidationError,
      "Should reject too long token",
    );
  });

  await test("validateModelResponse accepts valid responses", () => {
    const validResponses = [
      { models: [{ name: "gpt-4" }, { name: "claude-3" }] },
      { data: [{ name: "gpt-4" }, { name: "claude-3" }] },
      [{ name: "gpt-4" }, { name: "claude-3" }],
    ];

    validResponses.forEach((response) => {
      const result = validateModelResponse(response);
      assert(Array.isArray(result), "Should return array");
      assert(result.length === 2, "Should return correct number of models");
    });
  });

  await test("validateModelResponse rejects invalid responses", () => {
    assertThrows(
      () => validateModelResponse(null),
      ValidationError,
      "Should reject null",
    );
    assertThrows(
      () => validateModelResponse("string"),
      ValidationError,
      "Should reject string",
    );
    assertThrows(
      () => validateModelResponse({}),
      ValidationError,
      "Should reject empty object",
    );
    assertThrows(
      () => validateModelResponse({ models: "not array" }),
      ValidationError,
      "Should reject non-array models",
    );
    assertThrows(
      () => validateModelResponse({ models: [] }),
      ValidationError,
      "Should reject empty array",
    );
    assertThrows(
      () => validateModelResponse([{ name: 123 }]),
      ValidationError,
      "Should reject model without name string",
    );
    assertThrows(
      () => validateModelResponse([{ name: "" }]),
      ValidationError,
      "Should reject model with empty name",
    );
  });

  await test("validateHostname accepts valid hostnames", () => {
    const validHostnames = [
      "localhost",
      "api.openrouter.ai",
      "192.168.1.1",
      "example.com",
      "sub.domain.example.com",
    ];

    validHostnames.forEach((hostname) => {
      const result = validateHostname(hostname);
      assert(result === hostname, `validateHostname should return ${hostname}`);
    });
  });

  await test("validateHostname rejects invalid hostnames", () => {
    assertThrows(
      () => validateHostname(null),
      ValidationError,
      "Should reject null",
    );
    assertThrows(
      () => validateHostname(123),
      ValidationError,
      "Should reject number",
    );
    assertThrows(
      () => validateHostname(""),
      ValidationError,
      "Should reject empty string",
    );
    assertThrows(
      () => validateHostname("   "),
      ValidationError,
      "Should reject whitespace",
    );
    assertThrows(
      () => validateHostname("a".repeat(254)),
      ValidationError,
      "Should reject too long hostname",
    );
    assertThrows(
      () => validateHostname("invalid hostname"),
      ValidationError,
      "Should reject hostname with space",
    );
    assertThrows(
      () => validateHostname("invalid@hostname"),
      ValidationError,
      "Should reject hostname with @",
    );
  });

  await test("validatePort accepts valid ports", () => {
    const validPorts = [1, 80, 443, 11434, 65535];

    validPorts.forEach((port) => {
      const result = validatePort(port);
      assert(result === port, `validatePort should return ${port}`);
    });
  });

  await test("validatePort rejects invalid ports", () => {
    assertThrows(
      () => validatePort(null),
      ValidationError,
      "Should reject null",
    );
    assertThrows(
      () => validatePort("80"),
      ValidationError,
      "Should reject string",
    );
    assertThrows(
      () => validatePort(80.5),
      ValidationError,
      "Should reject decimal",
    );
    assertThrows(() => validatePort(0), ValidationError, "Should reject 0");
    assertThrows(
      () => validatePort(-1),
      ValidationError,
      "Should reject negative",
    );
    assertThrows(
      () => validatePort(65536),
      ValidationError,
      "Should reject too high",
    );
  });

  // ========== INTEGRATION TESTS ==========

  await test("Environment file contains all required variables", () => {
    const envPath = path.join(__dirname, "..", ".env");
    assert(fs.existsSync(envPath), ".env file should exist");

    const envContent = fs.readFileSync(envPath, "utf8");

    Object.values(ENV_VARS).forEach((varName) => {
      assert(envContent.includes(varName), `.env should contain ${varName}`);
    });
  });

  await test("loadEnvFile returns envFile path", () => {
    const envVars = loadEnvFile();
    assert(envVars, "loadEnvFile should return object");
    assert(envVars.envFile, "loadEnvFile should include envFile path");
    assert(typeof envVars.envFile === "string", "envFile should be string");
  });

  await test("Error stack traces are preserved", () => {
    const cause = new Error("Original cause");
    const error = new ProviderError("Test error", "test", cause);

    assert(error.stack, "Error should have stack trace");
    assert(
      error.stack.includes("ProviderError"),
      "Stack should mention error type",
    );
  });

  await test("Constants are properly defined", () => {
    // Test that constants have expected values (they're objects, not frozen by default)
    const originalHost = OLLAMA.DEFAULT_HOST;
    assert(
      typeof originalHost === "string",
      "OLLAMA.DEFAULT_HOST should be string",
    );
    assert(
      OLLAMA.DEFAULT_HOST === "localhost",
      "OLLAMA.DEFAULT_HOST should be localhost",
    );

    // Test that constants objects exist and have expected structure
    assert(typeof OLLAMA === "object", "OLLAMA should be object");
    assert(typeof CACHE === "object", "CACHE should be object");
    assert(typeof HTTP_STATUS === "object", "HTTP_STATUS should be object");
  });

  console.log("\n🎉 All validation, errors, and constants tests passed!");
}

// Run tests
runTests().catch((error) => {
  console.error("💥 Test suite failed:", error.message);
  console.error(error.stack);
  process.exit(1);
});
