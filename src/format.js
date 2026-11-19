/**
 * Telegram HTML formatting and safe chunk-splitting pipeline.
 * Formats Markdown into Telegram-compatible HTML without entity parse crashes.
 */

/**
 * Escapes characters that have special meaning in HTML.
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Converts standard Markdown to Telegram Bot API compatible HTML.
 * Telegram supports: <b>, <strong>, <i>, <em>, <u>, <ins>, <s>, <strike>, <del>,
 * <tg-spoiler>, <a>, <code>, <pre>, <blockquote>, <tg-emoji>.
 *
 * @param {string} markdown
 * @returns {string}
 */
export function markdownToTelegramHtml(markdown) {
  if (!markdown) return '';

  const codeBlocks = [];
  let placeholderIndex = 0;

  // 1. Extract fenced code blocks first so inner characters are never parsed as markdown
  let text = markdown.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const key = `@@TG_CODE_BLOCK_${placeholderIndex++}@@`;
    const escapedCode = escapeHtml(code.replace(/\r\n/g, '\n').trimEnd());
    const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : '';
    codeBlocks.push({
      key,
      html: `<pre><code${langAttr}>${escapedCode}</code></pre>`,
    });
    return key;
  });

  // 2. Extract inline code spans
  const inlineCodes = [];
  text = text.replace(/`([^`\n]+)`/g, (match, code) => {
    const key = `@@TG_INLINE_CODE_${placeholderIndex++}@@`;
    inlineCodes.push({
      key,
      html: `<code>${escapeHtml(code)}</code>`,
    });
    return key;
  });

  // 3. Escape HTML entities in general text
  text = escapeHtml(text);

  // 4. Transform blockquotes (lines starting with &gt; )
  text = text.replace(/(?:^|\n)(&gt;\s?[^\n]+(?:\n&gt;\s?[^\n]+)*)/g, (match, quoteBlock) => {
    const cleanLines = quoteBlock
      .split('\n')
      .map(line => line.replace(/^&gt;\s?/, ''))
      .join('\n');
    return `\n<blockquote>${cleanLines}</blockquote>\n`;
  });

  // 5. Links: [text](url) -> <a href="url">text</a>
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');

  // 6. Bold: **text** or __text__
  text = text.replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>');
  text = text.replace(/(^|[^\w])__([\s\S]+?)__([^\w]|$)/g, '$1<b>$2</b>$3');

  // 7. Italic: *text* or _text_
  text = text.replace(/(^|[^\w*])\*([^*\n]+?)\*([^\w*]|$)/g, '$1<i>$2</i>$3');
  text = text.replace(/(^|[^\w])_([^_\n]+?)_([^\w]|$)/g, '$1<i>$2</i>$3');

  // 8. Strikethrough: ~~text~~
  text = text.replace(/~~([\s\S]+?)~~/g, '<s>$1</s>');

  // 9. Re-insert inline code spans
  for (const item of inlineCodes) {
    text = text.replace(item.key, item.html);
  }

  // 10. Re-insert fenced code blocks
  for (const item of codeBlocks) {
    text = text.replace(item.key, item.html);
  }

  return text.trim();
}

/**
 * Splits HTML content into chunks of at most `maxChunk` length, ensuring tags
 * are balanced across chunk boundaries and entities are not split.
 *
 * @param {string} html
 * @param {number} maxChunk Default 3800 (safely under Telegram 4096 limit)
 * @returns {string[]}
 */
export function splitTelegramHtml(html, maxChunk = 3800) {
  if (!html || html.length <= maxChunk) {
    return [html || ''];
  }

  const chunks = [];
  let remaining = html;
  let activeTagStack = [];

  while (remaining.length > 0) {
    if (remaining.length <= maxChunk) {
      chunks.push(remaining);
      break;
    }

    let splitIndex = maxChunk;

    const lastOpenBracket = remaining.lastIndexOf('<', splitIndex);
    const lastCloseBracket = remaining.lastIndexOf('>', splitIndex);
    if (lastOpenBracket > lastCloseBracket) {
      splitIndex = lastOpenBracket;
    }

    const lastAmp = remaining.lastIndexOf('&', splitIndex);
    const lastSemicolon = remaining.lastIndexOf(';', splitIndex);
    if (lastAmp > lastSemicolon && splitIndex - lastAmp < 10) {
      splitIndex = lastAmp;
    }

    const sub = remaining.slice(0, splitIndex);
    const doubleNewline = sub.lastIndexOf('\n\n');
    const singleNewline = sub.lastIndexOf('\n');
    const space = sub.lastIndexOf(' ');

    if (doubleNewline > splitIndex * 0.5) {
      splitIndex = doubleNewline + 2;
    } else if (singleNewline > splitIndex * 0.7) {
      splitIndex = singleNewline + 1;
    } else if (space > splitIndex * 0.8) {
      splitIndex = space + 1;
    }

    let chunkContent = remaining.slice(0, splitIndex);
    remaining = remaining.slice(splitIndex);

    const tagRegex = /<\/?([a-zA-Z0-9_-]+)(?:\s+[^>]*?)?>/g;
    let match;
    const currentStack = [...activeTagStack];

    while ((match = tagRegex.exec(chunkContent)) !== null) {
      const fullTag = match[0];
      const isClosing = fullTag.startsWith('</');
      const tagName = match[1].toLowerCase();

      if (isClosing) {
        const lastIdx = currentStack.findLastIndex(t => t.name === tagName);
        if (lastIdx !== -1) {
          currentStack.splice(lastIdx, 1);
        }
      } else {
        currentStack.push({
          name: tagName,
          fullTag,
        });
      }
    }

    let closedChunk = chunkContent;
    for (let i = currentStack.length - 1; i >= 0; i--) {
      closedChunk += `</${currentStack[i].name}>`;
    }
    chunks.push(closedChunk);

    let reopens = '';
    for (let i = 0; i < currentStack.length; i++) {
      reopens += currentStack[i].fullTag;
    }
    remaining = reopens + remaining;
    activeTagStack = [];
  }

  return chunks.filter(c => c.length > 0);
}
