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

```js
const client = new GeminiClient();
await client.login('__Secure-1PSID=...; __Secure-1PSIDTS=...');

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

Get cookies from `gemini.google.com` in Chrome DevTools > Application > Cookies.

## File / video operations

```js
const fileId = await client.uploadFile('./image.jpg');

const result = await client.sendMessageWithFiles(
  'Describe this image', ['./photo.jpg']
);
console.log(result.text, result.images);

const vidResult = await client.sendVideo('Analyze this video', './clip.mp4');
console.log(vidResult.text, vidResult.videos);

for await (const chunk of client.streamVideo('Describe this', './clip.mp4')) {
  process.stdout.write(chunk);
}

const buffer = await client.downloadFile('https://lh3.googleusercontent.com/...');
```

## Constructor options

```js
// Pre-set cookie on init
const client = new GeminiClient({ cookie: '__Secure-1PSID=...' });
```
