/**
 * Anthropic provider implementation
 */

const { spawn } = require("child_process");
const {
  log,
  loadEnvFile,
  promptForApiKey,
  updateEnvFile,
  envFile,
} = require("./config");
const { ANTHROPIC, DEFAULT_MODELS } = require("./constants");
const { validateAuthToken } = require("./validation");
const { AuthenticationError } = require("./errors");

/**
 * Launch Claude Code with Anthropic settings
 */
async function launchAnthropic(extraArgs = [], useDefaultModel = null) {
  log("Launching Claude Code with Anthropic settings...", "green");

  const envVars = loadEnvFile();
  log(`Loading environment from: ${envVars.envFile}`, "yellow");

  let apiKey = validateAuthToken(envVars.ANTHROPIC_API_KEY);

  if (!apiKey) {
    log("Anthropic API key not found. Please provide it:", "yellow");
    apiKey = await promptForApiKey("Anthropic", "ANTHROPIC_API_KEY");
    if (!apiKey) {
      log("Error: Anthropic API key is required", "red");
      process.exit(1);
    }
    updateEnvFile("ANTHROPIC_API_KEY", apiKey);
    envVars.ANTHROPIC_API_KEY = apiKey;
  }

  let selectedModel =
    useDefaultModel || envVars.ANTHROPIC_MODEL || DEFAULT_MODELS.ANTHROPIC;

  log("Using:", "yellow");
  log(`  Model: ${selectedModel}`, "reset");
  log("", "reset");

  // Set environment variables
  const env = { ...process.env };
  env.ANTHROPIC_API_KEY = envVars.ANTHROPIC_API_KEY;
  env.ANTHROPIC_MODEL = selectedModel;

  // Launch Claude Code
  const claude = spawn("claude", extraArgs, {
    env,
    stdio: "inherit",
  });

  claude.on("error", (error) => {
    log(`Error launching Claude Code: ${error.message}`, "red");
    process.exit(1);
  });

  claude.on("exit", (code) => {
    process.exit(code);
  });
}

module.exports = {
  launchAnthropic,
};
