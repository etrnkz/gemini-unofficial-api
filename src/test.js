import fs from 'fs';
import { GeminiClient } from './gemini.js';

const client = new GeminiClient();

// Authenticate up front so logged-in features are exercised before the
// guest-mode tests consume the request budget.
if (process.env.COOKIE) {
  await client.login(process.env.COOKIE);
} else if (client.cookie) {
  await client.init();
}

console.log('Testing Gemini Unofficial API');
console.log('Logged in:', client.isLoggedIn, '\n');

// Test 1: Basic message
console.log('=== Test 1: Basic message ===');
const response = await client.sendMessage('Say hello in one word');
console.log('Response:', response);

// Test 2: Longer message
console.log('\n=== Test 2: Longer message ===');
const response2 = await client.sendMessage('What is the capital of France? Reply in one sentence.');
console.log('Response:', response2);

// Test 3: Different model
console.log('\n=== Test 3: Thinking model ===');
try {
  const response3 = await client.sendMessage('What is 2+2?', { model: 'gemini-3.5-flash-thinking' });
  console.log('Response:', response3);
} catch (e) {
  console.log('Thinking model error:', e.message);
}

// Test 4: Streaming mode
console.log('\n=== Test 4: Streaming mode ===');
for await (const chunk of client.streamMessage('Count from 1 to 3')) {
  process.stdout.write(chunk);
}
console.log('\n');

// Test 5: File upload
console.log('\n=== Test 5: File upload ===');
try {
  const fileId = await client.uploadFile('./package.json');
  console.log('File ID:', fileId);
} catch (e) {
  console.log('Upload error:', e.message);
}

// Test 6: File message
console.log('\n=== Test 6: File message ===');
try {
  const result = await client.sendMessageWithFiles('What package is this? Name only.', ['./package.json']);
  console.log('Response:', result.text.substring(0, 200));
} catch (e) {
  console.log('File error:', e.message);
}

// Test 7: Image message
console.log('\n=== Test 7: Image support ===');
try {
  const pngPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const imgResult = await client.sendImage('What color is this image? One word.', { buffer: pngPixel, filename: 'pixel.png' });
  console.log('Response:', imgResult.text.substring(0, 100));
} catch (e) {
  console.log('Image error:', e.message);
}

// Test 8: Video message
console.log('\n=== Test 8: Video support ===');
try {
  let vidBuffer = null;
  try {
    const { execSync } = await import('child_process');
    execSync('ffmpeg -y -f lavfi -i color=c=blue:s=64x64:d=1 -c:v libx264 -pix_fmt yuv420p test_blue.mp4', { stdio: 'pipe', shell: true });
    if (fs.existsSync('test_blue.mp4')) {
      vidBuffer = fs.readFileSync('test_blue.mp4');
      fs.unlinkSync('test_blue.mp4');
    }
  } catch { }

  if (vidBuffer) {
    const vidResult = await client.sendVideo('What color is this video? One word.', { buffer: vidBuffer, filename: 'blue.mp4' });
    console.log('Response:', vidResult.text.substring(0, 100));
  } else {
    console.log('Response: (ffmpeg skipped)');
  }
} catch (e) {
  console.log('Video error:', e.message);
}

// Test 9: Download support
console.log('\n=== Test 9: Download support ===');
try {
  let buf;
  try {
    buf = await client.downloadFile('https://www.google.com/favicon.ico');
  } catch {
    buf = await client.downloadFile('https://gemini.google.com/favicon.ico');
  }
  console.log('Downloaded bytes:', buf.length);
} catch (e) {
  console.log('Download error:', e.message);
}

// Test 10: MCP Protocol
console.log('\n=== Test 10: MCP Server Protocol ===');
try {
  const { createMcpHandler } = await import('./mcp.js');
  const handler = createMcpHandler();

  const initRes = await handler({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  console.log('MCP init server:', initRes.result.serverInfo.name);

  const toolsRes = await handler({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  console.log('MCP tools count:', toolsRes.result.tools.length);
  console.log('MCP tools:', toolsRes.result.tools.map(t => t.name).join(', '));

  const modelsCall = await handler({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'gemini_list_models', arguments: {} }
  });
  console.log('MCP tool call (models):', modelsCall.result.isError ? 'FAIL' : 'OK');

  const askCall = await handler({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: { name: 'gemini_ask', arguments: { prompt: 'Reply with the word PONG' } }
  });
  console.log('MCP tool call (ask):', askCall.result.content[0].text.substring(0, 80));

  const downloadCall = await handler({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: { name: 'gemini_download_file', arguments: { url: 'https://www.google.com/favicon.ico' } }
  });
  console.log('MCP tool call (download):', downloadCall.result.content[0].text.substring(0, 80));

  const accountsCall = await handler({
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: { name: 'gemini_list_accounts', arguments: {} }
  });
  console.log('MCP tool call (accounts):', accountsCall.result.isError ? 'FAIL' : 'OK');
} catch (e) {
  console.log('MCP error:', e.message);
}

// Test 11: Multi-Account Management
console.log('\n=== Test 11: Multi-Account Management ===');
try {
  const multi = new GeminiClient({
    cookiesFile: false,
    accounts: [
      { name: 'pro-user', cookie: '__Secure-1PSID=token_pro' },
      { name: 'backup-user', cookie: '__Secure-1PSID=token_backup' }
    ]
  });
  console.log('Loaded accounts:', multi.accounts.length);
  const initial = multi.listAccounts();
  console.log('Active account:', initial.find(a => a.active)?.name);

  multi.rotateAccount();
  const rotated = multi.listAccounts();
  console.log('After rotate:', rotated.find(a => a.active)?.name);

  multi.useAccount('pro-user');
  const switched = multi.listAccounts();
  console.log('After switch back:', switched.find(a => a.active)?.name);
} catch (e) {
  console.log('Multi-account error:', e.message);
}

// Post-login features
if (client.isLoggedIn) {
  console.log('\n=== Post-login features ===');
  console.log('Logged in:', client.isLoggedIn);

  console.log('\n--- listModels ---');
  const models = await client.listModels();
  console.log('Models:', models.slice(0, 5).map(m => m.name).join(', '));

  console.log('\n--- getUsageInfo ---');
  try {
    const usage = await client.getUsageInfo();
    console.log('Tier:', usage?.tier?.label, '| remaining:', usage?.items?.map(i => i.remaining).join(', '));
  } catch (e) { console.log('Usage error:', e.message); }

  console.log('\n--- listChats ---');
  let chats = [];
  try {
    chats = await client.listChats(3);
    console.log('Recent chats:', chats.length);
  } catch (e) { console.log('Chats error:', e.message); }

  console.log('\n--- sendMessageWithFiles ---');
  try {
    const result = await client.sendMessageWithFiles(
      'What does this file contain? Reply in 3 words.',
      ['./package.json']
    );
    console.log('Response:', result.text);
    if (result.images.length) {
      console.log('Images:', result.images.length);
    }
  } catch (e) { console.log('Send files error:', e.message); }

  console.log('\n--- listGems ---');
  try {
    const gems = await client.listGems();
    console.log('Gems:', gems.length);
  } catch (e) { console.log('Gems error:', e.message); }

  console.log('\n--- getAccountStatus ---');
  try {
    const status = await client.getAccountStatus();
    console.log('Status code:', status.statusCode);
    console.log('Models:', status.models.length);
  } catch (e) { console.log('Account status error:', e.message); }

  console.log('\n--- getSettings ---');
  try {
    const settings = await client.getSettings();
    console.log('Setting keys:', Object.keys(settings).length);
  } catch (e) { console.log('Settings error:', e.message); }

  console.log('\n--- getUsageInfo ---');
  try {
    const usage = await client.getUsageInfo();
    console.log('Usage:', usage ? `tier=${usage.tier?.label}` : 'null');
  } catch (e) { console.log('Usage info error:', e.message); }

  console.log('\n--- checkQuota ---');
  try {
    const quota = await client.checkQuota('flash');
    console.log('Quota items:', quota?.length || 0);
  } catch (e) { console.log('Quota error:', e.message); }

  console.log('\n--- generateChatTitle ---');
  try {
    if (chats.length > 0) {
      const title = await client.generateChatTitle(chats[0].cid);
      console.log('Suggested title:', title);
    }
  } catch (e) { console.log('Generate title error:', e.message); }

  console.log('\n--- deepResearchCaps ---');
  try {
    const caps = await client.getDeepResearchCaps();
    console.log('DR caps:', caps ? 'available' : 'null');
  } catch (e) { console.log('DR caps error:', e.message); }

  console.log('\n--- listMemories ---');
  try {
    const memories = await client.listMemories();
    console.log('Memories:', memories.length);
  } catch (e) { console.log('Memories error:', e.message); }

  console.log('\n--- generateVideo (Veo) ---');
  if (process.env.VIDEO_TEST === '1') {
    try {
      const vid = await client.generateVideo('A green apple rolling on a white table, 4 seconds', {
        timeout: 900000,
        interval: 15000,
      });
      console.log('Ready:', vid.ready, '| chatId:', vid.chatId);
      if (vid.ready && vid.videos.length) {
        console.log('Video:', vid.videos[0].name, vid.videos[0].mime);
        const out = await client.downloadVideo(vid.videos[0], 'test_generated_video.mp4', { timeout: 600000 });
        console.log('Downloaded to:', out, fs.statSync(out).size, 'bytes');
        fs.unlinkSync(out);
      } else {
        console.log('Status:', vid.text);
      }
    } catch (e) { console.log('Video generation error:', e.message); }
  } else {
    console.log('Skipped. Run with VIDEO_TEST=1 to enable (consumes Veo quota).');
  }
} else {
  console.log('\n=== Post-login (skipped) ===');
  console.log('Set cookies via:');
  console.log('  1. COOKIE env var: $env:COOKIE="__Secure-1PSID=..." node src/test.js');
  console.log('  2. cookies.json: { "cookie": "__Secure-1PSID=...; __Secure-1PSIDTS=..." }');
  console.log('  3. cookies.json: { "__Secure-1PSID": "...", "__Secure-1PSIDTS": "..." }');
}

console.log('\nDone!');
