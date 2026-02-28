import fetch, { FormData } from 'node-fetch';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { BASE, UPLOAD_URL, UA, MODELS, parseWrb, findWrbResult } from './constants.js';

export class GeminiClient {
  constructor({ cookie, proxy } = {}) {
    this.cookie = cookie || '';
    this.bl = null;
    this.reqId = Math.floor(Math.random() * 900000) + 100000;
    this.proxy = proxy;
    this.pushId = null;
    this._atToken = null;
  }

  get isLoggedIn() {
    return !!this._atToken;
  }

  async init() {
    const res = await fetch(`${BASE}/`, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const rawCookies = res.headers.raw()['set-cookie'] || [];
    if (!this.cookie) {
      this.cookie = rawCookies.map(c => c.split(';')[0]).join('; ');
    }

    const html = await res.text();
    const blMatch = html.match(/boq_assistant[\w.-]+/);
    this.bl = blMatch ? blMatch[0] : 'boq_assistant-bard-web-server_20260529.02_p0';

    const pushIdx = html.indexOf('feeds/mcud');
    if (pushIdx > -1) {
      const qBefore = html.lastIndexOf('"', pushIdx);
      const qAfter = html.indexOf('"', pushIdx);
      if (qBefore > -1 && qAfter > -1) {
        this.pushId = html.substring(qBefore + 1, qAfter);
      }
    }

    const atMatch = html.match(/"SNlM0e"\s*:\s*"(.*?)"/);
    if (atMatch) {
      this._atToken = atMatch[1];
    }

    return this;
  }

  async login(cookieString) {
    this.cookie = cookieString;
    this.bl = null;
    this._atToken = null;
    this.pushId = null;
    await this.init();
    return this;
  }

  _buildPayload(prompt, modelId, thinkMode, files = null) {
    const inner = new Array(80).fill(null);
    inner[0] = [prompt, 0, null, files, null, null, 0];
    inner[1] = ['en'];
    inner[2] = ['', '', '', null, null, null, null, null, null, ''];
    inner[6] = [0];
    inner[7] = 1;
    inner[10] = 1;
    inner[11] = 0;
    inner[17] = [[thinkMode]];
    inner[18] = 0;
    inner[27] = 1;
    inner[30] = [4];
    inner[41] = [2];
    inner[53] = 0;
    inner[59] = crypto.randomUUID();
    inner[61] = [];
    inner[68] = 1;
    inner[79] = modelId;

    const outer = [null, JSON.stringify(inner)];
    const params = new URLSearchParams();
    params.append('f.req', JSON.stringify(outer));
    if (this._atToken) {
      params.append('at', this._atToken);
    }
    return params.toString();
  }

  _request(prompt, modelId, thinkMode, files = null) {
    if (!this.bl) return this.init().then(() => this._doRequest(prompt, modelId, thinkMode, files));
    return this._doRequest(prompt, modelId, thinkMode, files);
  }

  async _doRequest(prompt, modelId, thinkMode, files = null) {
    const reqId = ++this.reqId;
    const body = this._buildPayload(prompt, modelId, thinkMode, files);
    const url = `${BASE}/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl=${this.bl}&hl=en&_reqid=${reqId}&rt=c`;

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'https://gemini.google.com',
      'Referer': 'https://gemini.google.com/app',
      'X-Same-Domain': '1',
      'User-Agent': UA,
    };
    if (this.cookie) {
      headers['Cookie'] = this.cookie;
    }

    const res = await fetch(url, { method: 'POST', headers, body });
    return res.text();
  }

  async _doStreamRequest(prompt, modelId, thinkMode, files = null) {
    const reqId = ++this.reqId;
    const body = this._buildPayload(prompt, modelId, thinkMode, files);
    const url = `${BASE}/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl=${this.bl}&hl=en&_reqid=${reqId}&rt=c`;

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'https://gemini.google.com',
      'Referer': 'https://gemini.google.com/app',
      'X-Same-Domain': '1',
      'User-Agent': UA,
    };
    if (this.cookie) headers['Cookie'] = this.cookie;

    const res = await fetch(url, { method: 'POST', headers, body });
    return res.text();
  }

  async _upload(fileContent, fileName, contentType) {
    if (!this.pushId) await this.init();
    const form = new FormData();
    const blob = new Blob([fileContent], { type: contentType });
    form.append('file', blob, fileName);

    const headers = {
      'X-Tenant-Id': 'bard-storage',
      'Push-ID': this.pushId,
      'Origin': 'https://gemini.google.com',
      'Referer': 'https://gemini.google.com/',
      'User-Agent': UA,
    };
    if (this.cookie) headers['Cookie'] = this.cookie;

    const res = await fetch(UPLOAD_URL, {
      method: 'POST', headers, body: form, redirect: 'follow',
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
    return (await res.text()).trim();
  }

  _stripFramePrefix(raw) {
    let content = raw;
    if (content.startsWith(")]}'")) content = content.slice(4);
    return content.trim();
  }

  async _batchExec(rpcId, payload, sourcePath = '/app', closeOnError = true) {
    if (!this._atToken) throw new Error('Login required. Use client.login(cookie) first.');
    if (!this.bl) await this.init();

    const reqId = ++this.reqId;
    const qp = new URLSearchParams();
    qp.append('rpcids', rpcId);
    qp.append('hl', 'en');
    qp.append('_reqid', reqId);
    qp.append('rt', 'c');
    qp.append('source-path', sourcePath);
    qp.append('bl', this.bl);

    const bp = new URLSearchParams();
    bp.append('f.req', JSON.stringify([[rpcId, payload, null, 'generic']]));
    bp.append('at', this._atToken);

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      'Origin': 'https://gemini.google.com',
      'Referer': 'https://gemini.google.com/',
      'X-Same-Domain': '1',
      'x-goog-ext-525001261-jspb': '[1,null,null,null,null,null,null,null,[4]]',
      'x-goog-ext-73010989-jspb': '[0]',
      'User-Agent': UA,
    };
    if (this.cookie) headers['Cookie'] = this.cookie;

    const url = `${BASE}/_/BardChatUi/data/batchexecute?${qp.toString()}`;
    const res = await fetch(url, { method: 'POST', headers, body: bp.toString() });
    if (!res.ok && closeOnError) throw new Error(`Batch exec failed: ${res.status}`);
    return this._stripFramePrefix(await res.text());
  }

  _extractText(raw) {
    let finalText = '';
    for (const rawLine of raw.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith(')]}') || line === '') continue;
      try {
        const parsed = JSON.parse(line);
        if (!Array.isArray(parsed)) continue;
        const innerStr = parsed[0]?.[2];
        if (!innerStr || innerStr.length < 50) continue;
        const inner = JSON.parse(innerStr);
        if (!Array.isArray(inner) || inner.length < 5) continue;
        const parts = inner[4];
        if (!Array.isArray(parts)) continue;
        for (const part of parts) {
          if (Array.isArray(part) && part.length > 1 && Array.isArray(part[1])) {
            for (const t of part[1]) {
              if (typeof t === 'string' && t.length > 0) {
                finalText = t;
              }
            }
          }
        }
      } catch { }
    }
    return finalText;
  }

  _extractResponse(raw) {
    let finalText = '';
    const fileUrls = [];
    const images = [];
    const videos = [];
    for (const rawLine of raw.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith(')]}') || line === '') continue;
      try {
        const parsed = JSON.parse(line);
        if (!Array.isArray(parsed)) continue;
        const innerStr = parsed[0]?.[2];
        if (!innerStr || innerStr.length < 50) continue;
        const inner = JSON.parse(innerStr);
        if (!Array.isArray(inner) || inner.length < 5) continue;

        const parts = inner[4];
        if (Array.isArray(parts)) {
          for (const part of parts) {
            if (Array.isArray(part) && part.length > 1 && Array.isArray(part[1])) {
              for (const t of part[1]) {
                if (typeof t === 'string' && t.length > 0) {
                  finalText = t;
                }
              }
            }
          }
        }

        const c12 = inner[12];
        if (Array.isArray(c12)) {
          for (const item of c12) {
            if (Array.isArray(item)) {
              for (const sub of item) {
                if (typeof sub === 'string' && sub.includes('googleusercontent.com')) {
                  fileUrls.push(sub);
                }
              }
            }
          }
          const genImages = c12[7]?.[0];
          if (Array.isArray(genImages)) {
            for (const img of genImages) {
              const url = img?.[0]?.[3]?.[3];
              const alt = img?.[0]?.[3]?.[2] || '';
              const imageId = img?.[1]?.[0];
              if (url) images.push({ url, alt, imageId, type: 'generated' });
            }
          }
          const img2img = c12[0]?.['8']?.[0];
          if (Array.isArray(img2img)) {
            for (const img of img2img) {
              const url = img?.[0]?.[3]?.[3];
              const alt = img?.[0]?.[3]?.[2] || '';
              const imageId = img?.[1]?.[0];
              if (url) images.push({ url, alt, imageId, type: 'generated' });
            }
          }
          const webImages = c12[1];
          if (Array.isArray(webImages)) {
            for (const img of webImages) {
              const url = img?.[0]?.[0]?.[0];
              const alt = img?.[0]?.[4] || '';
              if (url) images.push({ url, alt, type: 'web' });
            }
          }

          const videoEntry = c12[6];
          if (Array.isArray(videoEntry)) {
            for (const v of videoEntry) {
              if (Array.isArray(v)) {
                const url = v[0]?.[3]?.[3];
                const alt = v[0]?.[3]?.[2] || '';
                const thumbUrl = v[0]?.[3]?.[6]?.[0]?.[3]?.[3];
                const durationMs = v[0]?.[3]?.[9];
                if (url) videos.push({ url, alt: alt || '', thumbnail: thumbUrl || null, durationMs: durationMs || null });
              }
            }
          }
        }
      } catch { }
    }
    return { text: finalText, fileUrls: [...new Set(fileUrls)], images, videos };
  }

  async sendMessage(prompt, { model = 'gemini-3.5-flash' } = {}) {
    const cfg = MODELS[model];
    if (!cfg) throw new Error(`Unknown model: ${model}`);
    if (!this.bl) await this.init();
    const raw = await this._request(prompt, cfg.mode, cfg.think);
    return this._extractText(raw);
  }

  async *streamMessage(prompt, { model = 'gemini-3.5-flash' } = {}) {
    const cfg = MODELS[model];
    if (!cfg) throw new Error(`Unknown model: ${model}`);
    if (!this.bl) await this.init();

    const text = await this._doStreamRequest(prompt, cfg.mode, cfg.think);
    let prevText = '';
    for (const rawLine of text.split('\n')) {
      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith(')]}') || trimmed === '') continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) continue;
        const innerStr = parsed[0]?.[2];
        if (!innerStr || innerStr.length < 50) continue;
        const inner = JSON.parse(innerStr);
        if (!Array.isArray(inner) || inner.length < 5) continue;
        const parts = inner[4];
        if (!Array.isArray(parts)) continue;
        for (const part of parts) {
          if (Array.isArray(part) && part.length > 1 && Array.isArray(part[1])) {
            for (const t of part[1]) {
              if (typeof t === 'string' && t.length > prevText.length) {
                const delta = t.slice(prevText.length);
                if (delta) yield delta;
                prevText = t;
              }
            }
          }
        }
      } catch { }
    }
  }

  async uploadFile(filePath) {
    const content = fs.readFileSync(filePath);
    const name = path.basename(filePath);
    const type = mime.lookup(name) || 'application/octet-stream';
    return this._upload(content, name, type);
  }

  async uploadBuffer(buffer, filename) {
    const type = mime.lookup(filename) || 'application/octet-stream';
    return this._upload(buffer, filename, type);
  }

  async sendMessageWithFiles(prompt, files, { model = 'gemini-3.5-flash' } = {}) {
    const cfg = MODELS[model];
    if (!cfg) throw new Error(`Unknown model: ${model}`);

    const fileData = [];
    for (const file of files) {
      let fileId, fileName;
      if (typeof file === 'string') {
        fileId = await this.uploadFile(file);
        fileName = path.basename(file);
      } else if (file.buffer) {
        fileId = await this.uploadBuffer(file.buffer, file.filename);
        fileName = file.filename;
      } else if (file.fileId) {
        fileId = file.fileId;
        fileName = file.filename || 'file';
      } else {
        throw new Error('Invalid file entry. Use string path, {buffer, filename}, or {fileId, filename}');
      }
      fileData.push([[fileId], fileName]);
    }

    if (!this.bl) await this.init();
    const raw = await this._request(prompt, cfg.mode, cfg.think, fileData);
    return this._extractResponse(raw);
  }

  async *streamWithFiles(prompt, files, { model = 'gemini-3.5-flash' } = {}) {
    const cfg = MODELS[model];
    if (!cfg) throw new Error(`Unknown model: ${model}`);
    if (!this.bl) await this.init();

    const fileData = [];
    for (const file of files) {
      let fileId, fileName;
      if (typeof file === 'string') {
        fileId = await this.uploadFile(file);
        fileName = path.basename(file);
      } else if (file.buffer) {
        fileId = await this.uploadBuffer(file.buffer, file.filename);
        fileName = file.filename;
      } else if (file.fileId) {
        fileId = file.fileId;
        fileName = file.filename || 'file';
      } else {
        throw new Error('Invalid file entry');
      }
      fileData.push([[fileId], fileName]);
    }

    const text = await this._doStreamRequest(prompt, cfg.mode, cfg.think, fileData);
    let prevText = '';
    for (const rawLine of text.split('\n')) {
      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith(')]}') || trimmed === '') continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) continue;
        const innerStr = parsed[0]?.[2];
        if (!innerStr || innerStr.length < 50) continue;
        const inner = JSON.parse(innerStr);
        if (!Array.isArray(inner) || inner.length < 5) continue;
        const parts = inner[4];
        if (!Array.isArray(parts)) continue;
        for (const part of parts) {
          if (Array.isArray(part) && part.length > 1 && Array.isArray(part[1])) {
            for (const t of part[1]) {
              if (typeof t === 'string' && t.length > prevText.length) {
                const delta = t.slice(prevText.length);
                if (delta) yield delta;
                prevText = t;
              }
            }
          }
        }
      } catch { }
    }
  }

  async sendVideo(prompt, video, { model = 'gemini-3.5-flash' } = {}) {
    return this.sendMessageWithFiles(prompt, [video], { model });
  }

  async *streamVideo(prompt, video, { model = 'gemini-3.5-flash' } = {}) {
    yield* this.streamWithFiles(prompt, [video], { model });
  }

  async listModels() {
    const raw = await this._batchExec('otAQ7b', '[]');
    const body = findWrbResult(raw, 'otAQ7b');
    const models = body?.[15];
    if (Array.isArray(models)) {
      return models.map(m => ({
        id: m?.[0] || '',
        name: m?.[1] || '',
        description: m?.[2] || '',
      })).filter(m => m.id);
    }
    return [];
  }

  async listChats(limit = 13) {
    const r1 = await this._batchExec('MaZiqc', JSON.stringify([limit, null, [1, null, 1]]));
    const r2 = await this._batchExec('MaZiqc', JSON.stringify([limit, null, [0, null, 1]]));
    const chats = [];
    for (const raw of [r1, r2]) {
      const body = findWrbResult(raw, 'MaZiqc');
      const list = body?.[2];
      if (Array.isArray(list)) {
        for (const c of list) {
          const cid = c?.[0] || '';
          const title = c?.[1] || '';
          const isPinned = !!c?.[2];
          if (cid) chats.push({ cid, title, isPinned });
        }
      }
    }
    return chats;
  }

  async readChat(cid, limit = 10) {
    const payload = JSON.stringify([cid, limit, null, 1, [1], [4], null, 1]);
    const raw = await this._batchExec('hNvQHb', payload);
    const body = findWrbResult(raw, 'hNvQHb');
    const turnsData = body?.[0];
    if (!Array.isArray(turnsData)) return [];
    const turns = [];
    for (const turn of turnsData) {
      const rid = turn?.[0]?.[1] || '';
      const userText = turn?.[2]?.[0]?.[0] || '';
      const candidates = turn?.[3]?.[0];
      const modelTexts = [];
      if (Array.isArray(candidates)) {
        for (const cand of candidates) {
          const rcid = cand?.[0] || '';
          const text = cand?.[1]?.[0] || '';
          const status = cand?.[8]?.[0];
          modelTexts.push({ rcid, text, completed: status === 2 });
        }
      }
      turns.push({ rid, userText, modelTexts });
    }
    return turns;
  }

  async deleteChat(cid) {
    await this._batchExec('GzXR5e', JSON.stringify([cid]));
    await this._batchExec('qWymEb', JSON.stringify([cid, [1, null, 0, 1]]));
    return true;
  }

  async renameChat(cid, title) {
    await this._batchExec('MUAZcd', JSON.stringify([cid, title]));
    return true;
  }

  async generateChatTitle(cid) {
    const raw = await this._batchExec('ukz1Fe', JSON.stringify([cid]));
    const body = findWrbResult(raw, 'ukz1Fe');
    return body?.[0] || '';
  }

  async downloadFile(url, destPath = null) {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (destPath) {
      fs.writeFileSync(destPath, buffer);
      return destPath;
    }
    return buffer;
  }

  async listGems({ includeHidden = false } = {}) {
    const lang = 'en';
    const r1 = await this._batchExec('CNgdBe', includeHidden ? `[4,['${lang}'],0]` : `[3,['${lang}'],0]`);
    const r2 = await this._batchExec('CNgdBe', `[2,['${lang}'],0]`);
    const predefined = findWrbResult(r1, 'CNgdBe');
    const custom = findWrbResult(r2, 'CNgdBe');
    const gems = [];
    const pList = predefined?.[2];
    if (Array.isArray(pList)) {
      for (const g of pList) {
        if (g?.[0]) gems.push({ id: g[0], name: g[1]?.[0] || '', description: g[1]?.[1] || '', prompt: g[2]?.[0] || null, predefined: true });
      }
    }
    const cList = custom?.[2];
    if (Array.isArray(cList)) {
      for (const g of cList) {
        if (g?.[0]) gems.push({ id: g[0], name: g[1]?.[0] || '', description: g[1]?.[1] || '', prompt: g[2]?.[0] || null, predefined: false });
      }
    }
    return gems;
  }

  async createGem({ name, prompt, description = '' }) {
    const payload = JSON.stringify([[name, description, prompt, null, null, null, null, null, 0, null, 1, null, null, null, []]]);
    const raw = await this._batchExec('oMH3Zd', payload);
    const body = findWrbResult(raw, 'oMH3Zd');
    const id = body?.[0];
    if (!id) throw new Error('Failed to create gem');
    return { id, name, description, prompt, predefined: false };
  }

  async updateGem({ gem, name, prompt, description = '' }) {
    const id = typeof gem === 'object' ? gem.id : gem;
    const payload = JSON.stringify([id, [name, description, prompt, null, null, null, null, null, 0, null, 1, null, null, null, [], 0]]);
    await this._batchExec('kHv0Vd', payload);
    return { id, name, description, prompt, predefined: false };
  }

  async deleteGem(gem) {
    const id = typeof gem === 'object' ? gem.id : gem;
    await this._batchExec('UXcSJb', JSON.stringify([id]));
    return true;
  }

  async listMemories() {
    const raw = await this._batchExec('ZKcapf', '[]');
    const body = findWrbResult(raw, 'ZKcapf');
    const list = body?.[0];
    if (!Array.isArray(list)) return [];
    return list.map(m => ({
      id: m?.[0] || '',
      text: m?.[1]?.[0]?.[0] || '',
      createdAt: m?.[1]?.[0]?.[1] || null,
    })).filter(m => m.id);
  }

  async createMemory(text) {
    const raw = await this._batchExec('xVRQX', JSON.stringify([text, []]));
    const body = findWrbResult(raw, 'xVRQX');
    return { id: body?.[0] || '', text };
  }

  async updateMemory(memoryId, text) {
    await this._batchExec('gSnMcd', JSON.stringify([memoryId, text]));
    return { id: memoryId, text };
  }

  async deleteMemory(memoryId) {
    await this._batchExec('Ok9j9b', JSON.stringify([memoryId]));
    return true;
  }

  async deleteAllMemories() {
    await this._batchExec('YgU2Cc', '[]');
    return true;
  }

  async getAccountStatus() {
    const raw = await this._batchExec('otAQ7b', '[]');
    const body = findWrbResult(raw, 'otAQ7b');
    if (!body) return { statusCode: null, models: [], tiers: [], caps: [] };
    const statusCode = body[14];
    const models = Array.isArray(body[15])
      ? body[15].map(m => ({ id: m?.[0] || '', name: m?.[1] || '', description: m?.[2] || '' })).filter(m => m.id)
      : [];
    const tierFlags = Array.isArray(body[16]) ? body[16] : [];
    const capFlags = Array.isArray(body[17]) ? body[17] : [];
    return { statusCode, models, tierFlags, capFlags };
  }

  async getUsageInfo() {
    const raw = await this._batchExec('jSf9Qc', '[]', '/usage');
    const body = findWrbResult(raw, 'jSf9Qc');
    if (!body) return null;
    const tierLabels = { 1: 'FREE', 2: 'PRO', 3: 'ULTRA', 4: 'PLUS', 6: 'ULTRA' };
    return {
      tier: { id: body[0], label: tierLabels[body[0]] || null },
      items: Array.isArray(body[1]) ? body[1].map(i => ({
        remaining: i?.[0],
        usageLevel: i?.[1],
        metricType: i?.[2],
        resetAt: i?.[3]?.[0]?.[0],
      })) : [],
      useOverage: body[2],
    };
  }

  async getSettings() {
    const payload = '[[["adaptive_device_responses_enabled","advanced_mode_theme_override_triggered","bard_activity_enabled","bard_sticky_mode_disabled_count","enable_memory","enable_memory_extraction","enable_personal_context","enable_personal_context_gemini","enable_personal_context_gemini_using_photos","enable_personal_context_gemini_using_workspace","enable_personal_context_search","enable_personal_context_youtube","enable_token_streaming","enforce_default_to_fast_version","has_accepted_agent_mode_fre_disclaimer","has_received_streaming_response","last_selected_mode_id_on_web","show_debug_info","web_and_app_activity_enabled"]]]';
    const raw = await this._batchExec('ESY5D', payload);
    const body = findWrbResult(raw, 'ESY5D');
    if (!body) return {};
    const settings = {};
    const keys = JSON.parse(payload)[0][0];
    for (let i = 0; i < keys.length; i++) {
      const val = body[i];
      if (typeof val === 'number') settings[keys[i]] = val;
      else if (typeof val === 'string') settings[keys[i]] = val;
      else if (typeof val === 'boolean') settings[keys[i]] = val;
    }
    return settings;
  }

  async getDeepResearchCaps() {
    const raw = await this._batchExec('aPya6c', '[]');
    const body = findWrbResult(raw, 'aPya6c');
    return body || null;
  }

  async deepResearchBootstrap() {
    const raw = await this._batchExec('ku4Jyf', '["en",null,null,null,4,null,null,[2,4,7,15],null,[[5]]]');
    const body = findWrbResult(raw, 'ku4Jyf');
    return body || null;
  }

  async checkQuota(type = 'flash') {
    const payload = type === 'advanced'
      ? '[[[1,4],[6,6],[1,15]]]'
      : '[[[1,11],[2,11],[6,11]]]';
    const raw = await this._batchExec('qpEbW', payload);
    const body = findWrbResult(raw, 'qpEbW');
    if (!body) return null;
    const items = body[0];
    if (!Array.isArray(items)) return null;
    return items.map(item => ({
      actionId: item?.[0]?.[1],
      usageLevel: item?.[2],
      resetTime: item?.[3]?.[0],
      total: item?.[4],
      remaining: item?.[5],
    }));
  }

  async getFullSizeImage(cid, rid, rcid, imageId) {
    const payload = JSON.stringify([
      [[null, null, null, [null, null, null, null, null, '']], [imageId, 0], null, [19, ''], null, null, null, null, null, ''],
      [rid, rcid, cid, null, ''],
      1, 0, 1,
    ]);
    const raw = await this._batchExec('c8o8Fe', payload);
    const body = findWrbResult(raw, 'c8o8Fe');
    return body?.[0] || null;
  }
}

export default GeminiClient;
