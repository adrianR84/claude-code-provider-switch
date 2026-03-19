# Agent Configuration and Instructions

## System Information

### Operating System
- **OS**: Windows
- **Version**: Current user environment
- **Architecture**: Windows-based development environment

### Terminal Environment
- **Shell**: PowerShell (pwsh)
- **Working Directory**: Project-specific
- **Command Execution**: Uses bash tool with PowerShell compatibility

### Project Details
- **Project Path**: `c:\_Adi\_Work\Apps\claude-code-provider-switch`
- **Project Type**: Node.js CLI application
- **Git Repository**: Yes (git root: c:\_Adi\_Work\Apps\claude-code-provider-switch)
- **Package Manager**: npm

## Agent Instructions

### Critical Rules

**Never commit code without the user explicitly requesting this.**

This rule must be followed at all times:
- Do not commit code that is not working, tested, reviewed, and documented
- Do not commit without user consent (user must specify when they want to commit)
- Always wait for explicit user request before committing any changes

### Development Guidelines

When working on this project:

1. **Code Quality**: Ensure all code changes are properly tested and documented
2. **Review Process**: Review changes for bugs, security issues, and improvements
3. **Documentation**: Update relevant documentation when making changes
4. **Testing**: Run appropriate tests before committing
5. **User Consent**: Only commit when the user explicitly requests it

### Project-Specific Notes

- This is a CLI tool for switching between AI providers for Claude Code
- Main entry point: `bin/claude-switch.js`
- Configuration files: `.env` (local) and `~/.claude/.claude-switch-env` (global)
- Test files located in: `test/` directory
- Library modules located in: `lib/` directory

