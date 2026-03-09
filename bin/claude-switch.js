#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const https = require("https");

// Colors for output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m",
};

// Get script directory
const scriptDir = __dirname;
const envFile = path.join(scriptDir, "..", ".env");

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function showUsage() {
  log("Usage: claude-switch [provider] [--model]", "reset");
  log("", "reset");
  log("Providers:", "reset");
  log("  openrouter  - Launch Claude Code with OpenRouter settings", "reset");
  log("  anthropic   - Launch Claude Code with Anthropic settings", "reset");
  log("  ollama      - Launch Claude Code with Ollama settings", "reset");
  log("  default     - Launch Claude Code with default settings", "reset");
  log("", "reset");
  log("Options:", "reset");
  log("  --model     - Show model selection menu", "reset");
  log("", "reset");
  log("Examples:", "reset");
  log("  claude-switch openrouter", "reset");
  log("  claude-switch openrouter --model", "reset");
  log("  claude-switch anthropic", "reset");
  log("  claude-switch ollama", "reset");
  log("  claude-switch default", "reset");
  log("  claude-switch default my-project/", "reset");
}

async function fetchOpenRouterModels(apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "openrouter.ai",
      port: 443,
      path: "/api/v1/models",
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          if (response.data && Array.isArray(response.data)) {
            resolve(response.data);
          } else {
            reject(new Error("Invalid response format from OpenRouter API"));
          }
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error.message}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(new Error(`Failed to fetch models: ${error.message}`));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(
        new Error("Request timeout - failed to fetch models from OpenRouter"),
      );
    });

    req.end();
  });
}

async function showModelSelection(apiKey) {
  log("Fetching available models from OpenRouter...", "yellow");

  try {
    const models = await fetchOpenRouterModels(apiKey);
    log(
      `Found ${models.length} models. Start typing to filter, or press Enter to select.`,
      "green",
    );
    log('Type "exit" to cancel and use default model.', "yellow");
    log("", "reset");

    // Use readline for interactive input with filtering
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "Search models: ",
    });

    let currentFilter = "";
    let filteredModels = models.slice(0, 50); // Start with first 50 models

    function displayModels(modelList, showHeader = true) {
      if (showHeader) {
        // Clear screen and show header
        console.clear();
        log(
          `Found ${models.length} models. Start typing to filter, or press Enter to select.`,
          "green",
        );
        log('Type "exit" to cancel and use default model.', "yellow");
        log("", "reset");
      }

      if (modelList.length === 0) {
        log("No models match your search.", "red");
        log("", "reset");
        return;
      }

      // Display filtered models (max 20 at a time)
      const displayModels = modelList.slice(0, 20);
      displayModels.forEach((model, index) => {
        const pricing = model.pricing
          ? ` (${model.pricing.prompt ? "$" + parseFloat(model.pricing.prompt).toFixed(6) + "/1K" : "free"})`
          : "";
        log(`${index + 1}) ${model.id}${pricing}`, "reset");
      });

      if (modelList.length > 20) {
        log("", "reset");
        log(
          `... and ${modelList.length - 20} more models matching your filter`,
          "yellow",
        );
      }

      if (showHeader) {
        log("", "reset");
        rl.prompt();
      }
    }

    return new Promise((resolve) => {
      // Initial display
      displayModels(filteredModels);

      rl.on("line", (input) => {
        const trimmedInput = input.trim().toLowerCase();

        // Check for exit command
        if (trimmedInput === "exit") {
          rl.close();
          log("Using default model: openrouter/free", "yellow");
          resolve("openrouter/free");
          return;
        }

        // Check for direct selection (number)
        const selection = parseInt(trimmedInput);
        if (
          !isNaN(selection) &&
          selection > 0 &&
          selection <= Math.min(filteredModels.length, 20)
        ) {
          const selectedModel = filteredModels[selection - 1];
          rl.close();
          log(`Selected model: ${selectedModel.id}`, "yellow");
          resolve(selectedModel.id);
          return;
        }

        // Update filter
        currentFilter = trimmedInput;

        if (currentFilter === "") {
          filteredModels = models.slice(0, 50); // Show first 50 when no filter
        } else {
          filteredModels = models
            .filter((model) => model.id.toLowerCase().includes(currentFilter))
            .slice(0, 50); // Limit to 50 results for performance
        }

        // Redisplay with new filter
        displayModels(filteredModels);
      });

      rl.on("close", () => {
        if (!rl.closed) {
          rl.closed = true;
        }
      });
    });
  } catch (error) {
    log(`Error fetching models: ${error.message}`, "red");
    log("Using default model: openrouter/free", "yellow");
    return "openrouter/free";
  }
}

function loadEnvFile() {
  if (!fs.existsSync(envFile)) {
    log(`Error: Environment file not found: ${envFile}`, "red");
    log("Please create a .env file with your API keys:", "yellow");
    log("OPENROUTER_API_KEY=your_openrouter_key_here", "reset");
    log("ANTHROPIC_API_KEY=your_anthropic_key_here", "reset");
    log("OLLAMA_API_KEY=your_ollama_key_here", "reset");
    process.exit(1);
  }

  const envContent = fs.readFileSync(envFile, "utf8");
  const envVars = {};

  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join("=").trim();
      }
    }
  });

  return envVars;
}

async function launchOpenRouter(showModelMenu = false, extraArgs = []) {
  log("Launching Claude Code with OpenRouter settings...", "green");

  const envVars = loadEnvFile();
  log(`Loading environment from: ${envFile}`, "yellow");

  if (!envVars.OPENROUTER_API_KEY) {
    log("Error: OPENROUTER_API_KEY not found in .env file", "red");
    process.exit(1);
  }

  let selectedModel = envVars.OPENROUTER_MODEL || "openrouter/free";

  if (showModelMenu) {
    selectedModel = await showModelSelection(envVars.OPENROUTER_API_KEY);
  }

  log("Using:", "yellow");
  log(`  Base URL: https://openrouter.ai/api`, "reset");
  log(`  Model: ${selectedModel}`, "reset");
  log("", "reset");

  // Set environment variables
  const env = { ...process.env };
  env.ANTHROPIC_BASE_URL = "https://openrouter.ai/api";
  env.ANTHROPIC_API_KEY = envVars.OPENROUTER_API_KEY;
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

function launchDefault(extraArgs = []) {
  log("Launching Claude Code with default settings...", "green");
  log("Using default configuration", "yellow");
  log("", "reset");

  // Clear environment variables
  const env = { ...process.env };
  delete env.ANTHROPIC_BASE_URL;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.ANTHROPIC_MODEL;
  delete env.ANTHROPIC_API_KEY;

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

async function launchAnthropic(extraArgs = []) {
  log("Launching Claude Code with Anthropic settings...", "green");

  const envVars = loadEnvFile();
  log(`Loading environment from: ${envFile}`, "yellow");

  if (!envVars.ANTHROPIC_API_KEY) {
    log("Error: ANTHROPIC_API_KEY not found in .env file", "red");
    process.exit(1);
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

async function launchOllama(extraArgs = []) {
  log("Launching Claude Code with Ollama settings...", "green");

  const envVars = loadEnvFile();
  log(`Loading environment from: ${envFile}`, "yellow");

  let selectedModel = envVars.OLLAMA_MODEL || "llama3.1:8b";

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

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    await launchDefault();
    return;
  }

  const command = args[0].toLowerCase();
  const showModelMenu = args.includes("--model");

  // Filter out our script arguments, pass the rest to Claude
  const extraArgs = args.filter(
    (arg) =>
      arg !== "--model" &&
      arg !== "openrouter" &&
      arg !== "anthropic" &&
      arg !== "ollama" &&
      arg !== "default" &&
      arg !== "or" &&
      arg !== "open" &&
      arg !== "ant" &&
      arg !== "oll" &&
      arg !== "def" &&
      arg !== "d",
  );

  switch (command) {
    case "openrouter":
    case "or":
    case "open":
      await launchOpenRouter(showModelMenu, extraArgs);
      break;

    case "anthropic":
    case "ant":
      await launchAnthropic(extraArgs);
      break;

    case "ollama":
    case "oll":
      await launchOllama(extraArgs);
      break;

    case "default":
    case "def":
    case "d":
      await launchDefault(extraArgs);
      break;

    case "help":
    case "-h":
    case "--help":
      showUsage();
      break;

    default:
      log(`Error: Unknown command '${command}'`, "red");
      log("", "reset");
      showUsage();
      process.exit(1);
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  log(`Uncaught error: ${error.message}`, "red");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  log(`Unhandled rejection: ${reason}`, "red");
  process.exit(1);
});

main().catch((error) => {
  log(`Error: ${error.message}`, "red");
  process.exit(1);
});
