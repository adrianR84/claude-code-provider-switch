/**
 * Ollama provider implementation
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
 * Launch Claude Code with Ollama settings
 */
async function launchOllama(extraArgs = []) {
  log("Launching Claude Code with Ollama settings...", "green");

  const envVars = loadEnvFile();
  log(`Loading environment from: ${envFile}`, "yellow");

  // Ollama API key is optional for local use, but prompt if user wants to set it
  if (!envVars.OLLAMA_API_KEY) {
    log("Ollama API key not found (optional for local use)", "yellow");
    log("Press Enter to skip, or provide an API key:", "reset");
    const apiKey = await promptForApiKey("Ollama (optional)", "OLLAMA_API_KEY");
    if (apiKey) {
      updateEnvFile("OLLAMA_API_KEY", apiKey);
      envVars.OLLAMA_API_KEY = apiKey;
    }
  }

  let selectedModel = envVars.OLLAMA_MODEL || "minimax-m2.5:cloud";

  log("Using:", "yellow");
  log(`  Base URL: http://localhost:11434`, "reset");
  log(`  Model: ${selectedModel}`, "reset");
  log("", "reset");

  // Set environment variables
  const env = { ...process.env };
  env.ANTHROPIC_BASE_URL = "http://localhost:11434";
  env.ANTHROPIC_API_KEY = envVars.OLLAMA_API_KEY || "ollama";
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
  launchOllama,
};
