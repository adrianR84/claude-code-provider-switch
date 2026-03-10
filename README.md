# Claude Code Provider Switcher

A powerful CLI tool that lets you seamlessly switch between different AI providers for Claude Code, including OpenRouter, Anthropic, Ollama, and the original Claude Code configuration.

## 🚀 Features

- **Multi-Provider Support**: Switch between OpenRouter, Anthropic, Ollama, and original Claude Code
- **Interactive Menu**: User-friendly interface for provider and model selection
- **Default Configuration**: Set and save your preferred provider and model
- **Model Selection**: Choose from hundreds of models across different providers
- **Auto-Restart**: Automatically restarts with new configuration after changes
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Global Installation**: Install once and use anywhere

## 📦 Installation

### Global Installation (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd claude-code-provider-switch

# Install globally
npm install -g .

# Or use npm link for development (changes are immediate)
npm run link
```

### Local Installation

```bash
npm install
npm start
```

## 🎯 Quick Start

### Basic Usage

```bash
# Show interactive menu
claude-switch

# Use a specific provider
claude-switch openrouter
claude-switch anthropic
claude-switch ollama
claude-switch original

# Use specific provider with model selection
claude-switch openrouter --model
```

### Configuration Management

```bash
# Set up default provider and model interactively
claude-switch set-default

# View current defaults
claude-switch show-defaults

# Clear all defaults
claude-switch clear-defaults
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in your project directory:

```env
# API Keys for different providers
OPENROUTER_AUTH_TOKEN=your_openrouter_token_here
ANTHROPIC_API_KEY=your_anthropic_key_here
OLLAMA_AUTH_TOKEN=your_ollama_token_here

# Optional: Default models for each provider
OPENROUTER_MODEL=openrouter/free
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
OLLAMA_MODEL=minimax-m2.5:cloud

# Default provider and model settings
DEFAULT_PROVIDER=original
DEFAULT_MODEL=
```

### Provider Setup

#### OpenRouter

1. Get your API key from [OpenRouter](https://openrouter.ai/keys)
2. Set `OPENROUTER_AUTH_TOKEN` in your `.env` file
3. Run `claude-switch openrouter --model` to browse available models

#### Anthropic

1. Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. Set `ANTHROPIC_API_KEY` in your `.env` file
3. Run `claude-switch anthropic --model` to browse available models

#### Ollama

1. Install and run [Ollama](https://ollama.ai/)
2. Optional: Set `OLLAMA_AUTH_TOKEN` if using a remote Ollama instance
3. Run `claude-switch ollama --model` to see locally available models

## 📋 Commands Reference

### Provider Commands

| Command      | Description              | Example                    |
| ------------ | ------------------------ | -------------------------- |
| `openrouter` | Use OpenRouter provider  | `claude-switch openrouter` |
| `anthropic`  | Use Anthropic provider   | `claude-switch anthropic`  |
| `ollama`     | Use Ollama provider      | `claude-switch ollama`     |
| `original`   | Use original Claude Code | `claude-switch original`   |

### Model Selection

| Command              | Description               | Example                            |
| -------------------- | ------------------------- | ---------------------------------- |
| `--model <name>`     | Use specific model        | `claude-switch --model gpt-4`      |
| `<provider> --model` | Select model for provider | `claude-switch openrouter --model` |

### Configuration Commands

| Command          | Description               | Example                        |
| ---------------- | ------------------------- | ------------------------------ |
| `set-default`    | Interactive default setup | `claude-switch set-default`    |
| `show-defaults`  | View current defaults     | `claude-switch show-defaults`  |
| `clear-defaults` | Reset all defaults        | `claude-switch clear-defaults` |
| `help`           | Show help information     | `claude-switch --help`         |

### Aliases

| Command      | Aliases      |
| ------------ | ------------ |
| `openrouter` | `or`, `open` |
| `anthropic`  | `ant`        |
| `ollama`     | `oll`        |
| `original`   | `def`, `d`   |

## 🎨 Interactive Menu

When you run `claude-switch` without arguments, you'll see an interactive menu:

```
Claude Code Provider Switcher

Current default: OpenRouter (openrouter/free)

Available providers:

❯ 1) OpenRouter    Aliases: (openrouter, or, open)
  2) Ollama         Aliases: (ollama, oll)
  3) Anthropic      Aliases: (anthropic, ant)
  4) Original Claude Code  Aliases: (original, orig, def, d)
  5) Set as Default  Aliases: (set-default)
  6) Help           Aliases: (help, -h, --help)

Controls:
↑/↓ - Navigate
Enter - Select provider
1-6 - Quick select
ESC - Exit
```

## 🔧 Advanced Usage

### Programmatic API

You can also use this package as a module in your Node.js applications:

```javascript
const {
  setDefaultProvider,
  getDefaultProvider,
  launchOpenRouter,
  launchAnthropic,
} = require("claude-code-provider-switch");

// Set default provider programmatically
await setDefaultProvider("openrouter");

// Get current provider
const current = getDefaultProvider();
console.log(`Current provider: ${current}`);

// Launch specific provider
await launchOpenRouter(false, [], "gpt-4");
```

### Development

```bash
# Install for development with symlink (changes are immediate)
npm run link

# Run directly from source
npm run dev -- --help

# Run tests
npm run test:all

# Unlink development version
npm run unlink

# Install production version
npm install -g .
```

## 🐛 Troubleshooting

### Common Issues

**"API key required" error**

- Check your `.env` file contains the correct API key
- Ensure the `.env` file is in your current working directory

**"Provider not found" error**

- Verify the provider name is spelled correctly
- Check you have the required API keys set up

**Menu glitching or not responding**

- Try clearing defaults: `claude-switch clear-defaults`
- Restart the application

**File permission errors**

- Ensure you have write permissions to create/modify the `.env` file
- Try running with elevated permissions if necessary

### Debug Mode

For debugging, you can run the tool directly from source:

```bash
node bin/claude-switch.js --help
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Scripts

- `npm run dev` - Run directly from source
- `npm run test:validation` - Run validation tests
- `npm run test:provider` - Run provider integration tests
- `npm run test:comprehensive` - Run comprehensive tests
- `npm run test:all` - Run all test suites

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Related Projects

- [Claude Code](https://github.com/anthropics/claude-code) - Official Claude Code repository
- [OpenRouter](https://openrouter.ai/) - Unified API for AI models
- [Ollama](https://ollama.ai/) - Local AI model deployment

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Search existing GitHub issues
3. Create a new issue with detailed information
4. Include your OS, Node.js version, and error messages

---

**Made with ❤️ by Adrian R**
