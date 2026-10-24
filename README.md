<p align="center">
  <img src="media/banner.svg" alt="Gemini Unofficial API">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white" alt="Node 18+">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT">
  <img src="https://img.shields.io/badge/dependencies-2-lightgrey" alt="2 deps">
  <img src="https://img.shields.io/badge/status-active-success" alt="Active">
  <img src="https://img.shields.io/badge/PRs-welcome-8A2BE2" alt="PRs Welcome">
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="docs/guide.md">Guide</a> •
  <a href="docs/api.md">API</a> •
  <a href="docs/protocol.md">Protocol</a>
</p>

---

<p align="center">
  <strong>Unofficial reverse-engineered Node.js client for Google Gemini</strong>
  <br>
  No login required for text & images — cookies unlock Google Veo video generation and the full account suite.
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
| Video analysis | `sendVideo`, `streamVideo` | none |
| Video generation | `generateVideo`, `waitForVideo`, `downloadVideo` | cookie |
| Accounts | `listAccounts`, `useAccount`, `rotateAccount`, `addAccount` | optional |
| Chats | `listChats`, `readChat`, `deleteChat`, `renameChat`, `generateChatTitle` | cookie |
| Gems | `listGems`, `createGem`, `updateGem`, `deleteGem` | cookie |
| Memory | `listMemories`, `createMemory`, `updateMemory`, `deleteMemory`, `deleteAllMemories` | cookie |
| Account | `listModels`, `getAccountStatus`, `getSettings`, `getUsageInfo`, `checkQuota` | optional |
| Research | `getDeepResearchCaps`, `deepResearchBootstrap` | cookie |
| Media | `downloadFile`, `getFullSizeImage` | optional |

## Docs

| | |
|---|---|
| <img src="media/icon.svg" width="18" align="center"> [Guide](docs/guide.md) | Step-by-step usage: guest mode, login, file/video ops, Veo video generation, multi-account |
| <img src="media/icon.svg" width="18" align="center"> [API Reference](docs/api.md) | Full docs for all methods with parameters and return types |
| <img src="media/icon.svg" width="18" align="center"> [Protocol](docs/protocol.md) | How the reverse-engineered protocol works under the hood |

## License

MIT &copy; [etrnkz](https://github.com/etrnkz)
