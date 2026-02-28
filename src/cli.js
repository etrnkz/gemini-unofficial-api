#!/usr/bin/env node
import { GeminiClient } from './gemini.js';

const client = new GeminiClient({
  cookie: process.env.COOKIE || '',
});

const prompt = process.argv.slice(2).join(' ') || 'Say hello in one word';

console.log(`Prompt: ${prompt}\n`);
console.log('Connecting...');

try {
  if (client.cookie) {
    await client.login(client.cookie);
    console.log('Logged in:', client.isLoggedIn);
  }
  const response = await client.sendMessage(prompt);
  console.log('Response:', response.substring(0, 500));
} catch (err) {
  console.error('Error:', err.message);
}
