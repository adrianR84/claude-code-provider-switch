#!/usr/bin/env node

/**
 * Claude Code Provider Switcher - Main Entry Point
 * A modular CLI tool to switch between different AI providers for Claude Code
 */

const { showProviderMenu, showUsage } = require('../lib/menu');
const { launchOpenRouter } = require('../lib/openrouter');
const { launchAnthropic } = require('../lib/anthropic');
const { launchOllama } = require('../lib/ollama');
const { launchDefault } = require('../lib/default');

/**
 * Main application logic
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    const selectedProvider = await showProviderMenu();
    const showModelMenu = false; // Don't show model menu by default
    
    switch (selectedProvider.id) {
      case 'openrouter':
        await launchOpenRouter(showModelMenu, []);
        break;
      case 'anthropic':
        await launchAnthropic([]);
        break;
      case 'ollama':
        await launchOllama([]);
        break;
      case 'default':
        await launchDefault([]);
        break;
      case 'help':
        showUsage();
        break;
    }
    return;
  }

  const command = args[0].toLowerCase();
  const showModelMenu = args.includes('--model');

  // Filter out our script arguments, pass the rest to Claude
  const extraArgs = args.filter(
    (arg) =>
      arg !== '--model' &&
      arg !== 'openrouter' &&
      arg !== 'anthropic' &&
      arg !== 'ollama' &&
      arg !== 'default' &&
      arg !== 'or' &&
      arg !== 'open' &&
      arg !== 'ant' &&
      arg !== 'oll' &&
      arg !== 'def' &&
      arg !== 'd'
  );

  switch (command) {
    case 'openrouter':
    case 'or':
    case 'open':
      await launchOpenRouter(showModelMenu, extraArgs);
      break;

    case 'anthropic':
    case 'ant':
      await launchAnthropic(extraArgs);
      break;

    case 'ollama':
    case 'oll':
      await launchOllama(extraArgs);
      break;

    case 'default':
    case 'def':
    case 'd':
      await launchDefault(extraArgs);
      break;

    case 'help':
    case '-h':
    case '--help':
      showUsage();
      break;

    default:
      const { log } = require('../lib/config');
      log(`Error: Unknown command '${command}'`, 'red');
      log('', 'reset');
      showUsage();
      process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  const { log } = require('../lib/config');
  log(`Uncaught error: ${error.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const { log } = require('../lib/config');
  log(`Unhandled rejection: ${reason}`, 'red');
  process.exit(1);
});

// Run the application
main().catch(error => {
  const { log } = require('../lib/config');
  log(`Error: ${error.message}`, 'red');
  process.exit(1);
});
