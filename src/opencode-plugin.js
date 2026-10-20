import path from 'path';
import fs from 'fs';
import { GeminiClient } from './gemini.js';
import { MODELS } from './constants.js';

export async function geminiPlugin({ client: opencodeClient, project, directory, $ } = {}) {
  const gemini = new GeminiClient();

  return {
    tool: {
      gemini_ask: {
        description: 'Send a prompt to Google Gemini (free or authenticated with cookies.json). Useful for second opinions, reasoning, writing, or analysis.',
        parameters: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The prompt or question to send to Gemini',
            },
            model: {
              type: 'string',
              description: 'Model to use: gemini-3.5-flash (default), gemini-3.5-flash-thinking, gemini-3.1-pro, gemini-auto, gemini-flash-lite',
              enum: Object.keys(MODELS),
            },
            account: {
              type: 'string',
              description: 'Optional account name or index to use',
            },
          },
          required: ['prompt'],
        },
        execute: async (args) => {
          if (args.account) gemini.useAccount(args.account);
          return await gemini.sendMessage(args.prompt, { model: args.model });
        },
      },

      gemini_ask_with_file: {
        description: 'Ask Google Gemini to inspect and analyze a local file (images, videos, PDFs, code, audio, text).',
        parameters: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Prompt or instructions for analyzing the file',
            },
            filePath: {
              type: 'string',
              description: 'Path to the local file to inspect',
            },
            model: {
              type: 'string',
              description: 'Gemini model to use',
              enum: Object.keys(MODELS),
            },
            account: {
              type: 'string',
              description: 'Optional account name or index to use',
            },
          },
          required: ['prompt', 'filePath'],
        },
        execute: async (args) => {
          if (args.account) gemini.useAccount(args.account);
          const resolved = path.resolve(args.filePath);
          if (!fs.existsSync(resolved)) {
            throw new Error(`File not found: ${args.filePath}`);
          }
          const res = await gemini.sendMessageWithFiles(args.prompt, [resolved], { model: args.model });
          let output = res.text || '';
          if (res.images && res.images.length > 0) {
            output += '\n\nImages:\n' + res.images.map(i => `- ${i.url} (${i.type})`).join('\n');
          }
          if (res.videos && res.videos.length > 0) {
            output += '\n\nVideos:\n' + res.videos.map(v => `- ${v.url}`).join('\n');
          }
          return output;
        },
      },

      gemini_list_models: {
        description: 'List supported Gemini models and their configuration.',
        parameters: {
          type: 'object',
          properties: {},
        },
        execute: async () => {
          const list = await gemini.listModels();
          return JSON.stringify(list, null, 2);
        },
      },

      gemini_list_accounts: {
        description: 'List all loaded Google accounts and their login/active status.',
        parameters: {
          type: 'object',
          properties: {},
        },
        execute: async () => {
          const accounts = gemini.listAccounts();
          return JSON.stringify(accounts, null, 2);
        },
      },

      gemini_switch_account: {
        description: 'Switch the active account by name or index.',
        parameters: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Account name or numeric index to switch to',
            },
          },
          required: ['account'],
        },
        execute: async (args) => {
          const switched = gemini.useAccount(args.account);
          return `Switched active account to: ${switched.name}`;
        },
      },
    },
  };
}

export default geminiPlugin;
