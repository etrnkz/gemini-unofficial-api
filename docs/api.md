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

## Video generation (Google Veo)

### `generateVideo(prompt, opts?)`

Generates a video with Google Veo through Gemini. Requires an authenticated account with video generation entitlement. Sends the prompt, then polls the chat until the video is ready.

| Opt | Type | Default | Description |
|-----|------|---------|-------------|
| `model` | `string` | `'gemini-3.1-pro'` | Model used for generation |
| `timeout` | `number` | `600000` | Max milliseconds to wait |
| `interval` | `number` | `15000` | Poll interval in milliseconds |

Returns `{ready, chatId, text, videos, images}`. When `ready` is `true`, `videos[0]` contains `{url, downloadUrl, name, mime}`.

```js
const res = await client.generateVideo('A red ball bouncing on wood, 4 seconds');
if (res.ready) {
  console.log(res.videos[0].downloadUrl);
  await client.downloadFile(res.videos[0].url, 'video.mp4');
}
```

### `waitForVideo(chatId, opts?)`

Polls an existing chat until a generated video becomes ready. Same options and return shape as `generateVideo`.

## Authentication

### `login(cookieString)`

Authenticate with Google cookies. Returns the client instance.

### `init()`

Initialize session parameters (called automatically on first request). Called once to fetch `bl`, `pushId`, and `SNlM0e` token from the Gemini homepage.

### Constructor options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cookie` | `string` | `''` | Pre-set cookie string |
| `accounts` | `Array` | `[]` | Array of account objects `{ name, cookie }` |
| `cookiesFile` | `string\|false` | `'cookies.json'` | Auto-load cookies from JSON file (`false` to disable) |
| `autoRotate` | `boolean` | `true` | Automatically rotate to next account on failure |

Auto-detected `cookies.json` supports single and multi-account configurations:
- `{ "cookie": "__Secure-1PSID=...; __Secure-1PSIDTS=..." }` — single account
- `{ "__Secure-1PSID": "...", "__Secure-1PSIDTS": "..." }` — individual fields
- `{ "accounts": [{ "name": "pro", "cookie": "..." }, { "name": "backup", ... }] }` — multi-account list

### Multi-Account methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `listAccounts()` | none | `Array` | List all accounts with index, name, active, and login status |
| `useAccount(nameOrIndex)` | `nameOrIndex` (string\|number) | `Account` | Switch the active account |
| `rotateAccount()` | none | `Account` | Rotate to the next available account |
| `addAccount(data, name?)` | `data` (string\|object), `name?` | `Account` | Add or update an account in the pool |

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
| `gemini_download_file` | `url` (string), `destPath` (optional string) | Downloads a remote file/image to buffer or disk |
| `gemini_list_models` | none | Lists supported models with details |
| `gemini_generate_video` | `prompt` (string), `model` (optional), `timeout` (optional) | Generates a video with Veo and polls until ready |
| `gemini_list_accounts` | none | Lists all loaded accounts and active status |
| `gemini_switch_account` | `account` (string) | Switches active account by name or index |
