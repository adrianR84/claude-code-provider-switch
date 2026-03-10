/**
 * Ollama provider implementation
 */

const { spawn } = require("child_process");
const http = require("http");
const {
  log,
  loadEnvFile,
  promptForApiKey,
  updateEnvFile,
  envFile,
  findBestMatchingModel,
} = require("./config");

/**
 * Fetch available models from Ollama API
 */
function fetchOllamaModels() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 11434,
      path: "/api/tags",
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          if (response.models && Array.isArray(response.models)) {
            // Return all models
            resolve(response.models);
          } else {
            reject(new Error("Invalid response format from Ollama API"));
          }
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error.message}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(new Error(`Failed to fetch models: ${error.message}`));
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error("Request timeout - failed to fetch models from Ollama"));
    });

    req.end();
  });
}

/**
 * Show interactive model selection for Ollama
 */
async function showModelSelection() {
  log("Fetching available models from Ollama...", "yellow");

  try {
    const models = await fetchOllamaModels();
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
          `Found ${modelList.length} models. Start typing to filter, or press Enter to select.`,
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
        const size = model.size ? ` (${model.size})` : "";
        log(`${index + 1}) ${model.name}${size}`, "reset");
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
          log("Using default model: minimax-m2.5:cloud", "yellow");
          resolve("minimax-m2.5:cloud");
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
          log(`Selected model: ${selectedModel.name}`, "yellow");
          resolve(selectedModel.name);
          return;
        }

        // Update filter
        currentFilter = trimmedInput;

        if (currentFilter === "") {
          filteredModels = models.slice(0, 50); // Show first 50 when no filter
        } else {
          filteredModels = models
            .filter((model) => model.name.toLowerCase().includes(currentFilter))
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
    log("Using default model: minimax-m2.5:cloud", "yellow");
    return "minimax-m2.5:cloud";
  }
}

/**
 * Launch Claude Code with Ollama settings
 */
async function launchOllama(
  showModelMenu = false,
  extraArgs = [],
  directModel = null,
) {
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

  if (directModel) {
    // Direct model specification - find best match
    log(`Finding best match for model: ${directModel}`, "yellow");
    try {
      const models = await fetchOllamaModels();
      const matchedModel = findBestMatchingModel(directModel, models);
      if (matchedModel) {
        selectedModel = matchedModel;
        log(`Using matched model: ${selectedModel}`, "green");
      } else {
        log(
          `No match found for "${directModel}", using default: ${selectedModel}`,
          "yellow",
        );
      }
    } catch (error) {
      log(`Error fetching models for matching: ${error.message}`, "red");
      log(`Using default model: ${selectedModel}`, "yellow");
    }
  } else if (showModelMenu) {
    selectedModel = await showModelSelection();
  }

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
  showModelSelection,
};
