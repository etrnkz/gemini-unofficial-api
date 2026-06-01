import { GeminiClient } from './gemini.js';

const client = new GeminiClient();

console.log('Testing Gemini Unofficial API (no login)...\n');

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

// Test 6: File message (needs login)
console.log('\n=== Test 6: File message (guest mode) ===');
try {
  const result = await client.sendMessageWithFiles('./package.json', ['./package.json']);
  console.log('Response:', result.text);
} catch (e) {
  console.log('Expected - guest mode:', e.message);
}

// Post-login features (auto-detected from cookies.json or COOKIE env var)
if (process.env.COOKIE) {
  await client.login(process.env.COOKIE);
}
if (client.cookie && !client.isLoggedIn) {
  await client.init();
}
if (client.isLoggedIn) {
  console.log('\n=== Post-login features ===');
  console.log('Logged in:', client.isLoggedIn);

  console.log('\n--- listModels ---');
  const models = await client.listModels();
  console.log('Models:', models.slice(0, 5).map(m => m.name).join(', '));

  console.log('\n--- listChats ---');
  const chats = await client.listChats(3);
  console.log('Recent chats:', chats.length);

  console.log('\n--- sendMessageWithFiles ---');
  const result = await client.sendMessageWithFiles(
    'What does this file contain? Reply in 3 words.',
    ['./package.json']
  );
  console.log('Response:', result.text);
  if (result.images.length) {
    console.log('Images:', result.images.length);
  }

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
} else {
  console.log('\n=== Post-login (skipped) ===');
  console.log('Set cookies via:');
  console.log('  1. COOKIE env var: $env:COOKIE="__Secure-1PSID=..." node src/test.js');
  console.log('  2. cookies.json: { "cookie": "__Secure-1PSID=...; __Secure-1PSIDTS=..." }');
  console.log('  3. cookies.json: { "__Secure-1PSID": "...", "__Secure-1PSIDTS": "..." }');
}

console.log('\nDone!');
