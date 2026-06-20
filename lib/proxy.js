/**
 * Claude Code Proxy provider - launches Claude with a local LiteLLM proxy
 */

const http = require("http");
const { spawnClaude } = require("./claude-spawn");
const { log, loadEnvFile, getProviderDefaultModel } = require("./config");
const { getProviderBaseUrl } = require("./constants");

/**
 * Show model selection for proxy provider.
 * No model discovery needed - just returns the default model.
 */
async function showModelSelection() {
  return getProviderDefaultModel("proxy");
}

/**
 * Check if the proxy server is running at localhost:8082.
 */
function isProxyRunning() {
  return new Promise((resolve) => {
    const req = http.get("http://localhost:8082", (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Launch Claude Code with the local proxy as backend.
 * The proxy must be running at localhost:8082 before launching.
 */
async function launchProxy(
  showModelMenu = false,
  extraArgs = [],
  directModel = null,
) {
  const envVars = loadEnvFile();
  log(`Loading environment from: ${envVars.envFile}`, "yellow");

  const selectedModel =
    directModel || envVars.PROXY_MODEL || getProviderDefaultModel("proxy");

  const proxyRunning = await isProxyRunning();

  log("", "reset");
  log("┌───────────────────────────────────────────────────────────────────┐", "cyan");
  log("│  Claude Code Proxy  —  https://github.com/1rgs/claude-code-proxy  │", "cyan");
  log("└───────────────────────────────────────────────────────────────────┘", "cyan");
  log("", "reset");

  if (!proxyRunning) {
    log("Proxy server is not running at http://localhost:8082.", "red");
    log("Set up and start the proxy first:", "yellow");
    log("", "reset");
    log("1. Clone the repo:", "reset");
    log("   git clone https://github.com/1rgs/claude-code-proxy.git", "reset");
    log("   cd claude-code-proxy", "reset");
    log("", "reset");
    log("2. Create .env with your API keys:", "reset");
    log("   cp .env.example .env", "reset");
    log("   # Edit .env: set OPENAI_API_KEY (required), GEMINI_API_KEY, etc.", "reset");
    log("", "reset");
    log("3. Start the proxy:", "reset");
    log("   # Docker (recommended):", "reset");
    log("   docker run -d --env-file .env -p 8082:8082 ghcr.io/1rgs/claude-code-proxy:latest", "reset");
    log("   # Or from source:", "reset");
    log("   uv run uvicorn server:app --host 0.0.0.0 --port 8082", "reset");
    log("", "reset");
    log("4. Set your default model (optional):", "reset");
    log("   # Add to ~/.claude/.claude-switch-env:", "reset");
    log("   PROXY_MODEL=gpt-4o", "reset");
    log("   PROXY_AUTH_TOKEN=your-token-if-needed", "reset");
    log("", "reset");
    log(`Using:  Base URL: ${getProviderBaseUrl("proxy")}  |  Model: ${selectedModel}`, "green");
    log("", "reset");
    return;
  }

  log(`Proxy is running at ${getProviderBaseUrl("proxy")}`, "green");
  log(`Using:  Base URL: ${getProviderBaseUrl("proxy")}  |  Model: ${selectedModel}`, "green");
  log("", "reset");
  log("Launching Claude Code...", "green");

  const env = { ...process.env };
  env.ANTHROPIC_BASE_URL = getProviderBaseUrl("proxy");
  env.ANTHROPIC_API_KEY = "";
  env.ANTHROPIC_AUTH_TOKEN = "sk-ant-api03-placeholder";
  env.ANTHROPIC_MODEL = selectedModel;
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC =
    envVars.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC || "1";

  const claude = spawnClaude(extraArgs, {
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
  launchProxy,
  showModelSelection,
};
