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

/**
 * Launch Claude Code with Anthropic settings
 */
async function launchAnthropic(extraArgs = []) {
  log("Launching Claude Code with Anthropic settings...", "green");

  const envVars = loadEnvFile();
  log(`Loading environment from: ${envFile}`, "yellow");

  if (!envVars.ANTHROPIC_API_KEY) {
    log("Anthropic API key not found. Please provide it:", "yellow");
    const apiKey = await promptForApiKey("Anthropic", "ANTHROPIC_API_KEY");
    if (!apiKey) {
      log("Error: Anthropic API key is required", "red");
      process.exit(1);
    }
    updateEnvFile("ANTHROPIC_API_KEY", apiKey);
    envVars.ANTHROPIC_API_KEY = apiKey;
  }

  let selectedModel = envVars.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

  log("Using:", "yellow");
  log(`  Base URL: https://api.anthropic.com`, "reset");
  log(`  Model: ${selectedModel}`, "reset");
  log("", "reset");

  // Set environment variables
  const env = { ...process.env };
  env.ANTHROPIC_BASE_URL = "https://api.anthropic.com";
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
