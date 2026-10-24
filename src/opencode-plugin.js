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

      gemini_generate_video: {
        description: 'Generate a video with Google Veo via Gemini. Requires an authenticated account with video generation entitlement. Automatically polls until ready and can save to disk.',
        parameters: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Description of the video to generate',
            },
            destPath: {
              type: 'string',
              description: 'Optional file path to save the generated MP4 to (e.g. video.mp4)',
            },
            timeout: {
              type: 'number',
              description: 'Max seconds to wait for video generation (default 900)',
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
          const res = await gemini.generateVideo(args.prompt, {
            timeout: (args.timeout || 900) * 1000,
          });
          if (!res.ready) {
            return `Video generation in progress or timed out. Chat ID: ${res.chatId}\n${res.text || ''}`;
          }
          let out = `Video is ready!\nChat ID: ${res.chatId}\n`;
          if (args.destPath && res.videos.length > 0) {
            try {
              const savedPath = await gemini.downloadVideo(res.videos[0], args.destPath);
              out += `\nSaved video to: ${savedPath} (${fs.statSync(savedPath).size} bytes)\n`;
            } catch (e) {
              out += `\nFailed to download video to ${args.destPath}: ${e.message}\n`;
            }
          }
          for (const v of res.videos) {
            out += `\n- ${v.name} (${v.mime})\n  URL: ${v.url}\n`;
            if (v.downloadUrl) out += `  Download: ${v.downloadUrl}\n`;
          }
          return out.trim();
        },
      },

      gemini_download_file: {
        description: 'Download a remote file or media from a URL and save it to disk.',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL of the file or image to download',
            },
            destPath: {
              type: 'string',
              description: 'Local file path to save the file to',
            },
          },
          required: ['url', 'destPath'],
        },
        execute: async (args) => {
          const saved = await gemini.downloadFile(args.url, path.resolve(args.destPath));
          const size = fs.statSync(saved).size;
          return `Downloaded ${size} bytes to ${saved}`;
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
