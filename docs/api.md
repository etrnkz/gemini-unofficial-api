# API Reference

## Text generation

### `sendMessage(prompt, opts?)`

Send a text prompt and get the response.

| Param | Type | Default |
|-------|------|---------|
| `prompt` | `string` | required |
| `opts.model` | `string` | `'gemini-3.5-flash'` |

Supported models: `gemini-3.5-flash`, `gemini-3.5-flash-thinking`, `gemini-3.1-pro`, `gemini-auto`, `gemini-flash-lite`.

### `streamMessage(prompt, opts?)`

Async generator that yields text deltas as they arrive.

## File upload

### `uploadFile(filePath)` / `uploadBuffer(buffer, filename)`

Upload a file to Google's CDN. Returns a file ID string.

### `sendMessageWithFiles(prompt, files, opts?)`

Upload files and send a message with them attached. Files can be `string` paths, `{buffer, filename}` objects, or `{fileId, filename}` objects. Returns `{text, images, videos, fileUrls}`.

### `sendImage(prompt, image, opts?)`

Convenience wrapper around `sendMessageWithFiles`. Takes a single image file path, buffer, or fileId. Returns `{text, images, videos, fileUrls}`.

### `streamImage(prompt, image, opts?)`

Async generator that yields text deltas while analyzing an image.

### `sendVideo(prompt, video, opts?)`

Convenience wrapper around `sendMessageWithFiles`. Takes a single video file path, buffer, or fileId. Returns `{text, images, videos, fileUrls}`.

### `streamVideo(prompt, video, opts?)`

Async generator that yields text deltas while sending a video.

## Authentication

### `login(cookieString)`

Authenticate with Google cookies. Returns the client instance.

### `init()`

Initialize session parameters (called automatically on first request). Called once to fetch `bl`, `pushId`, and `SNlM0e` token from the Gemini homepage.

### Constructor options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cookie` | `string` | `''` | Pre-set cookie string |
| `cookiesFile` | `string\|false` | `'cookies.json'` | Auto-load cookies from JSON file (`false` to disable) |

Auto-detected `cookies.json` supports two formats:
- `{ "cookie": "__Secure-1PSID=...; __Secure-1PSIDTS=..." }` — full cookie string
- `{ "__Secure-1PSID": "...", "__Secure-1PSIDTS": "..." }` — individual fields

### `cookie`

Property containing the current cookie string. Set via constructor, `cookiesFile`, or `login()`.

### `isLoggedIn`

Boolean getter — `true` if `SNlM0e` token was acquired.

## Media

### `downloadFile(url, destPath?)`

Download a file from Google's CDN. Returns buffer or writes to disk.

### `getFullSizeImage(cid, rid, rcid, imageId)`

Get the full-resolution URL for a generated image. Returns URL string or `null`.

## Chat management

| Method | Returns |
|--------|---------|
| `listChats(limit?)` | `[{cid, title, isPinned}]` |
| `readChat(cid, limit?)` | `[{rid, userText, modelTexts}]` |
| `deleteChat(cid)` | `true` |
| `renameChat(cid, title)` | `true` |
| `generateChatTitle(cid)` | `string` |

## Gems

| Method | Returns |
|--------|---------|
| `listGems({includeHidden?})` | `[{id, name, description, prompt, predefined}]` |
| `createGem({name, prompt, description?})` | `{id, name, description, prompt}` |
| `updateGem({gem, name, prompt, description?})` | `{id, name, description, prompt}` |
| `deleteGem(gem)` | `true` |

## Memory

| Method | Returns |
|--------|---------|
| `listMemories()` | `[{id, text, createdAt}]` |
| `createMemory(text)` | `{id, text}` |
| `updateMemory(id, text)` | `{id, text}` |
| `deleteMemory(id)` | `true` |
| `deleteAllMemories()` | `true` |

## Account

| Method | Returns |
|--------|---------|
| `getAccountStatus()` | `{statusCode, models, tierFlags, capFlags}` |
| `getSettings()` | `{featureFlag: value, ...}` |
| `getUsageInfo()` | `{tier, items, useOverage}` |
| `checkQuota(type?)` | `[{actionId, usageLevel, resetTime, total, remaining}]` |

## Research

| Method | Returns |
|--------|---------|
| `getDeepResearchCaps()` | raw response |
| `deepResearchBootstrap()` | raw response |

## Model Context Protocol (MCP)

### `startMcpServer(options?)`

Starts the Model Context Protocol stdio server for AI agents and editors.

### `createMcpHandler(clientOptions?)`

Returns an async function `handleMessage(jsonRpcMessage)` to handle JSON-RPC 2.0 messages programmatically.

### MCP Tools

| Tool | Parameters | Description |
|------|------------|-------------|
| `gemini_ask` | `prompt` (string), `model` (optional string) | Sends text prompt to Gemini |
| `gemini_ask_with_file` | `prompt` (string), `filePath` (string), `model` (optional string) | Sends prompt with uploaded file attachment |
| `gemini_upload_file` | `filePath` (string) | Uploads file to CDN and returns file ID |
| `gemini_list_models` | none | Lists supported models with details |
