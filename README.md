<p align="center">
  <img src="media/banner.svg" alt="Gemini Unofficial API">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white" alt="Node 18+">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT">
  <img src="https://img.shields.io/badge/dependencies-2-lightgrey" alt="2 deps">
  <img src="https://img.shields.io/badge/MCP-server-purple" alt="MCP Server">
  <img src="https://img.shields.io/badge/status-active-success" alt="Active">
  <img src="https://img.shields.io/badge/PRs-welcome-8A2BE2" alt="PRs Welcome">
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#mcp-server">MCP Server</a> •
  <a href="docs/guide.md">Guide</a> •
  <a href="docs/api.md">API</a> •
  <a href="docs/protocol.md">Protocol</a>
</p>

---

<p align="center">
  <strong>Unofficial Node.js client and MCP server for Google Gemini</strong>
  <br>
  No login required for text & images — cookies unlock the full suite.
  <br>
  Drop a <code>cookies.json</code> and use.
</p>

---

## Quick Start

```sh
git clone https://github.com/etrnkz/gemini-unofficial-api.git
cd gemini-unofficial-api
npm install
```

```js
import { GeminiClient } from './src/gemini.js';

const gemini = new GeminiClient();
const answer = await gemini.sendMessage('What is the capital of France?');
console.log(answer);
// The capital of France is Paris.
```

## At a Glance

| Area | Methods | Auth |
|------|---------|------|
| Chat | `sendMessage`, `streamMessage` | none |
| Images | `sendImage`, `streamImage` | none |
| Files | `uploadFile`, `uploadBuffer`, `sendMessageWithFiles` | none |
| Video | `sendVideo`, `streamVideo` | cookie |
| MCP | `gemini_ask`, `gemini_ask_with_file`, `gemini_upload_file`, `gemini_download_file`, `gemini_list_models` | optional |
| Chats | `listChats`, `readChat`, `deleteChat`, `renameChat`, `generateChatTitle` | cookie |
| Gems | `listGems`, `createGem`, `updateGem`, `deleteGem` | cookie |
| Memory | `listMemories`, `createMemory`, `updateMemory`, `deleteMemory`, `deleteAllMemories` | cookie |
| Account | `listModels`, `getAccountStatus`, `getSettings`, `getUsageInfo`, `checkQuota` | optional |
| Research | `getDeepResearchCaps`, `deepResearchBootstrap` | cookie |
| Media | `downloadFile`, `getFullSizeImage` | cookie |

## MCP Server

Run Gemini as an MCP (Model Context Protocol) server over stdio for Claude Desktop, Cursor, OpenCode, or any MCP host:

```sh
# Start via CLI command
npx gemini-unofficial-api mcp

# Or via npm script
npm run mcp
```

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gemini": {
      "command": "node",
      "args": ["--max-http-header-size=65536", "/path/to/gemini-unofficial-api/src/mcp.js"]
    }
  }
}
```

### Available MCP Tools

- **`gemini_ask`**: Ask questions or generate text/code with any Gemini model
- **`gemini_ask_with_file`**: Inspect local files (images, PDFs, videos, code, audio)
- **`gemini_upload_file`**: Upload a file to Google CDN storage and get a file ID
- **`gemini_download_file`**: Download any remote file or image to disk or buffer
- **`gemini_list_models`**: View all supported models and capabilities

## Docs

| | |
|---|---|
| <img src="media/icon.svg" width="18" align="center"> [Guide](docs/guide.md) | Step-by-step usage: guest mode, login, file/video ops, constructor options |
| <img src="media/icon.svg" width="18" align="center"> [API Reference](docs/api.md) | Full docs for all 30+ methods with parameters and return types |
| <img src="media/icon.svg" width="18" align="center"> [Protocol](docs/protocol.md) | How the protocol works under the hood |

## License

MIT &copy; [etrnkz](https://github.com/etrnkz)
