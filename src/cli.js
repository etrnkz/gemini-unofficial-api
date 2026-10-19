#!/usr/bin/env node
import { GeminiClient } from './gemini.js';
import { startMcpServer } from './mcp.js';

if (process.argv[2] === 'mcp' || process.argv.includes('--mcp')) {
  startMcpServer();
} else {
  const client = new GeminiClient();

  const prompt = process.argv.slice(2).join(' ') || 'Say hello in one word';

  console.log(`Prompt: ${prompt}\n`);
  console.log('Connecting...');

  try {
    if (client.cookie && !client.isLoggedIn) {
      await client.init();
      console.log('Logged in:', client.isLoggedIn);
    }
    const response = await client.sendMessage(prompt);
    console.log('Response:', response.substring(0, 500));
  } catch (err) {
    console.error('Error:', err.message);
  }
}
