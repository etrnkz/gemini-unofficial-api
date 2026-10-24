# Usage Guide

## Guest mode (no login)

```js
import { GeminiClient } from './src/gemini.js';

const client = new GeminiClient();

const text = await client.sendMessage('Tell me a joke');
console.log(text);

for await (const chunk of client.streamMessage('Count to 5')) {
  process.stdout.write(chunk);
}

const models = await client.listModels();
```

## With cookies (advanced features)

### Via cookies.json (auto-detected)

Save `cookies.json` in the project root:

```json
{
  "cookie": "__Secure-1PSID=...; __Secure-1PSIDTS=...; __Secure-ENID=..."
}
```

Or using individual cookie fields:

```json
{
  "__Secure-1PSID": "...",
  "__Secure-1PSIDTS": "..."
}
```

### Multi-Account Support

You can configure multiple accounts in `cookies.json`:

```json
{
  "accounts": [
    {
      "name": "pro",
      "__Secure-1PSID": "...",
      "__Secure-1PSIDTS": "..."
    },
    {
      "name": "backup",
      "cookie": "__Secure-1PSID=...; __Secure-1PSIDTS=..."
    }
  ]
}
```

Or pass multiple accounts via the constructor:

```js
const client = new GeminiClient({
  accounts: [
    { name: 'pro', cookie: '__Secure-1PSID=...' },
    { name: 'backup', cookie: '__Secure-1PSID=...' }
  ],
  autoRotate: true // automatically switch to next account on failure
});

// View all accounts
console.log(client.listAccounts());

// Switch active account by name or index
client.useAccount('backup');

// Rotate to next account
client.rotateAccount();
```

The client auto-detects it — no need to call `login()`:

```js
const client = new GeminiClient();
await client.init(); // loads cookies.json automatically
```

```js
const chats = await client.listChats();
const turns = await client.readChat(chats[0].cid);
await client.deleteChat(chats[0].cid);

const gems = await client.listGems();
const gem = await client.createGem({ name: 'Helper', prompt: 'You are...' });
await client.deleteGem(gem.id);

const memories = await client.listMemories();
await client.createMemory('I prefer dark mode');

const settings = await client.getSettings();
const usage = await client.getUsageInfo();
const quota = await client.checkQuota('flash');
```

### Via cookie string

```js
const client = new GeminiClient();
await client.login('__Secure-1PSID=...; __Secure-1PSIDTS=...');
```

Get cookies from `gemini.google.com` in Chrome DevTools > Application > Cookies.

## File, image & video operations

```js
const fileId = await client.uploadFile('./image.jpg');

// Analyze an image
const imgResult = await client.sendImage('Describe this image', './photo.jpg');
console.log(imgResult.text);

for await (const chunk of client.streamImage('Describe in detail', './photo.jpg')) {
  process.stdout.write(chunk);
}

// Analyze a video
const vidResult = await client.sendVideo('Analyze this video', './clip.mp4');
console.log(vidResult.text, vidResult.videos);

for await (const chunk of client.streamVideo('Describe this', './clip.mp4')) {
  process.stdout.write(chunk);
}

// Multiple files or generic file attachments
const result = await client.sendMessageWithFiles(
  'Summarize these files', ['./report.pdf', './code.js']
);
console.log(result.text, result.images);

const buffer = await client.downloadFile('https://lh3.googleusercontent.com/...');
```

## Video Generation (Google Veo)

Generate 720p 24fps videos with Google Veo via Gemini (requires an authenticated account with Veo entitlement):

```js
// Starts generation, polls the chat until ready, and returns video metadata
const res = await client.generateVideo('A red ball bouncing on wood, 4 seconds');

if (res.ready) {
  console.log('Video ready! Chat ID:', res.chatId);

  // Download directly to disk
  await client.downloadVideo(res.videos[0], 'output.mp4');
}

// Or poll an existing chat ID
const status = await client.waitForVideo('c_1f6980cd535d9775');
```

## Constructor options

```js
// Pre-set cookie on init
const client = new GeminiClient({ cookie: '__Secure-1PSID=...' });

// Custom cookies file path (default: cookies.json)
const client = new GeminiClient({ cookiesFile: 'secrets/cookies.json' });

// Disable auto-load from cookies.json
const client = new GeminiClient({ cookiesFile: false });

// Disable all auto-detection (guest mode only)
const client = new GeminiClient({ cookie: '', cookiesFile: false });
```
