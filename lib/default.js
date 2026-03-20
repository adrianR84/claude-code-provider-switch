/**
 * Default Claude Code provider implementation
 */

const { spawn } = require("child_process");
const { log } = require("./config");

/**
 * Launch Claude Code with default settings
 */
async function launchDefault(extraArgs = []) {
  log("Launching Claude Code with default settings...", "green");
  log("Using default configuration", "yellow");
  log("", "reset");

  // Clear environment variables
  const env = { ...process.env };
  delete env.ANTHROPIC_BASE_URL;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.ANTHROPIC_MODEL;
  delete env.ANTHROPIC_API_KEY;
  delete env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC;

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
  launchDefault,
};
