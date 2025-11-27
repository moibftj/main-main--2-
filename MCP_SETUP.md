# MCP (Model Context Protocol) Setup

This project has been configured with MCP servers to enhance Claude Code's capabilities.

## Configured MCP Servers

### 1. Filesystem Server (`@modelcontextprotocol/server-filesystem`)
- **Purpose**: Provides file system operations and management
- **Scope**: `/workspaces/main` directory
- **Features**: Read, write, list, and manage files and directories

### 2. Code Runner Server (`mcp-server-code-runner`)
- **Purpose**: Execute code snippets in various languages
- **Features**: Run Python, JavaScript, and other code snippets
- **Security**: Runs in isolated environment

### 3. Web Research Server (`@mzxrai/mcp-webresearch`)
- **Purpose**: Perform web searches and research
- **Features**: Search the web, fetch web pages, extract information
- **Use Case**: Research current information, documentation, etc.

## Configuration

The MCP configuration is located at: `~/.claude/mcp_servers.json`

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": [
        "/workspaces/main/node_modules/@modelcontextprotocol/server-filesystem/dist/index.js",
        "/workspaces/main"
      ]
    },
    "code-runner": {
      "command": "node",
      "args": [
        "/workspaces/main/node_modules/mcp-server-code-runner/dist/index.js"
      ]
    },
    "webresearch": {
      "command": "node",
      "args": [
        "/workspaces/main/node_modules/@mzxrai/mcp-webresearch/dist/index.js"
      ]
    }
  }
}
```

## Usage

Once configured, Claude Code can automatically use these MCP servers to:

1. **Filesystem Operations**: Directly read, write, and manage files without explicit commands
2. **Code Execution**: Run code snippets for testing and prototyping
3. **Web Research**: Look up current information and documentation

## Adding More MCP Servers

To add additional MCP servers:

1. Install the server package:
   ```bash
   npm install -D <mcp-server-package>
   ```

2. Update the `~/.claude/mcp_servers.json` file with the new server configuration

3. Restart Claude Code to load the new servers

## Available MCP Servers

Here are some popular MCP servers you might want to add:

- `@notionhq/notion-mcp-server` - Interact with Notion
- `@hubspot/mcp-server` - HubSpot integration
- `@heroku/mcp-server` - Heroku platform integration
- `@dynatrace-oss/dynatrace-mcp-server` - Dynatrace monitoring
- `@supabase/mcp-server-supabase` - Supabase database operations
- `chrome-devtools-mcp` - Chrome DevTools integration

## Troubleshooting

If MCP servers are not working:

1. Check that the MCP servers are installed:
   ```bash
   ls node_modules/ | grep mcp
   ```

2. Verify the configuration file syntax:
   ```bash
   cat ~/.claude/mcp_servers.json
   ```

3. Check Claude Code logs for MCP connection errors

4. Ensure the server paths in the config are correct