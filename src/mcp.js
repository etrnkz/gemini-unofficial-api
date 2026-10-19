#!/usr/bin/env node
import readline from 'readline';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GeminiClient } from './gemini.js';
import { MODELS } from './constants.js';

const TOOLS = [
  {
    name: 'gemini_ask',
    description: 'Ask Google Gemini a question or send a prompt. Supports text generation, reasoning, and coding. Works with or without Google login cookies.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The prompt or question to send to Gemini',
        },
        model: {
          type: 'string',
          description: 'Gemini model to use',
          enum: Object.keys(MODELS),
          default: 'gemini-3.5-flash',
        },
        account: {
          type: 'string',
          description: 'Optional account name or index to use for this request',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'gemini_ask_with_file',
    description: 'Ask Google Gemini a question about a local file (images, videos, PDFs, audio, code, documents). The file is uploaded and analyzed by Gemini.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Prompt or question instructing Gemini how to analyze the file',
        },
        filePath: {
          type: 'string',
          description: 'Path to the local file to upload and inspect (image, video, code, document, etc.)',
        },
        model: {
          type: 'string',
          description: 'Gemini model to use',
          enum: Object.keys(MODELS),
          default: 'gemini-3.5-flash',
        },
        account: {
          type: 'string',
          description: 'Optional account name or index to use for this request',
        },
      },
      required: ['prompt', 'filePath'],
    },
  },
  {
    name: 'gemini_upload_file',
    description: 'Upload a local file to Google CDN storage and return the file ID.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the local file to upload',
        },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'gemini_download_file',
    description: 'Download a remote file or image (such as an image or media URL returned by Gemini) and optionally save it to disk.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL of the file or image to download',
        },
        destPath: {
          type: 'string',
          description: 'Optional local file path to save the downloaded file to',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'gemini_list_models',
    description: 'List all supported Google Gemini models with their capabilities and descriptions.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'gemini_list_accounts',
    description: 'List all loaded Google accounts, which one is currently active, and their login status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'gemini_switch_account',
    description: 'Switch the active account by name or index for subsequent requests.',
    inputSchema: {
      type: 'object',
      properties: {
        account: {
          type: 'string',
          description: 'Account name or numeric index to switch to',
        },
      },
      required: ['account'],
    },
  },
];

export function createMcpHandler(clientOptions = {}) {
  const client = new GeminiClient(clientOptions);

  return async function handleMessage(message) {
    if (!message || typeof message !== 'object') return null;
    const { id, method, params } = message;

    // Handle notifications (no id)
    if (id === undefined || id === null) {
      if (method === 'notifications/initialized') {
        process.stderr.write('[MCP] Client initialized\n');
      }
      return null;
    }

    try {
      switch (method) {
        case 'initialize': {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
              },
              serverInfo: {
                name: 'gemini-unofficial-api',
                version: '1.0.0',
              },
            },
          };
        }

        case 'ping': {
          return { jsonrpc: '2.0', id, result: {} };
        }

        case 'tools/list': {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: TOOLS,
            },
          };
        }

        case 'tools/call': {
          const { name, arguments: args = {} } = params || {};
          const result = await executeTool(client, name, args);
          return {
            jsonrpc: '2.0',
            id,
            result,
          };
        }

        default: {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
          };
        }
      }
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: err.message || 'Internal error',
        },
      };
    }
  };
}

async function executeTool(client, name, args) {
  try {
    if (args.account !== undefined && args.account !== null) {
      client.useAccount(args.account);
    }

    switch (name) {
      case 'gemini_ask': {
        const { prompt, model = 'gemini-3.5-flash' } = args;
        if (!prompt) throw new Error('Missing required argument: prompt');
        const text = await client.sendMessage(prompt, { model });
        return {
          content: [{ type: 'text', text: text || '(No response text)' }],
          isError: false,
        };
      }

      case 'gemini_ask_with_file': {
        const { prompt, filePath, model = 'gemini-3.5-flash' } = args;
        if (!prompt) throw new Error('Missing required argument: prompt');
        if (!filePath) throw new Error('Missing required argument: filePath');

        const resolved = path.resolve(filePath);
        if (!fs.existsSync(resolved)) {
          throw new Error(`File not found: ${filePath}`);
        }

        const res = await client.sendMessageWithFiles(prompt, [resolved], { model });
        let outText = res.text || '';

        if (res.images && res.images.length > 0) {
          outText += '\n\nImages:\n' + res.images.map(i => `- ${i.url} (${i.type})`).join('\n');
        }
        if (res.videos && res.videos.length > 0) {
          outText += '\n\nVideos:\n' + res.videos.map(v => `- ${v.url}`).join('\n');
        }
        if (res.fileUrls && res.fileUrls.length > 0) {
          outText += '\n\nFiles:\n' + res.fileUrls.join('\n');
        }

        return {
          content: [{ type: 'text', text: outText.trim() }],
          isError: false,
        };
      }

      case 'gemini_upload_file': {
        const { filePath } = args;
        if (!filePath) throw new Error('Missing required argument: filePath');

        const resolved = path.resolve(filePath);
        if (!fs.existsSync(resolved)) {
          throw new Error(`File not found: ${filePath}`);
        }

        const fileId = await client.uploadFile(resolved);
        return {
          content: [{ type: 'text', text: fileId }],
          isError: false,
        };
      }

      case 'gemini_download_file': {
        const { url, destPath } = args;
        if (!url) throw new Error('Missing required argument: url');

        const resolved = destPath ? path.resolve(destPath) : null;
        const res = await client.downloadFile(url, resolved);
        if (resolved) {
          return {
            content: [{ type: 'text', text: `Saved file to ${resolved} (${fs.statSync(resolved).size} bytes)` }],
            isError: false,
          };
        }
        return {
          content: [{ type: 'text', text: `Downloaded ${res.length} bytes successfully` }],
          isError: false,
        };
      }

      case 'gemini_list_models': {
        const models = await client.listModels();
        return {
          content: [{ type: 'text', text: JSON.stringify(models, null, 2) }],
          isError: false,
        };
      }

      case 'gemini_list_accounts': {
        const accounts = client.listAccounts();
        return {
          content: [{ type: 'text', text: JSON.stringify(accounts, null, 2) }],
          isError: false,
        };
      }

      case 'gemini_switch_account': {
        const { account } = args;
        if (account === undefined || account === null) throw new Error('Missing required argument: account');
        const switched = client.useAccount(account);
        return {
          content: [{ type: 'text', text: `Switched active account to: ${switched.name}` }],
          isError: false,
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    };
  }
}

export function startMcpServer(options = {}) {
  const handleMessage = createMcpHandler(options);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  process.stderr.write('[MCP] Gemini Unofficial API MCP Server running on stdio\n');

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const msg = JSON.parse(trimmed);
      const res = await handleMessage(msg);
      if (res) {
        process.stdout.write(JSON.stringify(res) + '\n');
      }
    } catch (e) {
      process.stderr.write(`[MCP Error] Failed to parse JSON-RPC: ${e.message}\n`);
    }
  });

  rl.on('close', () => {
    process.stderr.write('[MCP] Connection closed\n');
    process.exit(0);
  });
}

// Auto-run if executed directly as a script
if (process.argv[1]) {
  try {
    const isDirectRun = fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
    if (isDirectRun) startMcpServer();
  } catch { }
}
